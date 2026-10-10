import { useReducedMotion } from '../../hooks/useReducedMotion'
import { alpha, C, NODE_STYLE, ring } from '../../sim/colors'
import type { NodeState, TreeNode } from '../../sim/types'
import { layoutTree, withDerivedOrder } from './layout'

export interface ComponentTreeProps {
  nodes: readonly TreeNode[]
  /** Column width; default 104 (76 compact). */
  colWidth?: number
  compact?: boolean
  /** Numbered render-order badges. Defaults to on in reduced motion. */
  showOrder?: boolean
  /** Makes nodes buttons (e.g. ch4: click to set state there). */
  onNodeClick?: (id: string) => void
  /** Accessible name for the tree. */
  label?: string
  className?: string
}

/** Delay per depth level for the re-render wave. */
const WAVE_MS = 120

/**
 * Component-tree diagram (README "ComponentTree", design/Tree.dc.html). State changes travel
 * down as a wave, 120ms per depth level (instant in reduced motion, with order badges).
 */
export function ComponentTree({
  nodes,
  colWidth,
  compact,
  showOrder,
  onNodeClick,
  label = 'Component tree',
  className = '',
}: ComponentTreeProps) {
  const reduced = useReducedMotion()
  const orderOn = showOrder ?? reduced
  const L = layoutTree(orderOn ? withDerivedOrder(nodes) : nodes, { colWidth, compact })

  return (
    <div className={`flex w-full overflow-x-auto py-1.5 ${className}`}>
      <div
        role="group"
        aria-label={label}
        className="relative mx-auto flex-none"
        style={{ width: L.width, height: L.height }}
      >
        <svg width={L.width} height={L.height} className="absolute top-0 left-0 overflow-visible" aria-hidden>
          {L.edges.map((e) => {
            const s = NODE_STYLE[e.state]
            const depth = L.nodes.find((p) => p.node.id === e.id)?.depth ?? 0
            return (
              <path
                key={e.id}
                d={e.d}
                stroke={s.edge}
                strokeWidth={1.5}
                fill="none"
                strokeDasharray={s.dashed ? '3 3' : undefined}
                className="transition-[stroke] ease-out"
                style={{ transitionDuration: `${WAVE_MS}ms`, transitionDelay: `${depth * WAVE_MS}ms` }}
              />
            )
          })}
        </svg>
        {L.nodes.map(({ node: n, depth, left, top, width }) => {
          const state: NodeState = n.state ?? 'idle'
          const s = NODE_STYLE[state]
          const boxShadow = n.trigger ? ring(C.trigger) : n.selected ? ring(C.strong) : 'none'
          const clickable = !!onNodeClick
          const El = clickable ? 'button' : 'div'
          const badge = orderOn && n.order != null && n.order > 0
          const extra = [state !== 'idle' ? state : '', n.tag ?? '', n.trigger ? 'setState here' : '', badge ? `render order ${n.order}` : ''].filter(Boolean)
          const desc = [n.label, ...extra].join(', ')
          return (
            <El
              key={n.id}
              type={clickable ? 'button' : undefined}
              onClick={clickable ? () => onNodeClick(n.id) : undefined}
              title={n.title}
              // Buttons take their name from the visible label plus screen-reader-only details;
              // plain nodes are images named by the same description.
              role={clickable ? undefined : 'img'}
              aria-label={clickable ? undefined : desc}
              aria-pressed={clickable ? !!n.selected || !!n.trigger : undefined}
              className={`absolute box-border flex items-center justify-center rounded-control p-0 font-mono font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow] ease-out ${clickable ? 'cursor-pointer hover:brightness-125' : 'cursor-default'}`}
              style={{
                left,
                top,
                width,
                height: L.chipHeight,
                fontSize: L.fontSize,
                background: s.bg,
                border: s.bd,
                color: s.fg,
                textDecoration: s.strike ? 'line-through' : 'none',
                boxShadow,
                transitionDuration: `${WAVE_MS}ms`,
                transitionDelay: `${depth * WAVE_MS}ms`,
              }}
            >
              <span aria-hidden={!clickable || undefined}>{n.label}</span>
              {clickable && extra.length > 0 && <span className="sr-only">{`, ${extra.join(', ')}`}</span>}
              {n.tag && (
                <span
                  aria-hidden
                  className="absolute -top-2 right-[5px] rounded-tag border border-node-idle-bd bg-bg px-[5px] py-px text-[9.5px] leading-3 tracking-[0.02em] no-underline"
                  style={{ color: n.trigger ? C.trigger : C.secondary, textDecoration: 'none' }}
                >
                  {n.tag}
                </span>
              )}
              {badge && (
                <span
                  aria-hidden
                  className="absolute -top-2 -left-2 flex size-[17px] items-center justify-center rounded-full text-[10px] font-semibold"
                  style={{ background: s.dot, color: C.onPhase, textDecoration: 'none' }}
                >
                  {n.order}
                </span>
              )}
            </El>
          )
        })}
      </div>
    </div>
  )
}

const LEGEND: Record<NodeState, { label: string; bg: string; bd: string }> = {
  idle: { label: 'idle', bg: C.nodeIdleBg, bd: `1px solid ${C.nodeIdleBd}` },
  render: { label: 're-rendering', bg: alpha(C.render, 16), bd: `1px solid ${C.render}` },
  reconcile: { label: 'compared', bg: alpha(C.reconcile, 16), bd: `1px solid ${C.reconcile}` },
  dom: { label: 'DOM changed', bg: alpha(C.commit, 16), bd: `1px solid ${C.commit}` },
  skip: { label: 'skipped', bg: 'transparent', bd: `1px dashed ${C.nodeSkipBd}` },
  removed: { label: 'removed', bg: 'transparent', bd: `1px dashed ${C.error}` },
  error: { label: 'error', bg: alpha(C.error, 20), bd: `1px solid ${C.error}` },
  pending: { label: 'pending', bg: 'transparent', bd: `1px dashed ${C.nodeIdleBd}` },
}

/** Legend row under a tree panel (ch1 shows idle, re-rendering, skipped, DOM changed, removed). */
export function TreeLegend({
  states = ['idle', 'render', 'skip', 'dom', 'removed'],
}: {
  states?: readonly NodeState[]
}) {
  return (
    <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 border-t border-divider px-3.5 py-3 font-mono text-[11.5px] leading-none text-text-secondary">
      {states.map((k) => (
        <span key={k} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ background: LEGEND[k].bg, border: LEGEND[k].bd }} />
          {LEGEND[k].label}
        </span>
      ))}
    </div>
  )
}
