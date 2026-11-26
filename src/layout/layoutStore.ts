import { useCallback, useEffect, useState } from 'react'

export type PanelId = 'left' | 'center' | 'right'

export interface LayoutState {
  /** Pesos relativos dos três painéis principais. */
  weights: Record<PanelId, number>
  /** Pesos verticais do painel esquerdo. */
  vertical: { editor: number; terminal: number }
  hidden: Record<PanelId | 'terminal', boolean>
  maximized: PanelId | null
}

export const DEFAULT_LAYOUT: LayoutState = {
  weights: { left: 0.42, center: 0.28, right: 0.3 },
  vertical: { editor: 0.7, terminal: 0.3 },
  hidden: { left: false, center: false, right: false, terminal: false },
  maximized: null,
}

// Etapa 1: persistência via localStorage do renderer.
// Etapa 8 migra isto para um arquivo de configurações gerenciado pelo processo principal.
const KEY = 'codementor.layout.v1'

function load(): LayoutState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_LAYOUT
    const p = JSON.parse(raw) as Partial<LayoutState>
    return {
      weights: { ...DEFAULT_LAYOUT.weights, ...p.weights },
      vertical: { ...DEFAULT_LAYOUT.vertical, ...p.vertical },
      hidden: { ...DEFAULT_LAYOUT.hidden, ...p.hidden },
      maximized: p.maximized ?? null,
    }
  } catch {
    return DEFAULT_LAYOUT
  }
}

export function useLayout() {
  const [layout, setLayout] = useState<LayoutState>(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(layout))
    } catch {
      /* armazenamento indisponível: o layout apenas não persiste */
    }
  }, [layout])

  const toggleHidden = useCallback((id: PanelId | 'terminal') => {
    setLayout((l) => {
      const hidden = { ...l.hidden, [id]: !l.hidden[id] }
      // Nunca deixar a tela sem nenhum painel principal.
      const visibleMain = (['left', 'center', 'right'] as PanelId[]).filter((p) => !hidden[p])
      if (id !== 'terminal' && visibleMain.length === 0) return l
      return { ...l, hidden, maximized: l.maximized === id ? null : l.maximized }
    })
  }, [])

  const toggleMaximize = useCallback((id: PanelId) => {
    setLayout((l) => ({
      ...l,
      maximized: l.maximized === id ? null : id,
      hidden: { ...l.hidden, [id]: false },
    }))
  }, [])

  const setWeights = useCallback((w: Record<PanelId, number>) => {
    setLayout((l) => ({ ...l, weights: w }))
  }, [])

  const setVertical = useCallback((v: { editor: number; terminal: number }) => {
    setLayout((l) => ({ ...l, vertical: v }))
  }, [])

  const reset = useCallback(() => setLayout(DEFAULT_LAYOUT), [])

  return { layout, toggleHidden, toggleMaximize, setWeights, setVertical, reset }
}
