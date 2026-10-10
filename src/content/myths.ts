/** Chapter 10 · Common myths, verbatim from the design (`lists().myths`). */
export interface Myth {
  myth: string
  fact: string
}

export const MYTHS: readonly Myth[] = [
  {
    myth: 'A re-render rebuilds the DOM.',
    fact: 'Rendering calls your components and produces objects. The DOM only changes where the commit finds a difference.',
  },
  {
    myth: 'Changing props makes a component re-render.',
    fact: 'A parent rendering makes it re-render. Props are just what the parent passed down this time.',
  },
  {
    myth: 'setState changes the variable right away.',
    fact: 'It queues an update. count stays the same for the rest of this render; the next render sees the new value.',
  },
  {
    myth: 'memo always makes things faster.',
    fact: "It trades a props comparison for a skipped render. If a prop is a new object every time, it's pure overhead.",
  },
  {
    myth: 'useEffect runs right after setState.',
    fact: 'It runs after React commits the render that used the new state, and after the browser paints it.',
  },
]
