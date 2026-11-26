import { useState } from 'react'
import type { TreeNode } from '../types'
import type { ProjectApi } from '../project/useProject'

type Editing =
  | { kind: 'newFile' | 'newDir'; parent: string }
  | { kind: 'rename'; path: string }
  | null

function InlineInput({ initial = '', onSubmit, onCancel }: { initial?: string; onSubmit: (v: string) => void; onCancel: () => void }) {
  return (
    <input
      className="inline-input"
      autoFocus
      defaultValue={initial}
      onFocus={(e) => e.currentTarget.select()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.currentTarget.value.trim()) onSubmit(e.currentTarget.value)
        if (e.key === 'Escape') onCancel()
      }}
      onBlur={onCancel}
    />
  )
}

export function Explorer({ p }: { p: ProjectApi }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<{ path: string; type: 'file' | 'dir' } | null>(null)
  const [editing, setEditing] = useState<Editing>(null)

  if (!p.projectName) {
    return (
      <div className="explorer explorer-empty">
        <p>Nenhum projeto aberto.</p>
        <button className="btn" onClick={p.openProject}>Abrir projeto</button>
        <button className="btn" onClick={p.createProject}>Novo projeto</button>
      </div>
    )
  }

  const targetDir = (): string => {
    if (!selected) return ''
    if (selected.type === 'dir') return selected.path
    return selected.path.includes('/') ? selected.path.slice(0, selected.path.lastIndexOf('/')) : ''
  }

  const startNew = (kind: 'newFile' | 'newDir') => {
    const parent = targetDir()
    if (parent) setExpanded((s) => new Set(s).add(parent))
    setEditing({ kind, parent })
  }

  const toggle = (path: string) =>
    setExpanded((s) => {
      const n = new Set(s)
      if (n.has(path)) n.delete(path)
      else n.add(path)
      return n
    })

  const renderNodes = (nodes: TreeNode[], depth: number, parentPath: string) => (
    <>
      {editing && editing.kind !== 'rename' && editing.parent === parentPath && (
        <div className="row" style={{ paddingLeft: 8 + depth * 14 }}>
          <InlineInput
            onCancel={() => setEditing(null)}
            onSubmit={(name) => {
              const kind = editing.kind
              setEditing(null)
              void (kind === 'newFile' ? p.createFile(parentPath, name) : p.createDir(parentPath, name))
            }}
          />
        </div>
      )}
      {nodes.map((n) => {
        const isDir = n.type === 'dir'
        const isOpen = expanded.has(n.path)
        const renaming = editing?.kind === 'rename' && editing.path === n.path
        return (
          <div key={n.path}>
            <div
              className={`row${selected?.path === n.path ? ' selected' : ''}${p.activePath === n.path ? ' active' : ''}`}
              style={{ paddingLeft: 8 + depth * 14 }}
              onClick={() => {
                setSelected({ path: n.path, type: n.type })
                if (isDir) toggle(n.path)
                else void p.openFile(n.path)
              }}
            >
              <span className="row-icon">{isDir ? (isOpen ? '▾' : '▸') : '·'}</span>
              {renaming ? (
                <InlineInput
                  initial={n.name}
                  onCancel={() => setEditing(null)}
                  onSubmit={(name) => {
                    setEditing(null)
                    void p.renamePath(n.path, name)
                  }}
                />
              ) : (
                <span className="row-name">{n.name}</span>
              )}
              {!renaming && (
                <span className="row-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="icon-btn" title="Renomear" onClick={() => setEditing({ kind: 'rename', path: n.path })}>✎</button>
                  <button
                    className="icon-btn"
                    title="Mover para a lixeira"
                    onClick={() => {
                      if (window.confirm(`Mover "${n.name}" para a lixeira?`)) void p.deletePath(n.path)
                    }}
                  >
                    🗑
                  </button>
                </span>
              )}
            </div>
            {isDir && isOpen && n.children && renderNodes(n.children, depth + 1, n.path)}
          </div>
        )
      })}
    </>
  )

  return (
    <div className="explorer">
      <div className="explorer-head">
        <span className="explorer-name" title={p.projectName}>{p.projectName}</span>
        <span>
          <button className="icon-btn" title="Novo arquivo" onClick={() => startNew('newFile')}>＋</button>
          <button className="icon-btn" title="Nova pasta" onClick={() => startNew('newDir')}>📁</button>
          <button className="icon-btn" title="Atualizar" onClick={() => void p.refreshTree()}>⟳</button>
        </span>
      </div>
      <div className="explorer-tree" onClick={() => setSelected(null)}>
        {p.tree.length === 0 && !editing && <p className="muted pad">Pasta vazia.</p>}
        {renderNodes(p.tree, 0, '')}
      </div>
    </div>
  )
}
