import { useLayout, type PanelId } from './layout/layoutStore'
import { SplitGroup, type SplitItem } from './layout/SplitGroup'
import { PanelFrame } from './components/PanelFrame'
import { EditorPane } from './components/EditorPane'
import { TerminalPane } from './components/TerminalPane'
import { TeacherPane } from './components/TeacherPane'
import { PreviewPane, PreviewToolbar, usePreviewDevice } from './components/PreviewPane'

const PANEL_LABELS: Record<PanelId, string> = {
  left: 'Editor',
  center: 'Professora',
  right: 'Preview',
}

export default function App() {
  const { layout, toggleHidden, toggleMaximize, setWeights, setVertical, reset } = useLayout()
  const [device, setDevice] = usePreviewDevice()

  const frameProps = (id: PanelId) => ({
    maximized: layout.maximized === id,
    onMaximize: () => toggleMaximize(id),
    onHide: () => toggleHidden(id),
  })

  // Painel esquerdo: editor (cima) + terminal (baixo), com divisória própria.
  const leftItems: SplitItem[] = [
    { id: 'editor', minPx: 120, content: <EditorPane /> },
    ...(layout.hidden.terminal
      ? []
      : [{ id: 'terminal', minPx: 80, content: <TerminalPane /> } as SplitItem]),
  ]

  const left = (
    <PanelFrame
      title="Editor e terminal"
      {...frameProps('left')}
      actions={
        <button className="icon-btn" onClick={() => toggleHidden('terminal')} title="Mostrar/ocultar terminal">
          ⌨
        </button>
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
        <span className="topbar-item" title="Gerenciamento de projetos: Etapa 2">
          Projeto: nenhum aberto
        </span>
        <span className="topbar-item muted">Salvamento: —</span>
        <span className="topbar-item muted">Servidor: parado</span>
        <span className="topbar-item muted">IA: não configurada</span>
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
