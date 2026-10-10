import { useEffect, useState } from 'react'

/** A section is current once its top passes this fraction of the viewport height (R-G3). */
export const CURRENT_LINE = 0.45

/** Number of the last `[data-ch]` section whose top is above the current line, or 1. */
export function measureCurrentChapter(root: ParentNode = document, line = CURRENT_LINE): number {
  const limit = window.innerHeight * line
  let cur = 1
  root.querySelectorAll<HTMLElement>('[data-ch]').forEach((el) => {
    if (el.getBoundingClientRect().top < limit) cur = Number(el.dataset.ch) || cur
  })
  return cur
}

/**
 * The chapter in view: the last `[data-ch]` section whose top is above 45% of the viewport.
 * Measured at most once per frame on scroll, on resize and whenever the page's height changes
 * (a chapter's demo growing or shrinking moves every section below it without a scroll), so
 * the value can never go stale between crossings.
 */
export function useCurrentChapter(): number {
  const [current, setCurrent] = useState(1)

  useEffect(() => {
    let frame = 0
    const schedule = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        setCurrent(measureCurrentChapter())
      })
    }

    const ro = new ResizeObserver(schedule)
    ro.observe(document.body)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    schedule()

    return () => {
      window.cancelAnimationFrame(frame)
      ro.disconnect()
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [])

  return current
}
