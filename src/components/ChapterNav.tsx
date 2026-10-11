import { CHAPTERS, CHAPTER_COUNT, chapterDots, pad2 } from '../app/chapters'
import { C } from '../sim/colors'

export interface ChapterNavProps {
  /** Current chapter (1-based). */
  current: number
  /** Called after a chapter link is followed (the drawer closes itself with it). */
  onNavigate?: () => void
  /** Drawer items are 44px tall for touch. */
  touch?: boolean
}

/** "Chapters · NN / 10" header above the chapter list. */
export function ChapterProgress({ current }: { current: number }) {
  return (
    <div className="flex items-baseline justify-between px-2">
      <span className="text-[15px] leading-none font-semibold text-text-strong">Chapters</span>
      <span className="font-mono text-xs leading-none text-text-label">
        {pad2(current)} / {CHAPTER_COUNT}
      </span>
    </div>
  )
}

/**
 * The 10 chapter links (reactnative.dev menu): `20px | 1fr | auto` grid with number, title and
 * phase dots. Current: primary text on a faint brand tint. Others: muted text, light hover.
 */
export function ChapterNav({ current, onNavigate, touch }: ChapterNavProps) {
  return (
    <nav aria-label="Chapters" className="flex flex-col gap-1">
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
            className={`grid grid-cols-[20px_minmax(0,1fr)_auto] items-start gap-2.5 rounded-control px-2 py-2 text-[15px] leading-[1.25] font-medium transition-colors ${isCur ? 'bg-link/8 text-primary' : `hover:bg-white/5 ${done ? 'text-text-strong' : 'text-text-secondary'}`} ${touch ? 'min-h-11' : ''}`}
          >
            <span className="pt-[3px] font-mono text-xs leading-none">{pad2(c.n)}</span>
            <span>{c.title}</span>
            <span className="flex gap-[3px] pt-[7px]" aria-hidden>
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
