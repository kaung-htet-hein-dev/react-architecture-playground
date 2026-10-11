/** Chapter 10 · Glossary (18 terms), verbatim from the design (`lists().glossary`). */
export interface GlossaryTerm {
  term: string
  def: string
}

export const GLOSSARY: readonly GlossaryTerm[] = [
  { term: 'Batching', def: 'Putting several state updates into one render. Since React 18 this happens for every update.' },
  { term: 'Commit', def: 'The step where React makes the changes it found on the real page (the DOM).' },
  { term: 'Component', def: 'A function that takes props and returns React elements.' },
  { term: 'Context', def: 'A value a component can read with useContext, without passing it down as a prop.' },
  { term: 'Effect', def: 'Code React runs after commit, to keep something outside React in sync (a timer, a subscription, the page title).' },
  { term: 'Element', def: 'A plain object describing one piece of UI: type, props, children.' },
  { term: 'Fiber', def: "React's own object for one component on the page. It stores the type, props, hook slots, and links to its parent and children." },
  { term: 'Hook slot', def: "One place in a fiber's list of hooks. Each hook call takes the next slot." },
  { term: 'Key', def: 'An ID that tells React which new item in a list is which old item.' },
  { term: 'Lane', def: "React's priority label for an update, such as SyncLane (urgent) or TransitionLane (not urgent)." },
  { term: 'memo', def: 'A wrapper that lets a component skip a render caused by its parent when its props are the same.' },
  { term: 'Object.is', def: 'The check React uses to compare props, state and dependencies. Two objects are equal only if they are the exact same object.' },
  { term: 'Reconciliation', def: 'Comparing the new element tree with the old one to decide what to keep, change, add or remove.' },
  { term: 'Render', def: 'Calling your components to get a new element tree. The page does not change in this step.' },
  { term: 'Server Component', def: 'A component that runs only on the server. Its code is never sent to the browser.' },
  { term: 'Suspense', def: 'A wrapper that shows a fallback (like a spinner) while something inside it waits for data or code.' },
  { term: 'Transition', def: 'An update marked as not urgent. React can pause it to handle typing or clicks first.' },
  { term: 'Work in progress', def: 'The new tree React builds during a render. It becomes the current tree at commit.' },
]

/** Case-insensitive match on the term or its definition. */
export function filterGlossary(query: string, terms: readonly GlossaryTerm[] = GLOSSARY): readonly GlossaryTerm[] {
  const q = query.trim().toLowerCase()
  if (!q) return terms
  return terms.filter((t) => t.term.toLowerCase().includes(q) || t.def.toLowerCase().includes(q))
}
