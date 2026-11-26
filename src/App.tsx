import { useState } from 'react'
import { useLayout, type PanelId } from './layout/layoutStore'
import { SplitGroup, type SplitItem } from './layout/SplitGroup'
import { PanelFrame } from './components/PanelFrame'
import { EditorPane } from './components/EditorPane'
import { Explorer } from './components/Explorer'
import { TerminalPane } from './components/TerminalPane'
import { TeacherPane } from './components/TeacherPane'
import { PreviewPane, PreviewToolbar, usePreviewDevice } from './components/PreviewPane'
import { useProject } from './project/useProject'

const PANEL_LABELS: Record<PanelId, string> = {
  left: 'Editor',
  center: 'Professora',
  right: 'Preview',
}

const SAVE_LABEL = { saved: 'Salvo', dirty: 'Alterações pendentes…', saving: 'Salvando…' } as const

export default function App() {
  const { layout, toggleHidden, toggleMaximize, setWeights, setVertical, reset } = useLayout()
  const [device, setDevice] = usePreviewDevice()
  const project = useProject()
  const [explorerWeights, setExplorerWeights] = useState<Record<string, number>>({ explorer: 0.24, editor: 0.76 })
  const [explorerVisible, setExplorerVisible] = useState(true)

  const frameProps = (id: PanelId) => ({
    maximized: layout.maximized === id,
    onMaximize: () => toggleMaximize(id),
    onHide: () => toggleHidden(id),
  })

  // Área do editor: explorador de arquivos | editor com abas (divisória arrastável entre eles).
  const editorItems: SplitItem[] = [
    ...(explorerVisible ? [{ id: 'explorer', minPx: 130, content: <Explorer p={project} /> } as SplitItem] : []),
    { id: 'editor', minPx: 200, content: <EditorPane p={project} /> },
  ]
  const editorArea = (
    <SplitGroup direction="row" items={editorItems} weights={explorerWeights} onChange={setExplorerWeights} />
  )

  // Painel esquerdo: editor (cima) + terminal (baixo), com divisória própria.
  const leftItems: SplitItem[] = [
    { id: 'editor', minPx: 120, content: editorArea },
    ...(layout.hidden.terminal
      ? []
      : [{ id: 'terminal', minPx: 80, content: <TerminalPane /> } as SplitItem]),
  ]

  const left = (
    <PanelFrame
      title="Editor e terminal"
      {...frameProps('left')}
      actions={
        <>
          <button className="icon-btn" onClick={() => setExplorerVisible((v) => !v)} title="Mostrar/ocultar explorador de arquivos">
            ☰
          </button>
          <button className="icon-btn" onClick={() => toggleHidden('terminal')} title="Mostrar/ocultar terminal">
            ⌨
          </button>
        </>
      }
    >
      <SplitGroup
        direction="column"
        items={leftItems}
        weights={layout.vertical}
        onChange={(w) => setVertical({ editor: w.editor ?? layout.vertical.editor, terminal: w.terminal ?? layout.vertical.terminal })}
      />
    </PanelFrame>
  )

  const center = (
    <PanelFrame title="Professora" {...frameProps('center')}>
      <TeacherPane />
    </PanelFrame>
  )

  const right = (
    <PanelFrame
      title="Preview"
      {...frameProps('right')}
      actions={<PreviewToolbar device={device} setDevice={setDevice} />}
    >
      <PreviewPane device={device} />
    </PanelFrame>
  )

  const content: Record<PanelId, React.ReactNode> = { left, center, right }
  const order: PanelId[] = ['left', 'center', 'right']
  const minPx: Record<PanelId, number> = { left: 280, center: 240, right: 240 }

  const visible = layout.maximized
    ? [layout.maximized]
    : order.filter((id) => !layout.hidden[id])

  const items: SplitItem[] = visible.map((id) => ({ id, minPx: minPx[id], content: content[id] }))

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">CodeMentor Studio</span>
        <span className="topbar-item">Projeto: {project.projectName ?? 'nenhum aberto'}</span>
        {project.projectName && (
          <span className={`topbar-item ${project.saveState === 'saved' ? 'muted' : ''}`}>{SAVE_LABEL[project.saveState]}</span>
        )}
        <span className="topbar-item muted">Servidor: parado</span>
        <span className="topbar-item muted">IA: não configurada</span>
        <button className="btn" onClick={project.openProject}>Abrir projeto</button>
        <button className="btn" onClick={project.createProject}>Novo projeto</button>
        <span className="spacer" />
        <span className="segmented">
          {order.map((id) => (
            <button
              key={id}
              className={layout.hidden[id] ? '' : 'on'}
              onClick={() => toggleHidden(id)}
              title={layout.hidden[id] ? `Mostrar ${PANEL_LABELS[id]}` : `Ocultar ${PANEL_LABELS[id]}`}
            >
              {PANEL_LABELS[id]}
            </button>
          ))}
        </span>
        <button className="btn" onClick={reset} title="Restaurar o layout padrão">
          Restaurar layout
        </button>
      </header>
      {project.error && (
        <div className="error-bar" role="alert">
          <span>{project.error}</span>
          <button className="icon-btn" onClick={project.clearError} title="Fechar aviso">✕</button>
        </div>
      )}
      <main className="workspace">
        <SplitGroup
          direction="row"
          items={items}
          weights={layout.weights}
          onChange={(w) => setWeights({ ...layout.weights, ...w })}
        />
      </main>
    </div>
  )
}
