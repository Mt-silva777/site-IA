import { useState } from 'react'

type Device = 'desktop' | 'tablet' | 'mobile'
const WIDTHS: Record<Device, string> = { desktop: '100%', tablet: '768px', mobile: '375px' }
const LABELS: Record<Device, string> = { desktop: 'Desktop', tablet: 'Tablet', mobile: 'Mobile' }

const EMPTY_DOC = `<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;color:#555;display:grid;place-items:center;height:100vh;margin:0"><p>O preview real (Vite + HMR) chega na Etapa 3.</p></body>`

export function PreviewToolbar({ device, setDevice }: { device: Device; setDevice: (d: Device) => void }) {
  return (
    <span className="segmented">
      {(Object.keys(WIDTHS) as Device[]).map((d) => (
        <button key={d} className={d === device ? 'on' : ''} onClick={() => setDevice(d)}>
          {LABELS[d]}
        </button>
      ))}
    </span>
  )
}

export function usePreviewDevice() {
  return useState<Device>('desktop')
}

export function PreviewPane({ device }: { device: Device }) {
  return (
    <div className="preview">
      <iframe
        title="Preview do site"
        className="preview-frame"
        style={{ width: WIDTHS[device] }}
        sandbox="allow-scripts allow-forms allow-modals"
        srcDoc={EMPTY_DOC}
      />
    </div>
  )
}
