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
 * Chapter eyebrow ("Chapter NN" · phase labels) and the 48px title (32px on mobile).
 */
export function ChapterHeader({ n, title, phases = [], eyebrow, as: H = 'h2' }: ChapterHeaderProps) {
  return (
    <header className="flex max-w-copy flex-col gap-4">
      <div className="eyebrow flex flex-wrap items-center gap-x-3 gap-y-2">
        <span>Chapter {pad2(n)}</span>
        <span className="size-[3px] rounded-full bg-dot-off" aria-hidden />
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
