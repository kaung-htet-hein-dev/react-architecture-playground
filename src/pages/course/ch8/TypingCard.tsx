import type { ReactNode } from 'react'
import { C } from '../../../sim/colors'
import { SPAN_MS, type Side } from '../../../sim/scenarios/ch8-concurrent'
import { FrameStrip, Track } from './Track'

export interface TypingCardProps {
  title: string
  side: Side
  /** Letters typed so far. */
  typed: string
  playhead: number
  mode: 'blocking' | 'transition'
  /** Code under the track (and the useDeferredValue alternative for the transition card). */
  code: ReactNode
}

/** The fake input as the user sees it right now, with a caret. */
function FakeInput({ side, typed, mode }: Pick<TypingCardProps, 'side' | 'typed' | 'mode'>) {
  const behind = side.input !== typed
  return (
    <div className="flex h-[38px] items-center gap-2.5 rounded-[7px] bg-preview px-3 text-[15px] text-preview-ink" role="group" aria-label={`Input shows "${side.input}"`}>
      <span className="flex items-center">
        {side.input}
        <span className="ml-px h-[18px] w-[1.5px] bg-preview-ink" aria-hidden />
      </span>
      {mode === 'blocking' && behind && (
        <span className="ml-auto font-mono text-[11px] font-medium" style={{ color: C.previewAlert }}>
          you typed "{typed}"
        </span>
      )}
      {mode === 'transition' && (side.pending || side.list) && (
        <span className="ml-auto flex items-center gap-1.5 font-mono text-[11px] font-medium" style={{ color: C.previewMuted }}>
          {side.pending ? (
            <>
              <span className="size-[7px] rounded-full border-[1.5px]" style={{ borderColor: C.previewMuted }} aria-hidden />
              isPending · list updating
            </>
          ) : (
            `list shows "${side.list}"`
          )}
        </span>
      )}
    </div>
  )
}

/** One side of the comparison: input, main-thread track, 20-frame strip, code. */
export function TypingCard({ title, side, typed, playhead, mode, code }: TypingCardProps) {
  const ok = side.dropped === 0
  return (
    <div className="panel flex flex-col">
      <div className="panel-header">
        <span>{title}</span>
        <span style={{ color: ok ? C.commit : C.error }}>
          {side.dropped} frame{side.dropped === 1 ? '' : 's'} dropped
        </span>
      </div>
      <div className="flex flex-col gap-3.5 p-4">
        <FakeInput side={side} typed={typed} mode={mode} />
        <Track blocks={side.blocks} span={SPAN_MS} playhead={playhead} labels label={`${title}: main thread`} />
        <FrameStrip frames={side.frames} />
      </div>
      <div className="mt-auto border-t border-divider bg-raised">{code}</div>
    </div>
  )
}
