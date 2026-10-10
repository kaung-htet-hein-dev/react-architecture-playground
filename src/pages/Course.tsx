import { useEffect, useState } from 'react'
import { loopPhasesFor } from '../app/chapters'
import { HeroPhaseContext } from '../app/heroPhase'
import { ChapterDrawer } from '../components/ChapterDrawer'
import { ChapterSidebar } from '../components/ChapterSidebar'
import { MobileBar } from '../components/MobileBar'
import { TopBar } from '../components/TopBar'
import { useCurrentChapter } from '../hooks/useCurrentChapter'
import { useReducedMotion } from '../hooks/useReducedMotion'
import type { Phase } from '../sim/types'
import { CHAPTER_COMPONENTS } from './course/index'

/**
 * The guide: one long scrolling page with chapters 1–10 (`#ch1` … `#ch10`). The chrome (top
 * bar, sidebar, drawer, loop indicator) lives here; each chapter is its own component in
 * src/pages/course, listed in CHAPTER_COMPONENTS.
 */
export default function Course() {
  const current = useCurrentChapter()
  const reduced = useReducedMotion()
  const [heroPhases, setHeroPhases] = useState<readonly Phase[]>([])
  const [drawer, setDrawer] = useState(false)
  const lit = loopPhasesFor(current, heroPhases)

  // Sections render after the browser's own hash jump, so honour `#chN` once on mount.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'instant' })
  }, [])

  return (
    <HeroPhaseContext value={setHeroPhases}>
      <div className="min-h-screen bg-bg text-text-strong">
        <TopBar phases={lit} reducedMotion={reduced} current={current} onOpenChapters={() => setDrawer(true)} />
        <MobileBar current={current} phases={lit} onOpenChapters={() => setDrawer(true)} className="md:hidden" />
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
    </HeroPhaseContext>
  )
}
