import { alpha, C } from '../../../sim/colors'
import type { EffectBlock } from '../../../sim/scenarios/ch7-effects'

function blockStyle(b: EffectBlock) {
  if (!b.on) return { background: 'transparent', border: `1px dashed ${C.nodeIdleBd}`, color: C.label }
  if (b.id === 'paint') return { background: C.paintBlock, border: `1px solid ${C.nodeIdleBd}`, color: C.strong }
  const c = b.id === 'render' ? C.render : C.commit
  return { background: alpha(c, 14), border: `1px solid ${alpha(c, 60)}`, color: c }
}

/** "One update · time runs left to right": Render → Commit (DOM) → Layout → Paint → Passive. */
export function EffectTimeline({ blocks }: { blocks: readonly EffectBlock[] }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <span>One update · time runs left to right</span>
        <span>within one frame</span>
      </div>
      <ol className="m-0 flex list-none items-stretch gap-1.5 px-4 pt-[18px] pb-2.5 max-lg:flex-wrap" aria-label="What runs, in order">
        {blocks.map((b) => (
          <li
            key={b.id}
            className="flex min-w-0 flex-col gap-2 transition-opacity duration-200 max-lg:min-w-[150px]"
            style={{ flex: b.on ? 2 : 1.4, opacity: b.reached ? 1 : 0.35 }}
          >
            <span className="truncate font-mono text-[10.5px] leading-none font-medium tracking-[0.06em] text-text-label uppercase">{b.name}</span>
            <div className="flex min-h-[54px] items-center rounded-[7px] px-3 font-mono text-xs leading-[1.35] font-medium" style={blockStyle(b)}>
              {b.text}
            </div>
          </li>
        ))}
      </ol>
      <div className="flex justify-between px-4 pb-3.5 font-mono text-[11px] text-text-faint">
        <span>← nothing visible yet</span>
        <span>user sees the update →</span>
      </div>
    </div>
  )
}
