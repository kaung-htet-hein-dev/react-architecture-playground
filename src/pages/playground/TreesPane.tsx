import { ComponentTree } from '../../components/tree/ComponentTree'
import { alpha, C } from '../../sim/colors'
import type { PgData, PgField, PgPane } from '../../sim/scenarios/playground'
import type { TreeNode } from '../../sim/types'

const ROLE: Record<PgPane['role'], { label: string; sub: string }> = {
  current: { label: 'Current', sub: 'what is on screen' },
  wip: { label: 'Work in progress', sub: 'being built' },
  alternate: { label: 'Alternate', sub: 'kept for the next render' },
  empty: { label: 'Work in progress', sub: 'being built' },
}

const fieldColor = (f: PgField) => (f.tone === 'label' ? C.label : f.tone ? C[f.tone] : C.node)

function Pane({
  p,
  side,
  swapped,
  colWidth,
  selected,
  onSelect,
}: {
  p: PgPane
  side: 'left' | 'right'
  swapped: boolean
  colWidth: number
  selected: string | null
  onSelect: (id: string) => void
}) {
  const role = ROLE[p.role]
  const border = p.role === 'current' ? (swapped ? alpha(C.commit, 60) : C.dotOff) : p.role === 'wip' ? alpha(C.render, 50) : C.border
  const nodes: TreeNode[] = p.tree.map((n) => (n.id === selected ? { ...n, selected: true } : n))
  return (
    <section
      aria-label={`${side === 'left' ? 'Left' : 'Right'} fiber tree: ${role.label}`}
      className="flex min-w-0 flex-col overflow-hidden rounded-panel border bg-panel transition-[opacity,border-color] duration-[240ms]"
      style={{ borderColor: border, opacity: p.role === 'alternate' ? 0.6 : 1 }}
    >
      <div className="flex h-9 flex-none items-center justify-between gap-2 border-b border-divider px-3">
        <span key={role.label} className="pg-label-in truncate font-mono text-[11px] font-medium tracking-[0.06em] text-text-strong uppercase">
          {role.label}
        </span>
        <span key={role.sub} className="pg-label-in truncate font-mono text-[11px] text-text-label">
          {role.sub}
        </span>
      </div>
      {p.role === 'empty' ? (
        <div className="flex flex-1 items-center justify-center p-6 text-center text-[13.5px] leading-normal text-text-label">
          No work in progress yet. React starts building this tree when the render begins.
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 items-center px-2 py-4">
          <ComponentTree nodes={nodes} colWidth={colWidth} onNodeClick={onSelect} label={`${role.label} tree. Select a node to see its hook slots.`} />
        </div>
      )}
      <dl className="m-0 grid grid-cols-[110px_minmax(0,1fr)] gap-x-2.5 gap-y-1 border-t border-divider px-3 py-2.5 font-mono text-[11.5px] leading-[1.45]">
        {p.fields.map((f) => (
          <div key={f.k} className="contents">
            <dt className="text-text-label">{f.k}</dt>
            <dd className="m-0 truncate" style={{ color: fieldColor(f) }} title={f.v}>
              {f.v}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export interface TreesPaneProps {
  data: PgData
  colWidth: number
  selected: string | null
  onSelect: (id: string) => void
}

/**
 * Center column: the two fiber buffers side by side, the root.current pointer and the swap
 * banner. On commit the pointer slides to the other pane and the labels trade places.
 */
export function TreesPane({ data, colWidth, selected, onSelect }: TreesPaneProps) {
  const [a, b] = data.panes
  const pointsRight = b.role === 'current'
  const note = a.role === 'empty' || b.role === 'empty' ? '1 tree' : 'current + work in progress'
  return (
    <div className="flex min-h-0 flex-col bg-bg">
      <div className="panel-header">
        <span>Fiber trees</span>
        <span>{note}</span>
      </div>
      <div className="relative mx-4 mt-3 h-[26px] flex-none">
        <span
          className="absolute top-0 flex h-[26px] items-center gap-2 rounded-control bg-accent px-2.5 font-mono text-[11.5px] font-semibold whitespace-nowrap text-accent-ink transition-[left,transform] duration-[240ms] ease-out"
          style={{ left: pointsRight ? '100%' : '0%', transform: pointsRight ? 'translateX(-100%)' : 'none' }}
          role="status"
          aria-label={`root.current points at the ${pointsRight ? 'right' : 'left'} tree`}
        >
          root.current → this tree
        </span>
      </div>
      {data.swapBanner && (
        <div
          className="mx-4 mt-2.5 flex flex-none items-center gap-2.5 rounded-[7px] border px-3 py-2 font-mono text-xs font-medium"
          style={{ background: alpha(C.commit, 10), borderColor: alpha(C.commit, 50), color: C.commit }}
          role="status"
        >
          ⇄ swapped on commit · the work-in-progress tree is now current
        </div>
      )}
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-auto px-4 pt-3 pb-4">
        <Pane p={a} side="left" swapped={data.swapBanner} colWidth={colWidth} selected={selected} onSelect={onSelect} />
        <Pane p={b} side="right" swapped={data.swapBanner} colWidth={colWidth} selected={selected} onSelect={onSelect} />
      </div>
    </div>
  )
}
