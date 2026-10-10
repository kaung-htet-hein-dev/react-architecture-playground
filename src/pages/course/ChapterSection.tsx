import type { ReactNode } from 'react'
import { CHAPTERS } from '../../app/chapters'

export interface ChapterSectionProps {
  /** 1-based chapter number: sets `id="chN"` and `data-ch` (read by useCurrentChapter). */
  n: number
  /** Chapter 1 opens the page: 104px top padding and 56px gaps (hero, loop strip, chapter). */
  hero?: boolean
  children: ReactNode
  className?: string
}

/**
 * The `<section id="chN" data-ch="N">` every chapter renders as its root: max 1200px, centered,
 * 120px top padding (104 for the hero), 32px between blocks.
 */
export function ChapterSection({ n, hero, children, className = '' }: ChapterSectionProps) {
  const c = CHAPTERS[n - 1]
  const spacing = hero ? 'gap-14 pt-[104px]' : 'gap-8 pt-[120px]'
  return (
    <section
      id={c.id}
      data-ch={n}
      aria-label={`${String(n).padStart(2, '0')} ${c.title}`}
      className={`mx-auto flex max-w-content scroll-mt-topbar flex-col px-10 pb-12 max-md:px-4 max-md:pt-14 ${spacing} ${className}`}
    >
      {children}
    </section>
  )
}
