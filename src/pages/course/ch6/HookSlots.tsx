import type { CSSProperties } from 'react'
import { alpha, C } from '../../../sim/colors'
import type { SlotRead, SlotStatus } from '../../../sim/scenarios/ch6-hooks'

interface ColumnStyle {
  call: CSSProperties
  link: string
  slot: CSSProperties
  opacity: number
}

const chip: CSSProperties = { padding: '6px 8px', borderRadius: 6, fontSize: 11.5 }

function columnStyle(status: SlotStatus): ColumnStyle {
  const okCall: CSSProperties = { background: alpha(C.render, 14), border: `1px solid ${alpha(C.render, 60)}`, color: C.renderInk, fontWeight: 500 }
  const idleSlot: CSSProperties = { background: C.nodeIdleBg, border: `1px solid ${C.nodeIdleBd}`, color: C.nodeIdleFg }
  switch (status) {
    case 'active':
      return { call: okCall, link: alpha(C.render, 70), slot: { ...idleSlot, border: `1px solid ${C.render}`, color: C.heading }, opacity: 1 }
    case 'ok':
      return { call: okCall, link: alpha(C.render, 70), slot: idleSlot, opacity: 1 }
    case 'error':
      return {
        call: { background: alpha(C.error, 16), border: `1px solid ${C.error}`, color: '#ffffff', fontWeight: 500 },
        link: C.error,
        slot: { background: alpha(C.error, 8), border: `1px solid ${alpha(C.error, 70)}`, color: C.error },
        opacity: 1,
      }
    case 'unread':
      return {
        call: { border: `1px dashed ${C.nodeIdleBd}`, color: C.faint },
        link: C.nodeIdleBd,
        slot: { border: `1px dashed ${C.nodeSkipBd}`, color: C.nodeSkipFg },
        opacity: 1,
      }
    case 'pending':
      return {
        call: { border: `1px dashed ${C.nodeIdleBd}`, color: C.label },
        link: C.nodeIdleBd,
        slot: { border: `1px dashed ${C.nodeSkipBd}`, color: C.faint },
        opacity: 0.45,
      }
  }
}

/** One render's hook calls (top) mapped to the fiber's slots (bottom), by position. */
export function HookSlotRow({ title, titleColor, reads }: { title: string; titleColor: string; reads: readonly SlotRead[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="font-mono text-xs leading-none font-medium" style={{ color: titleColor }}>
        {title}
      </span>
      <ol className="m-0 grid list-none grid-cols-3 gap-2 p-0" aria-label={title}>
        {reads.map((r, i) => {
          const s = columnStyle(r.status)
          return (
            <li key={i} className="flex min-w-0 flex-col items-stretch font-mono transition-opacity" style={{ opacity: s.opacity }}>
              <span className="truncate" style={{ ...chip, ...s.call }}>
                {r.call ?? 'no call'}
              </span>
              <span className="h-3 w-[1.5px] self-center" style={{ background: s.link }} aria-hidden />
              <span className="truncate" style={{ ...chip, ...s.slot }} title={r.slot}>
                {r.slot}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/** Field rows of the fiber card: type, props, return, child, memoizedState. */
export function FiberFields({ props, chain }: { props: string; chain: string }) {
  const rows: [string, string, string][] = [
    ['type', 'Profile', C.strong],
    ['props', props, C.strong],
    ['return', '→ App fiber', C.secondary],
    ['child', '→ Card fiber', C.secondary],
    ['memoizedState', chain, C.render],
  ]
  return (
    <dl className="m-0 grid grid-cols-[120px_minmax(0,1fr)] gap-x-3.5 gap-y-1.5 border-b border-divider px-4 py-3.5 font-mono text-[12.5px] leading-[1.4]">
      {rows.map(([k, v, c]) => (
        <div key={k} className="contents">
          <dt className="text-text-label">{k}</dt>
          <dd className="m-0 min-w-0 truncate" style={{ color: c }}>
            {v}
          </dd>
        </div>
      ))}
    </dl>
  )
}
