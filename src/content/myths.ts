/** Chapter 10 · Common myths, verbatim from the design (`lists().myths`). */
export interface Myth {
  myth: string
  fact: string
}

export const MYTHS: readonly Myth[] = [
  {
    myth: 'A re-render rebuilds the DOM.',
    fact: 'Rendering calls your components and makes objects. The DOM only changes in the places where something is different.',
  },
  {
    myth: 'Changing props makes a component re-render.',
    fact: 'Its parent re-rendering makes it re-render. Props are only what the parent passed down this time.',
  },
  {
    myth: 'setState changes the variable right away.',
    fact: 'It queues an update. count stays the same for the rest of this render; the next render sees the new value.',
  },
  {
    myth: 'memo always makes things faster.',
    fact: "It compares props to skip a render. If a prop is a new object every time, the check always fails and only adds work.",
  },
  {
    myth: 'useEffect runs right after setState.',
    fact: 'It runs after React has put the new state on the page, and after the browser has drawn it.',
  },
]
