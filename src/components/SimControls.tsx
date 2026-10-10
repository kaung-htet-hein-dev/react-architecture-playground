import { C, statusChip } from '../sim/colors'
import { SPEEDS, speedLabel, type SimSpeed, type SimStatus, type StepPhase } from '../sim/types'

export interface SimControlsProps {
  status: SimStatus
  /** Current step, 0 = idle frame, `total` = last step. */
  index: number
  /** Number of steps (ticks). */
  total: number
  /** Phase of the current step; colors the play button, done ticks and running chip. */
  phase: StepPhase
  speed: SimSpeed
  /** One mentor sentence about the step that just happened. */
  caption?: string
  /** No Reset and no speed control. */
  compact?: boolean
  onPlay: () => void
  onPause: () => void
  onStep: () => void
  onBack: () => void
  onReset: () => void
  /** Seek to a step (1-based tick number). */
  onSeek: (index: number) => void
  onSpeed: (speed: SimSpeed) => void
  className?: string
}

const iconBtn =
  'flex size-8 items-center justify-center rounded-control border border-border-strong bg-control text-text-node transition-colors hover:bg-control-hover disabled:opacity-45 disabled:hover:bg-control'

/**
 * Simulation control bar (README "SimControls", design/SimControls.dc.html): Reset · back ·
 * play/pause · step · scrubber · speed · status chip, with the mentor caption below.
 */
export function SimControls({
  status,
  index,
  total,
  phase,
  speed,
  caption,
  compact,
  onPlay,
  onPause,
  onStep,
  onBack,
  onReset,
  onSeek,
  onSpeed,
  className = '',
}: SimControlsProps) {
  const ph = C[phase === 'paint' ? 'commit' : phase]
  const step = status === 'idle' ? 0 : status === 'complete' ? total : Math.min(total, index)
  const chip = statusChip(status, ph, step, total)
  const running = status === 'running'
  const playDisabled = status === 'error'
  const complete = status === 'complete'
  const playTitle = running ? 'Pause' : complete ? 'Replay' : 'Play'

  return (
    <div
      className={`flex flex-col gap-3 rounded-panel border border-border bg-panel px-3.5 pt-3 pb-3.5 ${className}`}
      role="group"
      aria-label="Simulation controls"
    >
      <div className="flex flex-wrap items-center gap-2">
        {!compact && (
          <button type="button" onClick={onReset} title="Reset" className={`${iconBtn} w-auto px-2.5 text-xs font-medium`}>
            Reset
          </button>
        )}
        <button type="button" onClick={onBack} title="Step back" aria-label="Step back" disabled={index <= 0} className={iconBtn}>
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
            <rect x="1" y="1.5" width="1.8" height="9" fill="currentColor" />
            <polygon points="11,1.5 11,10.5 4,6" fill="currentColor" />
          </svg>
        </button>
        <button
          type="button"
          onClick={running ? onPause : onPlay}
          title={playTitle}
          aria-label={playTitle}
          disabled={playDisabled}
          className="flex h-8 w-10 items-center justify-center rounded-control border transition-[filter] hover:brightness-110 disabled:hover:brightness-100"
          style={{
            background: playDisabled ? C.control : complete ? C.strong : ph,
            borderColor: playDisabled ? C.borderStrong : 'transparent',
            color: playDisabled ? C.faint : C.onPhase,
          }}
        >
          {running ? (
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
              <rect x="2" y="1.5" width="2.8" height="9" fill="currentColor" />
              <rect x="7.2" y="1.5" width="2.8" height="9" fill="currentColor" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
              <polygon points="2.5,1.5 2.5,10.5 10.5,6" fill="currentColor" />
            </svg>
          )}
        </button>
        <button
          type="button"
          onClick={onStep}
          title="Step forward"
          aria-label="Step forward"
          disabled={index >= total || status === 'error'}
          className={iconBtn}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
            <polygon points="1,1.5 1,10.5 8,6" fill="currentColor" />
            <rect x="9.2" y="1.5" width="1.8" height="9" fill="currentColor" />
          </svg>
        </button>
        <div className="flex h-8 min-w-[120px] flex-1 items-center gap-[3px] px-1.5" role="group" aria-label="Scrubber">
          {Array.from({ length: total }, (_, i) => {
            const done = i < step
            const isCur = i === step - 1 && !complete
            const c = done ? (status === 'error' && i === step - 1 ? C.error : complete ? C.muted : ph) : C.track
            return (
              <button
                key={i}
                type="button"
                onClick={() => onSeek(i + 1)}
                aria-label={`Go to step ${i + 1}`}
                aria-current={isCur ? 'step' : undefined}
                className="group flex h-full min-w-0 flex-1 items-center p-0"
              >
                <span
                  className="block w-full rounded-[2px] transition-[height,background-color] duration-150 group-hover:brightness-125"
                  style={{ height: isCur ? 10 : 4, background: c }}
                />
              </button>
            )
          })}
        </div>
        {!compact && (
          <div className="flex rounded-[7px] border border-border bg-bg p-0.5" role="radiogroup" aria-label="Speed">
            {SPEEDS.map((s) => {
              const on = s === speed
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => onSpeed(s)}
                  className="h-[26px] rounded-[5px] border-0 px-2 font-mono text-[11.5px] font-medium transition-colors hover:text-text-strong"
                  style={{ background: on ? C.track : 'transparent', color: on ? C.strong : C.label }}
                >
                  {speedLabel(s)}
                </button>
              )
            })}
          </div>
        )}
        <span
          className="flex h-8 items-center gap-[7px] rounded-control px-2.5 font-mono text-[11.5px] font-medium whitespace-nowrap"
          style={{ background: chip.bg, color: chip.fg }}
          role="status"
        >
          <span className="size-[7px] rounded-full" style={{ background: chip.fg }} aria-hidden />
          {chip.label}
        </span>
      </div>
      {caption && (
        <p className="m-0 flex gap-3 text-[15px] leading-[1.6] text-text-code" aria-live="polite">
          <span
            className="mt-[3px] flex-none font-mono text-[10.5px] leading-4 font-medium tracking-[0.06em] uppercase"
            style={{ color: chip.fg }}
          >
            {status === 'error' ? 'Why it broke' : 'What happened'}
          </span>
          <span>{caption}</span>
        </p>
      )}
    </div>
  )
}
