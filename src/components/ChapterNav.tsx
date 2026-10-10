import { CHAPTERS, CHAPTER_COUNT, chapterDots, pad2 } from '../app/chapters'
import { useSettings } from '../app/settings'
import { C } from '../sim/colors'
import { Toggle } from './ui/Toggle'

export interface ChapterNavProps {
  /** Current chapter (1-based). */
  current: number
  /** Called after a chapter link is followed (the drawer closes itself with it). */
  onNavigate?: () => void
  /** Drawer items are 44px tall for touch. */
  touch?: boolean
}

/** "CHAPTERS · NN / 10" header with its 3px progress bar. */
export function ChapterProgress({ current }: { current: number }) {
  return (
    <div className="flex flex-col gap-2.5 px-2">
      <div className="flex items-baseline justify-between">
        <span className="label">Chapters</span>
        <span className="font-mono text-[11.5px] leading-none font-medium text-text-secondary">
          {pad2(current)} / {CHAPTER_COUNT}
        </span>
      </div>
      <span className="relative block h-[3px] rounded-sm bg-border" aria-hidden>
        <span
          className="absolute inset-y-0 left-0 rounded-sm bg-text-strong transition-[width] duration-300"
          style={{ width: `${(current / CHAPTER_COUNT) * 100}%` }}
        />
      </span>
    </div>
  )
}

/**
 * The 10 chapter links: `22px | 1fr | auto` grid with number, title and phase dots.
 * Current: raised, heading text, 500. Done: secondary text. Upcoming: label text.
 */
export function ChapterNav({ current, onNavigate, touch }: ChapterNavProps) {
  return (
    <nav aria-label="Chapters" className="flex flex-col gap-0.5">
      {CHAPTERS.map((c) => {
        const isCur = c.n === current
        const done = c.n < current
        const dots = chapterDots(c)
        return (
          <a
            key={c.id}
            href={`#${c.id}`}
            onClick={onNavigate}
            aria-current={isCur ? 'location' : undefined}
            className={`grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-2 rounded-[7px] px-2 py-1.5 transition-colors hover:bg-panel ${touch ? 'min-h-11' : 'min-h-[34px]'}`}
            style={{
              background: isCur ? C.panelHi : undefined,
              color: isCur ? C.heading : done ? C.secondary : C.label,
            }}
          >
            <span className="font-mono text-[11px] leading-none font-medium" style={{ color: isCur ? C.heading : C.faint }}>
              {pad2(c.n)}
            </span>
            <span className="text-[13.5px] leading-[1.3]" style={{ fontWeight: isCur ? 500 : 400 }}>
              {c.title}
            </span>
            <span className="flex gap-[3px]" aria-hidden>
              {dots.map((p) => (
                <span key={p} className="size-1.5 rounded-full" style={{ background: C[p], opacity: isCur ? 1 : 0.45 }} />
              ))}
            </span>
          </a>
        )
      })}
    </nav>
  )
}

/** In-app reduced-motion switch (saved in localStorage). Shows when the OS already asks. */
export function ReducedMotionToggle() {
  const { reducedMotionToggle, setReducedMotionToggle, systemReducedMotion } = useSettings()
  return (
    <Toggle
      checked={reducedMotionToggle || systemReducedMotion}
      disabled={systemReducedMotion}
      onChange={setReducedMotionToggle}
      label="Reduced motion"
      description={systemReducedMotion ? 'On in your system settings' : 'No autoplay, no transitions'}
    />
  )
}
