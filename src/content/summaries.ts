import type { Phase } from '../sim/types'

/** Chapter 10 · "Each chapter in one sentence", verbatim from the design (`lists().summary`). */
export interface ChapterSummary {
  /** Chapter number, 1-based */
  n: number
  phase: Phase
  text: string
}

export const SUMMARIES: readonly ChapterSummary[] = [
  { n: 1, phase: 'trigger', text: 'A click becomes a queued update, then a render, a compare, one DOM change and a new frame on screen.' },
  { n: 2, phase: 'render', text: 'React does a bit of extra work on each update so you don\'t have to update every DOM node yourself.' },
  { n: 3, phase: 'render', text: 'A render returns plain objects that describe the UI. It never changes the page.' },
  { n: 4, phase: 'render', text: 'A state change re-renders that component and everything below it, unless memo stops it.' },
  { n: 5, phase: 'reconcile', text: 'Keys tell React which new item is which old item, so state stays with the right item.' },
  { n: 6, phase: 'render', text: "React stores hooks in a list and matches them by call order, so you can't put them inside an if." },
  { n: 7, phase: 'commit', text: 'Commit changes the DOM. useLayoutEffect runs before the screen is drawn, useEffect runs after.' },
  { n: 8, phase: 'render', text: 'Transitions let React pause, drop and restart non-urgent renders, so typing stays fast.' },
  { n: 9, phase: 'commit', text: 'React 19 handles loading states, optimistic updates and server work for you, so you need fewer effects.' },
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
    desc: 'An update is added to a queue, with a priority.',
    chips: [
      { n: 1, label: 'One click' },
      { n: 8, label: 'Priorities' },
      { n: 9, label: 'Actions' },
    ],
  },
  {
    phase: 'render',
    desc: 'Your components run and return elements.',
    chips: [
      { n: 3, label: 'Elements' },
      { n: 4, label: 'Re-renders' },
      { n: 6, label: 'Hooks' },
      { n: 8, label: 'Transitions' },
    ],
  },
  {
    phase: 'reconcile',
    desc: 'React matches new elements to old ones.',
    chips: [
      { n: 1, label: 'Diff' },
      { n: 5, label: 'Keys' },
    ],
  },
  {
    phase: 'commit',
    desc: 'React changes the DOM, runs effects, then the browser draws.',
    chips: [
      { n: 7, label: 'Effects' },
      { n: 9, label: 'Server and client' },
    ],
  },
]
