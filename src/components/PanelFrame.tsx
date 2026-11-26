import type { ReactNode } from 'react'

interface Props {
  title: string
  actions?: ReactNode
  maximized?: boolean
  onMaximize?: () => void
  onHide?: () => void
  children: ReactNode
}

export function PanelFrame({ title, actions, maximized, onMaximize, onHide, children }: Props) {
  return (
    <section className="panel">
      <header className="panel-header">
        <span className="panel-title">{title}</span>
        <span className="panel-actions">
          {actions}
          {onMaximize && (
            <button className="icon-btn" onClick={onMaximize} title={maximized ? 'Restaurar' : 'Maximizar'}>
              {maximized ? '❐' : '□'}
            </button>
          )}
          {onHide && (
            <button className="icon-btn" onClick={onHide} title="Ocultar painel">
              ✕
            </button>
          )}
        </span>
      </header>
      <div className="panel-body">{children}</div>
    </section>
  )
}
