import { useEffect, useRef, useState } from 'react'
import type { PreviewError, PreviewStatus } from '../preview/usePreview'

export type Device = 'desktop' | 'tablet' | 'mobile'
const WIDTHS: Record<Device, string> = { desktop: '100%', tablet: '768px', mobile: '375px' }
const LABELS: Record<Device, string> = { desktop: 'Desktop', tablet: 'Tablet', mobile: 'Mobile' }

export function usePreviewDevice() {
  return useState<Device>('desktop')
}

export function PreviewToolbar({
  device, setDevice, canUse, onReload, onExternal,
}: { device: Device; setDevice: (d: Device) => void; canUse: boolean; onReload: () => void; onExternal: () => void }) {
  return (
    <>
      <span className="segmented">
        {(Object.keys(WIDTHS) as Device[]).map((d) => (
          <button key={d} className={d === device ? 'on' : ''} onClick={() => setDevice(d)}>
            {LABELS[d]}
          </button>
        ))}
      </span>
      <button className="icon-btn" disabled={!canUse} onClick={onReload} title="Recarregar página">⟳</button>
      <button className="icon-btn" disabled={!canUse} onClick={onExternal} title="Abrir no navegador">↗</button>
    </>
  )
}

interface Props {
  device: Device
  status: PreviewStatus
  url: string | null
  serverError: string | null
  /** Arquivo .html a exibir (relativo à raiz do projeto); padrão: index.html */
  htmlPath: string | null
  reloadKey: number
  hasProject: boolean
}

export function PreviewPane({ device, status, url, serverError, htmlPath, reloadKey, hasProject }: Props) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [errors, setErrors] = useState<PreviewError[]>([])

  const src = url ? `${url}/${htmlPath && htmlPath !== 'index.html' ? encodeURI(htmlPath) : ''}` : null

  // Erros vindos da página do usuário (ponte injetada pelo servidor de preview).
  useEffect(() => {
    const onMsg = (ev: MessageEvent) => {
      if (ev.source !== frame.current?.contentWindow) return // só aceita o nosso iframe
      const d = ev.data as { source?: string; type?: string; message?: string; file?: string; line?: number } | null
      if (!d || d.source !== 'codementor-preview') return
      if (d.type === 'loaded') return setErrors([]) // nova carga da página limpa os erros antigos
      if (d.type === 'error' && typeof d.message === 'string') {
        const where = d.file ? `${d.file.split('/').pop()}${d.line ? `:${d.line}` : ''}` : undefined
        setErrors((e) => (e.length >= 50 ? e : [...e, { message: d.message!.slice(0, 500), where }]))
      }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  useEffect(() => setErrors([]), [src, reloadKey])

  if (!hasProject) return <div className="placeholder"><strong>Preview</strong><p>Abra ou crie um projeto para ver o site aqui.</p></div>
  if (status === 'starting') return <div className="placeholder"><strong>Preview</strong><p>Iniciando o servidor…</p></div>
  if (status === 'error' || !src)
    return <div className="placeholder"><strong>Preview indisponível</strong><p>{serverError ?? 'O servidor de preview não está rodando.'}</p></div>

  return (
    <div className="preview-wrap">
      <div className="preview">
        <iframe
          key={reloadKey}
          ref={frame}
          title="Preview do site"
          className="preview-frame"
          style={{ width: WIDTHS[device] }}
          // Origem diferente da do app (porta própria): o site do aluno não acessa o app.
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
          src={src}
        />
      </div>
      {errors.length > 0 && (
        <div className="preview-errors" role="log">
          <div className="preview-errors-head">
            <span>{errors.length} {errors.length === 1 ? 'erro' : 'erros'} no navegador</span>
            <button className="icon-btn" onClick={() => setErrors([])} title="Limpar">✕</button>
          </div>
          {errors.map((e, i) => (
            <div key={i} className="preview-error">
              {e.where && <b>{e.where} </b>}
              {e.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
