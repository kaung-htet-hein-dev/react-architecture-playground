import { alpha, C } from '../sim/colors'
import type { Block, BlockKind } from '../sim/types'

export interface FrameTimelineProps {
  blocks: readonly Block[]
  /** Playhead position, % of the track. */
  playhead: number
  /**
   * `frame`: one 16.7ms frame, blocks laid out in order (ch1 "From event to pixel").
   * `frames`: a row of browser frames with absolutely placed blocks (Playground).
   */
  variant?: 'frame' | 'frames'
  /** Frame labels for the `frames` variant (default F1…F6). */
  frames?: readonly string[]
  /** Axis labels under the `frame` variant. */
  axis?: readonly string[]
  /** Accessible description of the timeline. */
  label?: string
  className?: string
}

function frameBlockStyle(kind: BlockKind) {
  switch (kind) {
    case 'idle':
      return { background: 'transparent', border: `1px dashed ${C.trackSoft}`, color: C.faint, justify: 'center' as const }
    case 'paint':
      return { background: C.paintBlock, border: `1px solid ${C.nodeIdleBd}`, color: C.node, justify: 'flex-start' as const }
    case 'gone':
      return { background: 'transparent', border: `1px dashed ${alpha(C.render, 60)}`, color: C.label, justify: 'flex-start' as const }
    case 'urgent':
      return { background: C.render, border: '1px solid transparent', color: C.onPhase, justify: 'flex-start' as const }
    default:
      return { background: alpha(C[kind], 16), border: `1px solid ${alpha(C[kind], 60)}`, color: C[kind], justify: 'flex-start' as const }
  }
}

function framesBlockStyle(kind: BlockKind) {
  switch (kind) {
    case 'paint':
    case 'idle':
      return { background: C.trackSoft, border: `1px solid ${C.dotOff}` }
    case 'gone':
      return { background: 'transparent', border: `1px dashed ${alpha(C.render, 60)}` }
    case 'urgent':
      return { background: C.render, border: '1px solid transparent' }
    default:
      return { background: alpha(C[kind], 30), border: `1px solid ${alpha(C[kind], 80)}` }
  }
}

/**
 * Frame timeline with phase blocks and a playhead (README "FrameTimeline"). The playhead moves
 * linearly with the sim clock; in reduced motion it jumps per step.
 */
export function FrameTimeline({
  blocks,
  playhead,
  variant = 'frame',
  frames = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'],
  axis = ['0 ms', '4', '8', '12', '16.7 ms'],
  label = 'Frame timeline',
  className = '',
}: FrameTimelineProps) {
  const ph = Math.max(0, Math.min(100, playhead))

  if (variant === 'frames') {
    return (
      <div className={`relative mx-3 mt-2.5 mb-2 h-11 ${className}`} role="img" aria-label={label}>
        <div className="absolute inset-0 grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${frames.length}, 1fr)` }}>
          {frames.map((f) => (
            <div key={f} className="flex items-end rounded-tag border border-border bg-bg px-[5px] py-[3px] font-mono text-[10px] text-text-faint">
              {f}
            </div>
          ))}
        </div>
        {blocks.map((b, i) => (
          <div
            key={b.id ?? i}
            title={b.title ?? b.label}
            className="absolute h-5 rounded-[3px] transition-opacity duration-150"
            style={{ top: 6 + (b.row ?? 0) * 22, left: `${b.start ?? 0}%`, width: `${b.width ?? 0}%`, opacity: b.dim ? 0.25 : 1, ...framesBlockStyle(b.kind) }}
          />
        ))}
        <div
          aria-hidden
          className="absolute -top-1 -bottom-1 -ml-px w-0.5 rounded-[1px] bg-text-heading transition-[left] duration-300 ease-linear"
          style={{ left: `${ph}%` }}
        />
      </div>
    )
  }

  return (
    <div className={`px-4 pt-5 pb-3.5 ${className}`} role="img" aria-label={label}>
      <div className="relative">
        <div className="flex h-[34px] gap-[3px]">
          {blocks.map((b, i) => {
            const s = frameBlockStyle(b.kind)
            return (
              <div
                key={b.id ?? i}
                title={b.title ?? b.label}
                className="flex items-center overflow-hidden rounded-[5px] px-2 font-mono text-[10.5px] font-medium text-ellipsis whitespace-nowrap transition-opacity duration-150"
                style={{
                  width: b.width != null ? `${b.width}%` : undefined,
                  flex: b.width != null ? 'none' : 1,
                  background: s.background,
                  border: s.border,
                  color: s.color,
                  justifyContent: s.justify,
                  fontWeight: b.kind === 'idle' ? 400 : 500,
                  opacity: b.dim ? 0.35 : 1,
                }}
              >
                {b.label}
              </div>
            )
          })}
        </div>
        <div
          aria-hidden
          className="absolute -top-2 -bottom-2 -ml-px w-0.5 rounded-[1px] bg-text-heading transition-[left] duration-300 ease-linear"
          style={{ left: `${ph}%` }}
        >
          <span className="absolute -top-1.5 -left-1 h-1.5 w-2.5 rounded-[2px] bg-text-heading" />
        </div>
      </div>
      <div className="mt-3.5 flex justify-between font-mono text-[10.5px] text-text-faint" aria-hidden>
        {axis.map((a) => (
          <span key={a}>{a}</span>
        ))}
      </div>
    </div>
  )
}
