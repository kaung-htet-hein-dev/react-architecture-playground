import { Link } from 'react-router'
import { CHAPTER_COUNT, pad2 } from '../app/chapters'
import { C } from '../sim/colors'
import { PHASES, type Phase } from '../sim/types'
import { BrandMark } from './ui/BrandMark'

export interface MobileBarProps {
  current: number
  /** Phases lit for the current chapter. */
  phases: readonly Phase[]
  /** Tapping "NN/10" opens the chapter drawer. */
  onOpenChapters: () => void
  /** Render as a static bar (Component sheet); the guide makes it sticky. */
  sticky?: boolean
  className?: string
}

/**
 * Mobile top bar (52px, ≤ 768px): brand squares, "NN/10", progress bar, phase label, four
 * mini phase bars and a 44px Playground button.
 */
export function MobileBar({ current, phases, onOpenChapters, sticky = true, className = '' }: MobileBarProps) {
  const one = phases.length === 1
  const phLabel = one ? phases[0] : phases.length ? 'loop' : ''
  return (
    <div
      className={`z-20 flex h-mobilebar flex-none items-center gap-2.5 border-b border-divider bg-raised pr-1 pl-4 ${sticky ? 'sticky top-0' : ''} ${className}`}
    >
      <BrandMark size={6} />
      <button
        type="button"
        onClick={onOpenChapters}
        aria-label={`Chapter ${current} of ${CHAPTER_COUNT}. Open chapters`}
        className="-mx-1.5 flex h-11 flex-none items-center rounded-control px-1.5 font-mono text-[11.5px] font-medium text-text-secondary"
      >
        {pad2(current)}/{CHAPTER_COUNT}
      </button>
      <span className="relative h-[3px] flex-1 rounded-sm bg-track-soft" aria-hidden>
        <span
          className="absolute inset-y-0 left-0 rounded-sm bg-text-strong transition-[width] duration-300"
          style={{ width: `${(current / CHAPTER_COUNT) * 100}%` }}
        />
      </span>
      <span
        className="flex-none font-mono text-[9.5px] font-medium tracking-[0.07em] uppercase"
        style={{ color: one ? C[phases[0]] : C.secondary }}
      >
        {phLabel}
      </span>
      <span className="flex flex-none gap-[3px]" aria-hidden>
        {PHASES.map((k) => (
          <span
            key={k}
            className="h-1.5 w-3 rounded-[2px]"
            style={{ background: phases.includes(k) ? C[k] : C.trackSoft }}
          />
        ))}
      </span>
      <Link to="/playground" aria-label="Playground" className="flex size-11 flex-none items-center justify-center">
        <span className="flex size-[30px] items-center justify-center rounded-[7px] bg-text-strong">
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
            <polygon points="2,1 2,9 9,5" fill={C.bg} />
          </svg>
        </span>
      </Link>
    </div>
  )
}
