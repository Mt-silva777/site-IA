import { useEffect, useRef, useState } from 'react'
import * as monaco from 'monaco-editor'
import { getModel, languageFor, pathFromUri } from '../editor/models'
import type { ProjectApi } from '../project/useProject'

const base = (p: string) => p.slice(p.lastIndexOf('/') + 1)

export function EditorPane({ p }: { p: ProjectApi }) {
  const host = useRef<HTMLDivElement>(null)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const viewStates = useRef(new Map<string, monaco.editor.ICodeEditorViewState | null>())
  const prevPath = useRef<string | null>(null)
  const [counts, setCounts] = useState({ errors: 0, warnings: 0 })

  // Callbacks sempre atuais, sem recriar o editor.
  const onEditRef = useRef(p.onEdit)
  const onSaveRef = useRef(p.saveNow)
  const activeRef = useRef(p.activePath)
  useEffect(() => {
    onEditRef.current = p.onEdit
    onSaveRef.current = p.saveNow
    activeRef.current = p.activePath
  })

  useEffect(() => {
    if (!host.current) return
    const editor = monaco.editor.create(host.current, {
      model: null,
      theme: 'vs-dark',
      automaticLayout: true, // acompanha o redimensionamento dos painéis
      minimap: { enabled: false },
      fontSize: 14,
      tabSize: 2,
      scrollBeyondLastLine: false,
      padding: { top: 8 },
    })
    editorRef.current = editor

    const edit = editor.onDidChangeModelContent(() => {
      const m = editor.getModel()
      if (m) onEditRef.current(pathFromUri(m.uri))
    })
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (activeRef.current) void onSaveRef.current(activeRef.current)
    })
    const updateCounts = () => {
      const m = editor.getModel()
      if (!m) return setCounts({ errors: 0, warnings: 0 })
      const marks = monaco.editor.getModelMarkers({ resource: m.uri })
      setCounts({
        errors: marks.filter((k) => k.severity === monaco.MarkerSeverity.Error).length,
        warnings: marks.filter((k) => k.severity === monaco.MarkerSeverity.Warning).length,
      })
    }
    const markers = monaco.editor.onDidChangeMarkers(updateCounts)
    const modelSwitch = editor.onDidChangeModel(updateCounts)

    return () => {
      edit.dispose()
      markers.dispose()
      modelSwitch.dispose()
      editor.dispose()
      editorRef.current = null
    }
  }, [])

  // Troca de arquivo: guarda a posição do anterior e restaura a do novo.
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    if (prevPath.current && prevPath.current !== p.activePath) {
      viewStates.current.set(prevPath.current, editor.saveViewState())
    }
    const model = p.activePath ? getModel(p.activePath) : null
    editor.setModel(model)
    if (p.activePath && model) {
      const vs = viewStates.current.get(p.activePath)
      if (vs) editor.restoreViewState(vs)
      editor.focus()
    }
    prevPath.current = p.activePath
  }, [p.activePath])

  // Esquece o estado de visualização de abas fechadas.
  useEffect(() => {
    const open = new Set(p.tabs.map((t) => t.path))
    for (const k of viewStates.current.keys()) if (!open.has(k)) viewStates.current.delete(k)
  }, [p.tabs])

  return (
    <div className="editor-pane">
      <div className="tabs">
        {p.tabs.map((t) => (
          <div
            key={t.path}
            className={`tab${t.path === p.activePath ? ' active' : ''}`}
            title={t.path}
            onClick={() => p.activate(t.path)}
            onAuxClick={(e) => e.button === 1 && void p.closeTab(t.path)}
          >
            <span>{base(t.path)}</span>
            {t.dirty && <span className="dirty-dot" title="Alterações ainda não salvas">●</span>}
            <button
              className="icon-btn tab-close"
              title="Fechar"
              onClick={(e) => {
                e.stopPropagation()
                void p.closeTab(t.path)
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="editor-stage">
        <div ref={host} className="editor-host" />
        {!p.activePath && (
          <div className="editor-empty">
            {p.projectName ? 'Selecione um arquivo no explorador para editar.' : 'Abra ou crie um projeto para começar.'}
          </div>
        )}
      </div>
      <div className="editor-footer">
        <span>{p.activePath ? languageFor(p.activePath) : '—'}</span>
        <span className={counts.errors ? 'err' : 'muted'}>● {counts.errors} {counts.errors === 1 ? 'erro' : 'erros'}</span>
        <span className={counts.warnings ? 'warn' : 'muted'}>▲ {counts.warnings} {counts.warnings === 1 ? 'aviso' : 'avisos'}</span>
        <span className="spacer" />
        <span className="muted">Ctrl+S salva · salvamento automático ativo</span>
      </div>
    </div>
  )
}
