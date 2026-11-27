import { useCallback, useEffect, useState } from 'react'
import { call } from '../project/api'

export interface PreviewError {
  message: string
  where?: string
}
export type PreviewStatus = 'idle' | 'starting' | 'running' | 'error'

/** Mantém um servidor Vite de preview para o projeto aberto (reinicia ao trocar de projeto). */
export function usePreview(projectName: string | null) {
  const [status, setStatus] = useState<PreviewStatus>('idle')
  const [url, setUrl] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setUrl(null)
    setServerError(null)
    if (!projectName) {
      setStatus('idle')
      void call((a) => a.preview.stop()).catch(() => undefined)
      return
    }
    setStatus('starting')
    call((a) => a.preview.start())
      .then((r) => {
        if (cancelled) return
        setUrl(r.url)
        setStatus('running')
      })
      .catch((e) => {
        if (cancelled) return
        setServerError(e instanceof Error ? e.message : String(e))
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [projectName])

  const openExternal = useCallback((target: string) => {
    void call((a) => a.preview.openExternal(target)).catch(() => undefined)
  }, [])

  return { status, url, serverError, openExternal }
}
