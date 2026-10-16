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
      { key: 'c', text: 'After React renders, updates the DOM, and the browser draws the screen.' },
      { key: 'd', text: 'Only after the whole page re-renders.' },
    ],
    answer: 'c',
    explain:
      'This is the loop from chapter 1. First, setCount only queues an update. Next, React renders Counter again. Then it compares the result with the last one and finds the one text that changed. Finally it commits that change, and the browser draws the next frame.',
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
      'count is a plain const for this render, and it is 0. So each of the three calls queues "set to 1", and the next render applies them in turn: 1, 1, 1. Pass an updater, setCount(c => c + 1), when the next value depends on the previous one: each updater gets the result of the one before it.',
  },
  {
    q: "A parent re-renders and passes style={{ color: 'red' }} to a child wrapped in memo. Does the child re-render?",
    options: [
      { key: 'a', text: 'No. The props look the same, so memo skips it.' },
      { key: 'b', text: 'Yes. It is a new object on every render, so Object.is says the props changed.' },
      { key: 'c', text: 'Only in development, because of StrictMode.' },
      { key: 'd', text: 'Only if the child has its own state.' },
    ],
    answer: 'b',
    explain:
      "Each render of the parent makes a new { color: 'red' } object. memo compares each prop with Object.is, and two different objects are never equal, even if they look the same. So memo sees a changed prop and renders the child (chapter 4). Move the object outside the component, or wrap it in useMemo.",
  },
  {
    q: 'A list uses key={index}, and each row has its own <input> (not controlled by state). You type in the first row, then delete the first item. What happens to your text?',
    options: [
      { key: 'a', text: 'It disappears with the deleted row.' },
      { key: 'b', text: 'React refuses to render and warns about keys.' },
      { key: 'c', text: 'Every input is cleared.' },
      { key: 'd', text: "It stays in the first row, which now shows the next item's label." },
    ],
    answer: 'd',
    explain:
      "React matches rows by key (chapter 5). After the delete, key 0 still exists, so React keeps the first row and its input, and only changes the label. The last key is gone, so React removes the last row instead. Using an id from your data as the key keeps the text with the right item.",
  },
  {
    q: "Why can't you call useState inside an if statement?",
    options: [
      { key: 'a', text: 'Conditional hooks are slower to run.' },
      { key: 'b', text: 'Hooks only work at the top of a file.' },
      { key: 'c', text: 'React matches hooks by call order, so skipping one moves every hook after it to the wrong place.' },
      { key: 'd', text: "State can't depend on props." },
    ],
    answer: 'c',
    explain:
      "React keeps each component's hooks in a numbered list of slots and never sees their names (chapter 6). The first hook call reads slot 1, the second reads slot 2, and so on. If an if skips a call, every hook after it reads the wrong slot.",
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
      'Chapter 7 in order: commit changes the DOM. Then useLayoutEffect runs, before the browser draws, so it can measure things without a flicker. Then the browser draws. Then useEffect runs.',
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
      'A transition is not urgent, and React checks for urgent work between components (chapter 8). So the typed letter goes first, the unfinished list render is thrown away, and React starts the list again with the newest filter.',
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
      "Server Component code, and everything it imports, stays on the server. The browser gets the rendered result plus a pointer to each client component, and downloads only the code for those client components.",
  },
]

/** Answers so far, one per question (`null` = not answered yet). */
export type QuizAnswers = readonly (QuizKey | null)[]

/** Number of correct answers. */
export const quizScore = (answers: QuizAnswers, questions: readonly QuizQuestion[] = QUIZ): number =>
  questions.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0)
