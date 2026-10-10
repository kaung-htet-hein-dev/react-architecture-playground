import type { CSSProperties } from 'react'
import { alpha, C } from '../../../sim/colors'
import type { Side, TrackBlock } from '../../../sim/scenarios/ch8-concurrent'

/** Narrowest a block may be drawn, in %, so a 1 ms urgent render stays visible. */
const MIN_W = 1.4

function blockStyle(b: TrackBlock): CSSProperties {
  switch (b.kind) {
    case 'key':
      return b.waited
        ? { top: 0, height: '100%', background: 'transparent', border: `1px dashed ${C.trigger}` }
        : { top: 0, height: '100%', background: C.trigger }
    case 'urgent':
      return { background: C.render, color: C.onPhase }
    case 'render':
      return { background: alpha(C.render, 22), border: `1px solid ${C.render}`, color: C.renderInk }
    case 'slice':
      return { background: alpha(C.render, 30), border: `1px solid ${alpha(C.render, 75)}` }
    case 'gone':
      return { background: 'transparent', border: `1px dashed ${alpha(C.render, 60)}` }
    case 'commit':
      return { background: alpha(C.commit, 30), border: `1px solid ${C.commit}`, color: C.commitInk }
  }
}

export interface TrackProps {
  blocks: readonly TrackBlock[]
  /** Track length: ms for the typing tracks, 100 for tracks already in %. */
  span: number
  /** Playhead position, same unit as `span`; omit for no playhead. */
  playhead?: number
  /** Leave room above for keystroke letters. */
  labels?: boolean
  label: string
}

/** Main-thread track: keystrokes, urgent renders, transition chunks, thrown-away work, commits. */
export function Track({ blocks, span, playhead, labels, label }: TrackProps) {
  const pct = (ms: number) => (ms / span) * 100
  return (
    <div
      role="img"
      aria-label={label}
      className={`relative h-11 rounded-control border border-divider bg-bg ${labels ? 'mt-3.5' : ''}`}
    >
      {blocks.map((b, i) => {
        const left = pct(b.start)
        // Back-to-back transition chunks get a hairline gap so each one reads as a chunk.
        const gap = (b.kind === 'slice' || b.kind === 'gone') && span !== 100 ? 0.3 : 0
        const width = b.kind === 'key' ? 0.7 : Math.min(100 - left, Math.max(b.kind === 'urgent' ? MIN_W : 0.4, pct(b.end - b.start) - gap))
        return (
          <div
            key={i}
            className="absolute box-border flex items-center overflow-visible rounded-[3px] px-2 font-mono text-[11px] font-medium whitespace-nowrap"
            style={{ left: `${left}%`, width: `${width}%`, top: 8, height: 28, ...blockStyle(b), ...(b.kind === 'key' ? { padding: 0, borderRadius: 1 } : {}) }}
          >
            {b.kind === 'key' && b.label && (
              <span className="absolute -top-[17px] -left-0.5 font-mono text-[11px] font-medium" style={{ color: C.trigger }}>
                {b.label}
              </span>
            )}
            {b.text && <span className="overflow-hidden text-ellipsis">{b.text}</span>}
          </div>
        )
      })}
      {playhead != null && playhead < span && (
        <span aria-hidden className="absolute -top-1 -bottom-1 w-px bg-text-strong opacity-70" style={{ left: `${pct(playhead)}%` }} />
      )}
    </div>
  )
}

/** 20 browser frames: dropped ones in red, frames not reached yet faded. */
export function FrameStrip({ frames }: { frames: Side['frames'] }) {
  const dropped = frames.filter((f) => f === 'dropped').length
  return (
    <div className="grid grid-cols-[repeat(20,1fr)] gap-[3px]" role="img" aria-label={`${frames.length} frames, ${dropped} dropped so far`}>
      {frames.map((f, i) => (
        <span
          key={i}
          className="h-3 rounded-[2px] transition-opacity"
          style={{
            background: f === 'dropped' ? alpha(C.error, 18) : C.control,
            border: `1px solid ${f === 'dropped' ? alpha(C.error, 80) : C.trackSoft}`,
            opacity: f === 'future' ? 0.35 : 1,
          }}
        />
      ))}
    </div>
  )
}

/** Legend under the two typing cards. */
export function TrackLegend() {
  const items: [string, CSSProperties][] = [
    ['keystroke', { width: 3, height: 12, background: C.trigger }],
    ['urgent render (input)', { width: 12, height: 10, borderRadius: 2, background: C.render }],
    ['transition chunk', { width: 12, height: 10, borderRadius: 2, background: alpha(C.render, 30), border: `1px solid ${alpha(C.render, 75)}` }],
    ['work thrown away', { width: 12, height: 10, borderRadius: 2, border: `1px dashed ${alpha(C.render, 60)}` }],
    ['commit', { width: 12, height: 10, borderRadius: 2, background: alpha(C.commit, 30), border: `1px solid ${C.commit}` }],
    ['dropped frame', { width: 12, height: 10, borderRadius: 2, background: alpha(C.error, 18), border: `1px solid ${alpha(C.error, 80)}` }],
  ]
  return (
    <div className="flex flex-wrap gap-x-[18px] gap-y-2 px-1 py-0.5 font-mono text-[11.5px] leading-none text-text-secondary">
      {items.map(([label, style]) => (
        <span key={label} className="flex items-center gap-1.5">
          <span aria-hidden style={{ ...style, boxSizing: 'border-box' }} />
          {label}
        </span>
      ))}
    </div>
  )
}
