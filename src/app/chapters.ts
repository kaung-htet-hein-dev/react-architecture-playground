import { PHASES, type Phase } from '../sim/types'

export interface ChapterInfo {
  /** 1-based chapter number */
  n: number
  /** Section id and hash anchor: `ch1` … `ch10` */
  id: string
  title: string
  /** Phases the chapter covers (eyebrow labels and sidebar dots). */
  phases: readonly Phase[]
  /**
   * Phases lit in the loop indicator while the chapter is in view (R-G4). `'hero'` means
   * "follow the hero simulation's current phase" (chapter 1).
   */
  loop: readonly Phase[] | 'hero'
  /** Eyebrow text instead of phase labels (chapters 1, 9, 10). */
  eyebrow?: string
}

/** The 10 chapters, titles and phases from design/Render Commit Repeat.dc.html. */
export const CHAPTERS: readonly ChapterInfo[] = [
  { n: 1, id: 'ch1', title: 'One click, slowed down', phases: PHASES, loop: 'hero', eyebrow: 'All four phases' },
  { n: 2, id: 'ch2', title: 'Why React exists', phases: ['render'], loop: ['render'] },
  { n: 3, id: 'ch3', title: 'UI as a function of state', phases: ['render'], loop: ['render'] },
  { n: 4, id: 'ch4', title: 'What re-renders and why', phases: ['render'], loop: ['render'] },
  { n: 5, id: 'ch5', title: 'Reconciliation and keys', phases: ['reconcile'], loop: ['reconcile'] },
  { n: 6, id: 'ch6', title: 'Fiber and hooks', phases: ['render'], loop: ['render'] },
  { n: 7, id: 'ch7', title: 'Commit and effects', phases: ['commit'], loop: ['commit'] },
  { n: 8, id: 'ch8', title: 'Concurrent rendering', phases: ['trigger', 'render'], loop: ['trigger', 'render'] },
  { n: 9, id: 'ch9', title: 'Modern React', phases: PHASES, loop: PHASES, eyebrow: 'Across the loop' },
  { n: 10, id: 'ch10', title: 'Wrap-up', phases: PHASES, loop: PHASES, eyebrow: 'The whole loop' },
]

export const CHAPTER_COUNT = CHAPTERS.length

/** `4` → `04` */
export const pad2 = (n: number) => String(n).padStart(2, '0')

/** Sidebar dots: chapters that cover all four phases show none. */
export const chapterDots = (c: ChapterInfo): readonly Phase[] =>
  c.phases.length === PHASES.length ? [] : c.phases

/** Phases to light for chapter `n`, given the hero simulation's current phases. */
export function loopPhasesFor(n: number, heroPhases: readonly Phase[]): readonly Phase[] {
  const c = CHAPTERS[n - 1]
  if (!c) return []
  return c.loop === 'hero' ? heroPhases : c.loop
}
