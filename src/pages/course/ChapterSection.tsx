import type { ReactNode } from 'react'
import { CHAPTERS } from '../../app/chapters'

export interface ChapterSectionProps {
  /** 1-based chapter number: sets `id="chN"` and `data-ch` (read by useCurrentChapter). */
  n: number
  /** Last chapter: no divider below, longer bottom padding. */
  last?: boolean
  children: ReactNode
  className?: string
}

/**
 * The `<section id="chN" data-ch="N">` every chapter renders as its root: a full-width band
 * with a hairline below, 112px vertical padding, and a centered 1100px column with 48px
 * between blocks.
 */
export function ChapterSection({ n, last, children, className = '' }: ChapterSectionProps) {
  const c = CHAPTERS[n - 1]
  return (
    <section
      id={c.id}
      data-ch={n}
      aria-label={`${String(n).padStart(2, '0')} ${c.title}`}
      className={`scroll-mt-topbar px-12 max-lg:px-10 max-md:px-4 ${last ? 'pt-28 pb-36 max-md:pt-16 max-md:pb-20' : 'border-b border-divider py-28 max-md:py-16'}`}
    >
      <div className={`mx-auto flex max-w-content flex-col gap-12 max-md:gap-10 ${className}`}>{children}</div>
    </section>
  )
}
