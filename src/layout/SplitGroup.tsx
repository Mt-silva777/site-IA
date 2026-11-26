import { Fragment, useRef, type ReactNode } from 'react'

export interface SplitItem {
  id: string
  content: ReactNode
  /** Tamanho mínimo de usabilidade, em pixels. */
  minPx: number
}

interface Props {
  direction: 'row' | 'column'
  items: SplitItem[]
  /** Pesos por id (não precisam somar 1; só os itens visíveis são normalizados). */
  weights: Record<string, number>
  onChange: (next: Record<string, number>) => void
}

/** Grupo de painéis com divisórias arrastáveis. Sem dependências externas. */
export function SplitGroup({ direction, items, weights, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const isRow = direction === 'row'

  const total = items.reduce((s, i) => s + (weights[i.id] ?? 1), 0) || 1
  const fractions = items.map((i) => (weights[i.id] ?? 1) / total)

  function startDrag(index: number, e: React.PointerEvent<HTMLDivElement>) {
    const container = ref.current
    if (!container) return
    e.preventDefault()
    const handle = e.currentTarget
    handle.setPointerCapture(e.pointerId)

    const rect = container.getBoundingClientRect()
    const size = isRow ? rect.width : rect.height
    const startPos = isRow ? e.clientX : e.clientY
    const start = [...fractions]
    const minA = items[index].minPx / size
    const minB = items[index + 1].minPx / size
    const pair = start[index] + start[index + 1]

    const move = (ev: PointerEvent) => {
      const delta = ((isRow ? ev.clientX : ev.clientY) - startPos) / size
      let a = start[index] + delta
      a = Math.max(minA, Math.min(pair - minB, a))
      const next = [...start]
      next[index] = a
      next[index + 1] = pair - a
      const out: Record<string, number> = { ...weights }
      items.forEach((it, i) => (out[it.id] = next[i]))
      onChange(out)
    }
    const end = () => {
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', end)
      handle.removeEventListener('pointercancel', end)
    }
    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', end)
    handle.addEventListener('pointercancel', end)
  }

  return (
    <div ref={ref} className={`split split-${direction}`}>
      {items.map((item, i) => (
        <Fragment key={item.id}>
          <div
            className="split-item"
            style={{ flex: `${fractions[i]} 1 0`, minWidth: isRow ? item.minPx : 0, minHeight: isRow ? 0 : item.minPx }}
          >
            {item.content}
          </div>
          {i < items.length - 1 && (
            <div
              className={`splitter splitter-${direction}`}
              role="separator"
              aria-orientation={isRow ? 'vertical' : 'horizontal'}
              onPointerDown={(e) => startDrag(i, e)}
            />
          )}
        </Fragment>
      ))}
    </div>
  )
}
