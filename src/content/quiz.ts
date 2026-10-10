/**
 * Chapter 10 · Quiz (8 questions). Question 3 is verbatim from the design (`quiz()`); the design
 * only specifies that one, so the other seven follow its format and draw on chapters 1–9.
 */
export type QuizKey = 'a' | 'b' | 'c' | 'd'

export interface QuizQuestion {
  q: string
  options: readonly { key: QuizKey; text: string }[]
  answer: QuizKey
  explain: string
}

export const QUIZ: readonly QuizQuestion[] = [
  {
    q: 'You call setCount(count + 1) in a click handler. When does the new number appear on screen?',
    options: [
      { key: 'a', text: 'Immediately, on the line where setCount runs.' },
      { key: 'b', text: 'The next time a useEffect runs.' },
      { key: 'c', text: 'After React renders, commits the change to the DOM and the browser paints.' },
      { key: 'd', text: 'Only after the whole page re-renders.' },
    ],
    answer: 'c',
    explain:
      'setCount only queues an update. React renders Counter again, compares the result with the last one, writes the one changed text node during commit, and the browser paints the next frame.',
  },
  {
    q: 'count is 0. A click handler calls setCount(count + 1) three times. What does the next render see?',
    options: [
      { key: 'a', text: '1' },
      { key: 'b', text: '3' },
      { key: 'c', text: '0' },
      { key: 'd', text: 'It throws, because setState was called more than once.' },
    ],
    answer: 'a',
    explain:
      'All three calls read count from the same render, where it is 0, so each one queues "set to 1". Pass an updater, setCount(c => c + 1), when the next value depends on the previous one.',
  },
  {
    q: "A parent re-renders and passes style={{ color: 'red' }} to a child wrapped in memo. Does the child re-render?",
    options: [
      { key: 'a', text: 'No. The props look the same, so memo skips it.' },
      { key: 'b', text: 'Yes. The object is new on every render, so Object.is says the props changed.' },
      { key: 'c', text: 'Only in development, because of StrictMode.' },
      { key: 'd', text: 'Only if the child has its own state.' },
    ],
    answer: 'b',
    explain:
      "Each render creates a new { color: 'red' } object. memo compares props with Object.is, and two different objects are never the same, even with identical contents. Move the object outside the component, or useMemo it.",
  },
  {
    q: 'A list uses key={index} and each row has an uncontrolled <input>. You type in the first row, then delete the first item. What happens to your text?',
    options: [
      { key: 'a', text: 'It disappears with the deleted row.' },
      { key: 'b', text: 'React refuses to render and warns about keys.' },
      { key: 'c', text: 'Every input is cleared.' },
      { key: 'd', text: "It stays in the first row, which now shows the next item's label." },
    ],
    answer: 'd',
    explain:
      "After the delete, key 0 still exists, so React keeps the first row's fiber and its DOM input and only updates the label. The last row is the one removed. A stable id as the key keeps the text with the right item.",
  },
  {
    q: "Why can't you call useState inside an if statement?",
    options: [
      { key: 'a', text: 'Conditional hooks are slower to run.' },
      { key: 'b', text: 'Hooks only work at the top of a file.' },
      { key: 'c', text: 'React matches hooks to slots by call order, so skipping one shifts every hook after it.' },
      { key: 'd', text: "State can't depend on props." },
    ],
    answer: 'c',
    explain:
      "A fiber keeps its hooks as a list. The first hook call reads slot 1, the second slot 2, and so on. If a call is skipped, every later hook reads another hook's slot.",
  },
  {
    q: 'A click updates state. In what order do useLayoutEffect, the browser paint and useEffect happen?',
    options: [
      { key: 'a', text: 'useLayoutEffect, paint, useEffect' },
      { key: 'b', text: 'useEffect, paint, useLayoutEffect' },
      { key: 'c', text: 'paint, useLayoutEffect, useEffect' },
      { key: 'd', text: 'All three at the same time.' },
    ],
    answer: 'a',
    explain:
      'Commit writes the DOM, then layout effects run before the browser paints, so they can measure without a flicker. Passive effects (useEffect) run after paint.',
  },
  {
    q: 'setFilter is wrapped in startTransition. The user types another letter while the list is still rendering. What does React do?',
    options: [
      { key: 'a', text: 'Finishes the list render, then handles the key press.' },
      { key: 'b', text: 'Renders the list on another thread.' },
      { key: 'c', text: 'Ignores the key press until the list is done.' },
      { key: 'd', text: 'Drops the unfinished list render, updates the input, then renders the list again with the latest value.' },
    ],
    answer: 'd',
    explain:
      'A transition is low priority, and React checks for more urgent work between components. The typed letter wins, the stale list render is thrown away, and React starts again with the newest filter.',
  },
  {
    q: 'A Server Component imports a database client and renders a client component. What JavaScript does the browser download?',
    options: [
      { key: 'a', text: 'The Server Component and the database client.' },
      { key: 'b', text: "Only the code for the components marked 'use client'." },
      { key: 'c', text: 'None at all; the page is plain HTML.' },
      { key: 'd', text: "The whole page's code, the same as before." },
    ],
    answer: 'b',
    explain:
      "Server Component code never ships to the browser. The browser receives the rendered result plus a reference to each client component, and downloads only those client components' code.",
  },
]

/** Answers so far, one per question (`null` = not answered yet). */
export type QuizAnswers = readonly (QuizKey | null)[]

/** Number of correct answers. */
export const quizScore = (answers: QuizAnswers, questions: readonly QuizQuestion[] = QUIZ): number =>
  questions.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0)
