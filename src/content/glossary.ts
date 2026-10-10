/** Chapter 10 · Glossary (18 terms), verbatim from the design (`lists().glossary`). */
export interface GlossaryTerm {
  term: string
  def: string
}

export const GLOSSARY: readonly GlossaryTerm[] = [
  { term: 'Batching', def: 'Grouping several state updates into one render. Automatic for every update since React 18.' },
  { term: 'Commit', def: 'The phase where React applies the differences it found to the real DOM.' },
  { term: 'Component', def: 'A function that takes props and returns React elements.' },
  { term: 'Context', def: 'A value a component can read with useContext without it being passed as a prop.' },
  { term: 'Effect', def: 'Code React runs after commit, to sync with something outside React.' },
  { term: 'Element', def: 'A plain object describing one piece of UI: type, props, children.' },
  { term: 'Fiber', def: "React's internal record for one component instance: type, props, hook slots, links to parent and children." },
  { term: 'Hook slot', def: "One entry in a fiber's list of hooks. Each hook call takes the next slot." },
  { term: 'Key', def: 'An identifier that tells React which old element a new one corresponds to.' },
  { term: 'Lane', def: "React's internal priority label for an update, such as SyncLane or TransitionLane." },
  { term: 'memo', def: 'A wrapper that lets a component skip a parent-caused render when its props are unchanged.' },
  { term: 'Object.is', def: 'The comparison React uses for props, state and dependencies. Objects are equal only if they are the same reference.' },
  { term: 'Reconciliation', def: 'Comparing the new element tree with the previous one to decide what to keep, update, create or remove.' },
  { term: 'Render', def: 'Calling components to get a new element tree. No DOM changes happen here.' },
  { term: 'Server Component', def: 'A component that runs only on the server; its code is never sent to the browser.' },
  { term: 'Suspense', def: 'A boundary that shows a fallback while something inside it is waiting for data or code.' },
  { term: 'Transition', def: 'An update marked as non-urgent, which React can interrupt to handle input first.' },
  { term: 'Work in progress', def: 'The tree React builds during a render, before it becomes the current tree at commit.' },
]

/** Case-insensitive match on the term or its definition. */
export function filterGlossary(query: string, terms: readonly GlossaryTerm[] = GLOSSARY): readonly GlossaryTerm[] {
  const q = query.trim().toLowerCase()
  if (!q) return terms
  return terms.filter((t) => t.term.toLowerCase().includes(q) || t.def.toLowerCase().includes(q))
}
