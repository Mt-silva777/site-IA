import { useCallback, useEffect, useRef, useState } from 'react'
import type { TreeNode } from '../types'
import { call } from './api'
import { disposeModel, ensureModel, getModel } from '../editor/models'

export interface Tab {
  path: string
  dirty: boolean
}
export type SaveState = 'saved' | 'dirty' | 'saving'

const AUTOSAVE_MS = 800
const under = (p: string, base: string) => p === base || p.startsWith(base + '/')
const dirname = (p: string) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '')
const join = (dir: string, name: string) => (dir ? `${dir}/${name}` : name)

/**
 * Estado do projeto aberto: árvore, abas e salvamento.
 * O texto dos arquivos vive nos modelos do Monaco (o editor é a fonte do conteúdo);
 * aqui só ficam metadados (aba aberta, "sujo", árvore).
 */
export function useProject() {
  const [projectName, setProjectName] = useState<string | null>(null)
  const [tree, setTree] = useState<TreeNode[]>([])
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activePath, setActivePath] = useState<string | null>(null)
  const [saving, setSaving] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const tabsRef = useRef<Tab[]>([])
  useEffect(() => {
    tabsRef.current = tabs
  }, [tabs])

  const fail = (prefix: string, e: unknown) => setError(`${prefix}${e instanceof Error ? e.message : String(e)}`)

  const refreshTree = useCallback(async () => {
    try {
      setTree(await call((a) => a.project.tree()))
    } catch (e) {
      fail('Não foi possível ler a pasta do projeto: ', e)
    }
  }, [])

  const setDirty = (path: string, dirty: boolean) =>
    setTabs((ts) => ts.map((t) => (t.path === path ? { ...t, dirty } : t)))

  const clearTimer = (path: string) => {
    const t = timers.current.get(path)
    if (t) clearTimeout(t)
    timers.current.delete(path)
  }

  const saveNow = useCallback(async (path: string) => {
    clearTimer(path)
    const model = getModel(path)
    if (!model) return
    const version = model.getVersionId()
    setSaving((n) => n + 1)
    try {
      await call((a) => a.fs.write(path, model.getValue()))
      // Se o usuário digitou durante a gravação, continua "sujo" (o autosave seguinte cuida).
      if (model.getVersionId() === version) setDirty(path, false)
    } catch (e) {
      fail(`Falha ao salvar ${path}: `, e)
    } finally {
      setSaving((n) => n - 1)
    }
  }, [])

  const saveAll = useCallback(async () => {
    await Promise.all(tabsRef.current.filter((t) => t.dirty).map((t) => saveNow(t.path)))
  }, [saveNow])

  // Salva ao perder o foco da janela (rede de segurança além do autosave).
  useEffect(() => {
    const onHide = () => void saveAll()
    window.addEventListener('blur', onHide)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('blur', onHide)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [saveAll])

  const onEdit = useCallback((path: string) => {
    setDirty(path, true)
    clearTimer(path)
    timers.current.set(path, setTimeout(() => void saveNow(path), AUTOSAVE_MS))
  }, [saveNow])

  const closeAllTabs = () => {
    for (const t of tabsRef.current) {
      clearTimer(t.path)
      disposeModel(t.path)
    }
    setTabs([])
    setActivePath(null)
  }

  const enterProject = async (name: string) => {
    await saveAll()
    closeAllTabs()
    setProjectName(name)
    await refreshTree()
  }

  const openOrCreateProject = async (kind: 'open' | 'create') => {
    try {
      const r = await call((a) => (kind === 'open' ? a.project.open() : a.project.create()))
      if (!r.canceled) await enterProject(r.name)
    } catch (e) {
      fail(kind === 'open' ? 'Não foi possível abrir o projeto: ' : 'Não foi possível criar o projeto: ', e)
    }
  }

  const openFile = useCallback(async (path: string) => {
    if (tabsRef.current.some((t) => t.path === path)) {
      setActivePath(path)
      return
    }
    try {
      const f = await call((a) => a.fs.read(path))
      if (f.binary) {
        setError(`"${path}" é um arquivo binário e não pode ser editado aqui.`)
        return
      }
      ensureModel(path, f.content)
      setTabs((ts) => (ts.some((t) => t.path === path) ? ts : [...ts, { path, dirty: false }]))
      setActivePath(path)
    } catch (e) {
      fail(`Não foi possível abrir ${path}: `, e)
    }
  }, [])

  const closeTab = useCallback(async (path: string) => {
    const tab = tabsRef.current.find((t) => t.path === path)
    if (tab?.dirty) await saveNow(path)
    clearTimer(path)
    disposeModel(path)
    const idx = tabsRef.current.findIndex((t) => t.path === path)
    const remaining = tabsRef.current.filter((t) => t.path !== path)
    setTabs(remaining)
    setActivePath((cur) => (cur === path ? (remaining[Math.min(idx, remaining.length - 1)]?.path ?? null) : cur))
  }, [saveNow])

  const createFile = async (parentDir: string, name: string) => {
    const rel = join(parentDir, name.trim())
    try {
      await call((a) => a.fs.createFile(rel))
      await refreshTree()
      await openFile(rel)
    } catch (e) {
      fail('Não foi possível criar o arquivo: ', e)
    }
  }

  const createDir = async (parentDir: string, name: string) => {
    try {
      await call((a) => a.fs.createDir(join(parentDir, name.trim())))
      await refreshTree()
    } catch (e) {
      fail('Não foi possível criar a pasta: ', e)
    }
  }

  const renamePath = async (from: string, newName: string) => {
    const to = join(dirname(from), newName.trim())
    if (to === from) return
    try {
      // Grava o que estiver pendente antes de mover, para não perder edições.
      await Promise.all(tabsRef.current.filter((t) => under(t.path, from) && t.dirty).map((t) => saveNow(t.path)))
      await call((a) => a.fs.rename(from, to))
      const moved = new Map<string, string>()
      for (const t of tabsRef.current) {
        if (!under(t.path, from)) continue
        const newPath = to + t.path.slice(from.length)
        const model = getModel(t.path)
        const text = model?.getValue() ?? ''
        clearTimer(t.path)
        disposeModel(t.path)
        ensureModel(newPath, text)
        moved.set(t.path, newPath)
      }
      setTabs((ts) => ts.map((t) => ({ ...t, path: moved.get(t.path) ?? t.path })))
      setActivePath((cur) => (cur ? (moved.get(cur) ?? cur) : cur))
      await refreshTree()
    } catch (e) {
      fail('Não foi possível renomear: ', e)
    }
  }

  const deletePath = async (path: string) => {
    try {
      await call((a) => a.fs.remove(path)) // vai para a lixeira do sistema (recuperável)
      const gone = tabsRef.current.filter((t) => under(t.path, path))
      for (const t of gone) {
        clearTimer(t.path)
        disposeModel(t.path)
      }
      const remaining = tabsRef.current.filter((t) => !under(t.path, path))
      setTabs(remaining)
      setActivePath((cur) => (cur && under(cur, path) ? (remaining[remaining.length - 1]?.path ?? null) : cur))
      await refreshTree()
    } catch (e) {
      fail('Não foi possível excluir: ', e)
    }
  }

  const saveState: SaveState = saving > 0 ? 'saving' : tabs.some((t) => t.dirty) ? 'dirty' : 'saved'

  return {
    projectName,
    tree,
    tabs,
    activePath,
    saveState,
    error,
    clearError: () => setError(null),
    openProject: () => openOrCreateProject('open'),
    createProject: () => openOrCreateProject('create'),
    refreshTree,
    openFile,
    closeTab,
    activate: setActivePath,
    onEdit,
    saveNow,
    createFile,
    createDir,
    renamePath,
    deletePath,
  }
}

export type ProjectApi = ReturnType<typeof useProject>
