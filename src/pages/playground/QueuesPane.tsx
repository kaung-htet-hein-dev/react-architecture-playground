import type { ReactNode } from 'react'
import { LaneTag } from '../../components/ui/LaneTag'
import { alpha, C } from '../../sim/colors'
import type { PgHook, PgStep } from '../../sim/scenarios/playground'
import type { EffectEntry, Update } from '../../sim/types'

function SectionHeader({ label, meta, first }: { label: string; meta: ReactNode; first?: boolean }) {
  return (
    <div className={`panel-header flex-none ${first ? '' : 'border-t border-t-divider'}`} style={first ? undefined : { height: 36 }}>
      <span className="min-w-0 truncate">{label}</span>
      <span className="flex-none">{meta}</span>
    </div>
  )
}

const Empty = ({ children }: { children: ReactNode }) => <span className="px-0.5 py-1 text-[13px] text-text-faint">{children}</span>

function queueStyle(u: Update) {
  if (u.active) return { bg: alpha(C.trigger, 8), bd: alpha(C.trigger, 50), rc: C.label, op: 1 }
  const applied = u.status === 'applied' || u.status === 'processing' || u.status === 'cleared'
  return {
    bg: C.panel,
    bd: u.status === 'processing' ? alpha(C.render, 40) : u.status === 'interrupted' ? alpha(C.error, 40) : C.border,
    rc: applied ? C.render : u.status === 'interrupted' ? C.error : C.label,
    op: u.status === 'cleared' ? 0.55 : 1,
  }
}

function QueueRow({ u, n }: { u: Update; n: number }) {
  const s = queueStyle(u)
  return (
    <li
      className="grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-2 rounded-[7px] border px-[9px] py-[7px]"
      style={{ background: s.bg, borderColor: s.bd, opacity: s.op }}
    >
      <span className="font-mono text-[11px] font-medium text-text-label">#{n}</span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate font-mono text-xs font-medium text-text-strong" title={u.text}>
          {u.text}
        </span>
        <span className="font-mono text-[11px]" style={{ color: s.rc }}>
          {u.result ?? u.status}
        </span>
      </span>
      <LaneTag lane={u.lane} />
    </li>
  )
}

function HookRow({ h }: { h: PgHook }) {
  const tone = h.tone ? C[h.tone] : null
  return (
    <li
      className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-2 rounded-[7px] border bg-panel px-[9px] py-[7px]"
      style={{ borderColor: h.hot && tone ? alpha(tone, 60) : C.border }}
    >
      <span className="font-mono text-[11px] font-medium text-text-label">slot {h.n}</span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-mono text-xs font-medium text-text-strong">{h.type}</span>
        <span className="font-mono text-[11px] break-words" style={{ color: tone ?? C.secondary }}>
          {h.val}
        </span>
      </span>
    </li>
  )
}

function EffectRow({ e }: { e: EffectEntry }) {
  const ran = e.status === 'ran'
  return (
    <li
      className="flex flex-col gap-0.5 rounded-[7px] border px-[9px] py-[7px]"
      style={{ background: ran ? alpha(C.commit, 10) : C.panel, borderColor: ran ? alpha(C.commit, 50) : C.border }}
    >
      <span className="font-mono text-xs font-medium text-text-strong">{e.label}</span>
      <span className="font-mono text-[11px]" style={{ color: ran ? C.commit : C.secondary }}>
        {e.detail ?? e.status}
      </span>
    </li>
  )
}

export interface QueuesPaneProps {
  step: PgStep
  /** Component whose hook slots are shown (label) and its slots; null slots = no hooks. */
  hookOwner: { label: string; slots: PgHook[] | null; host: boolean }
}

/** Right column: update queue with lanes, hook slots, effect queue, DOM operations. */
export function QueuesPane({ step, hookOwner }: QueuesPaneProps) {
  const d = step.data!
  const queue = step.queue ?? []
  const effects = step.effects ?? []
  const ops = step.domOps
  return (
    <div className="flex min-h-0 flex-col overflow-auto border-l border-divider">
      <SectionHeader first label={`Update queue · ${d.queueOf}`} meta={queue.length ? `${queue.length} update${queue.length === 1 ? '' : 's'}` : 'empty'} />
      <div className="flex flex-col gap-1.5 px-3 pt-2.5 pb-3.5">
        {queue.length ? (
          <ol className="m-0 flex list-none flex-col gap-1.5 p-0" aria-label="Update queue">
            {queue.map((u, i) => (
              <QueueRow key={u.id} u={u} n={i + 1} />
            ))}
          </ol>
        ) : (
          <Empty>Empty. setState calls will line up here.</Empty>
        )}
      </div>

      <SectionHeader label={`Hook slots · ${hookOwner.label}`} meta="by call order" />
      <div className="flex flex-col gap-1.5 px-3 pt-2.5 pb-3.5">
        {hookOwner.slots && hookOwner.slots.length ? (
          <ol className="m-0 flex list-none flex-col gap-1.5 p-0" aria-label={`Hook slots of ${hookOwner.label}`}>
            {hookOwner.slots.map((h) => (
              <HookRow key={h.n} h={h} />
            ))}
          </ol>
        ) : (
          <Empty>
            {hookOwner.host
              ? `<${hookOwner.label}> is a host element. Host fibers have no hooks.`
              : hookOwner.label === 'HostRoot'
                ? 'HostRoot holds the root of the tree, not hooks.'
                : `${hookOwner.label} calls no hooks.`}
          </Empty>
        )}
      </div>

      <SectionHeader label="Effect queue" meta={d.effectNote ?? 'runs after paint'} />
      <div className="flex flex-col gap-1.5 px-3 pt-2.5 pb-3.5">
        {effects.length ? (
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {effects.map((e) => (
              <EffectRow key={e.id} e={e} />
            ))}
          </ul>
        ) : (
          <Empty>Nothing scheduled. React decides during render.</Empty>
        )}
      </div>

      <SectionHeader label="DOM operations" meta={`${ops.length} op${ops.length === 1 ? '' : 's'}`} />
      <div className="flex flex-col gap-1.5 px-3 pt-2.5 pb-3.5">
        {ops.length ? (
          <ol className="m-0 flex list-none flex-col gap-1.5 p-0" aria-label="DOM operations">
            {ops.map((o, i) => (
              <li
                key={i}
                className="flex items-center gap-2 rounded-[7px] border px-[9px] py-[7px] font-mono text-xs font-medium text-commit-ink"
                style={{ background: alpha(C.commit, 10), borderColor: alpha(C.commit, 50) }}
              >
                <span className="flex-none" style={{ color: C.commit }}>
                  {i + 1}
                </span>
                <span className="min-w-0 break-all">{o.text}</span>
              </li>
            ))}
          </ol>
        ) : (
          <Empty>No DOM writes yet. Render never touches the DOM.</Empty>
        )}
      </div>
    </div>
  )
}
