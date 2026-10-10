import { memo, useState, useTransition } from 'react'
import { Panel } from '../../../components/Panel'
import { Toggle } from '../../../components/ui/Toggle'
import { C } from '../../../sim/colors'

const ROWS = 5000
const SHOWN = 60
const WORDS = ['react', 'render', 'commit', 'fiber', 'lane', 'effect', 'state', 'props', 'hook', 'suspense', 'transition', 'batch']
const ITEMS = Array.from({ length: ROWS }, (_, i) => `${WORDS[i % WORDS.length]} ${WORDS[(i * 7 + 3) % WORDS.length]} #${i + 1}`)

/** Deliberate busy work so every row costs about the same on any machine (a few hundredths of a ms). */
function slowWork(seed: number) {
  let x = seed
  for (let i = 0; i < 1500; i++) x = (x * 1103515245 + 12345) % 2147483648
  return x
}

/** One row. All 5,000 render on every filter change; only the first matches are drawn. */
function Row({ text, query, index }: { text: string; query: string; index: number }) {
  // Opt out of React Compiler memoization: the demo needs the raw cost of every row.
  'use no memo'
  const w = slowWork(index)
  if (index >= SHOWN) return null
  const at = query ? text.indexOf(query) : -1
  return (
    <li className="truncate px-3 py-[3px] font-mono text-xs text-text-code" data-w={w % 2}>
      {at < 0 ? (
        text
      ) : (
        <>
          {text.slice(0, at)}
          <mark className="rounded-[2px] bg-transparent" style={{ color: C.render }}>
            {text.slice(at, at + query.length)}
          </mark>
          {text.slice(at + query.length)}
        </>
      )}
    </li>
  )
}

/** memo: the urgent input render must not re-render the list. */
const HeavyList = memo(function HeavyList({ query }: { query: string }) {
  'use no memo'
  const matches = query ? ITEMS.filter((t) => t.includes(query)) : ITEMS
  return (
    <>
      <div className="flex justify-between px-3 pt-2 pb-1 font-mono text-[11px] text-text-label">
        <span>
          {matches.length.toLocaleString('en-US')} of {ROWS.toLocaleString('en-US')} rows match
        </span>
        <span>first {Math.min(SHOWN, matches.length)} shown</span>
      </div>
      <ul className="m-0 h-[220px] list-none overflow-y-auto p-0 pb-2">
        {matches.map((t, i) => (
          <Row key={t} text={t} query={query} index={i} />
        ))}
        {/* Every non-matching row still renders work, as in a real unvirtualized list. */}
        {ITEMS.slice(0, ROWS - matches.length).map((t, i) => (
          <Row key={`pad-${t}`} text={t} query={query} index={SHOWN + i} />
        ))}
      </ul>
    </>
  )
})

/**
 * A real heavy list next to the simulation: actual React 19, actual useTransition. With the
 * toggle off, typing waits for 5,000 rows; with it on, the input stays responsive.
 */
export function RealListDemo() {
  const [started, setStarted] = useState(false)
  const [transition, setTransition] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('')
  const [isPending, startTransition] = useTransition()

  const onChange = (value: string) => {
    setQuery(value)
    if (transition) startTransition(() => setFilter(value))
    else setFilter(value)
  }

  return (
    <Panel title="Try it · a real list of 5,000 rows" meta={transition ? 'useTransition' : 'plain setState'} metaColor={transition ? C.render : C.error}>
      <div className="flex flex-col gap-3 p-4">
        <p className="m-0 text-sm leading-[1.55] text-text-prose">
          This one isn't simulated. Every row does a little busy work, so rendering all 5,000 takes a noticeable moment. Type fast with the toggle on and off.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Toggle checked={transition} onChange={setTransition} label="startTransition" description="Mark the list update as non-urgent" />
          {!started && (
            <button type="button" className="btn-control" onClick={() => setStarted(true)}>
              Render the list
            </button>
          )}
        </div>
        {started && (
          <div className="overflow-hidden rounded-button border border-border bg-raised">
            <div className="flex items-center gap-2.5 border-b border-divider p-2">
              <input
                value={query}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Type to filter, e.g. react"
                aria-label="Filter 5,000 rows"
                className="h-9 min-w-0 flex-1 rounded-control border border-border-strong bg-bg px-3 text-sm text-text-strong focus-visible:border-render"
              />
              <span className="w-[120px] flex-none font-mono text-[11px]" style={{ color: isPending ? C.render : C.faint }} aria-live="polite">
                {isPending ? 'isPending · updating' : `showing "${filter}"`}
              </span>
            </div>
            <div style={{ opacity: isPending ? 0.6 : 1 }} className="transition-opacity">
              <HeavyList query={filter} />
            </div>
          </div>
        )}
      </div>
    </Panel>
  )
}
