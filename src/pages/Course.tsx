import { useEffect, useState } from 'react'
import { ChapterDrawer } from '../components/ChapterDrawer'
import { ChapterSidebar } from '../components/ChapterSidebar'
import { MobileBar } from '../components/MobileBar'
import { TopBar } from '../components/TopBar'
import { useCurrentChapter } from '../hooks/useCurrentChapter'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { CHAPTER_COMPONENTS } from './course/index'

/**
 * The guide: one long scrolling page with chapters 1–10 (`#ch1` … `#ch10`). The chrome (top
 * bar, sidebar, drawer) lives here; each chapter is its own component in
 * src/pages/course, listed in CHAPTER_COMPONENTS.
 */
export default function Course() {
  const current = useCurrentChapter()
  const reduced = useReducedMotion()
  const [drawer, setDrawer] = useState(false)

  // Sections render after the browser's own hash jump, so honour `#chN` once on mount.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'instant' })
  }, [])

  return (
    <>
      <div className="min-h-screen bg-bg text-text-strong">
        <TopBar reducedMotion={reduced} current={current} onOpenChapters={() => setDrawer(true)} />
        <MobileBar current={current} onOpenChapters={() => setDrawer(true)} className="md:hidden" />
        <ChapterDrawer open={drawer} onClose={() => setDrawer(false)} current={current} />
        <div className="flex items-start">
          <ChapterSidebar current={current} />
          <main className="min-w-0 flex-1">
            {CHAPTER_COMPONENTS.map((Chapter, i) => (
              <Chapter key={i} />
            ))}
          </main>
        </div>
      </div>
    </>
  )
}
