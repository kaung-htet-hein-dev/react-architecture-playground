import { pad2 } from '../app/chapters'
import { C, PHASE_LABEL } from '../sim/colors'
import type { Phase } from '../sim/types'

export interface ChapterHeaderProps {
  n: number
  title: string
  /** Phase labels with dots in the eyebrow. Ignored when `eyebrow` is set. */
  phases?: readonly Phase[]
  /** Plain eyebrow text instead of phase labels, e.g. "All four phases". */
  eyebrow?: string
  /** Heading level; chapters use h2. */
  as?: 'h1' | 'h2'
}

/**
 * Chapter eyebrow (`NN` — rule — phase labels) and the 44px title (30px on mobile).
 */
export function ChapterHeader({ n, title, phases = [], eyebrow, as: H = 'h2' }: ChapterHeaderProps) {
  return (
    <header className="flex max-w-copy flex-col gap-3.5">
      <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs leading-none font-medium tracking-[0.08em] text-text-label uppercase max-md:gap-2 max-md:text-[11px]">
        <span className="text-text-strong">{pad2(n)}</span>
        <span className="h-px w-[18px] bg-dot-off max-md:w-3.5" aria-hidden />
        {eyebrow ? (
          <span>{eyebrow}</span>
        ) : (
          phases.map((p) => (
            <span key={p} className="flex items-center gap-1.5" style={{ color: C[p] }}>
              <span className="size-1.5 rounded-full" style={{ background: C[p] }} aria-hidden />
              {PHASE_LABEL[p]}
            </span>
          ))
        )}
      </div>
      <H className="h2">{title}</H>
    </header>
  )
}
