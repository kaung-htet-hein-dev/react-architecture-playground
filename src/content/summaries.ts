import type { Phase } from '../sim/types'

/** Chapter 10 · "Each chapter in one sentence", verbatim from the design (`lists().summary`). */
export interface ChapterSummary {
  /** Chapter number, 1-based */
  n: number
  phase: Phase
  text: string
}

export const SUMMARIES: readonly ChapterSummary[] = [
  { n: 1, phase: 'trigger', text: 'A click becomes a queued update, a render, a diff, one DOM write and a painted frame.' },
  { n: 2, phase: 'render', text: 'React trades some extra work per update for not having to track every DOM node yourself.' },
  { n: 3, phase: 'render', text: 'A render returns plain objects that describe the UI; it never touches the DOM.' },
  { n: 4, phase: 'render', text: 'State changes re-render that component and everything below it, unless memo stops it.' },
  { n: 5, phase: 'reconcile', text: 'Keys tell React which old element a new one is, so state stays with the right item.' },
  { n: 6, phase: 'render', text: "Hooks are slots on a fiber, matched by call order, which is why they can't be conditional." },
  { n: 7, phase: 'commit', text: 'Commit writes the DOM; layout effects run before paint, passive effects after.' },
  { n: 8, phase: 'render', text: 'Transitions let React pause, drop and restart low-priority renders so input stays responsive.' },
  { n: 9, phase: 'commit', text: 'React 19 moves pending, optimistic and server work out of your effects and into React.' },
]

/** Chapter 10 · the loop map: each phase with the chapters pinned to it (`lists().loop`). */
export interface LoopMapPhase {
  phase: Phase
  desc: string
  chips: readonly { n: number; label: string }[]
}

export const LOOP_MAP: readonly LoopMapPhase[] = [
  {
    phase: 'trigger',
    desc: 'An update is queued with a priority.',
    chips: [
      { n: 1, label: 'One click' },
      { n: 8, label: 'Priorities' },
      { n: 9, label: 'Actions' },
    ],
  },
  {
    phase: 'render',
    desc: 'Components run and return elements.',
    chips: [
      { n: 3, label: 'Elements' },
      { n: 4, label: 'Re-renders' },
      { n: 6, label: 'Hooks' },
      { n: 8, label: 'Transitions' },
    ],
  },
  {
    phase: 'reconcile',
    desc: 'New elements are matched to old ones.',
    chips: [
      { n: 1, label: 'Diff' },
      { n: 5, label: 'Keys' },
    ],
  },
  {
    phase: 'commit',
    desc: 'DOM writes, then effects, then the next frame.',
    chips: [
      { n: 7, label: 'Effects' },
      { n: 9, label: 'Server and client' },
    ],
  },
]
