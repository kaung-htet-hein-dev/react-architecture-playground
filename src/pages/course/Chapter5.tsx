import { useEffect, useRef, useState } from 'react'
import { CHAPTERS } from '../../app/chapters'
import { ChapterHeader } from '../../components/ChapterHeader'
import { SimControls } from '../../components/SimControls'
import { Takeaway } from '../../components/Takeaway'
import { WhyWhatHow } from '../../components/WhyWhatHow'
import { alpha, C } from '../../sim/colors'
import { simControlProps } from '../../sim/playback'
import {
  ACTION_LABEL,
  CH5_ITEMS,
  CH5_KEY_LINE,
  CH5_NOTES,
  ch5Keys,
  keyOf,
  nextItem,
  shuffled,
  type Ch5Action,
  type Item,
  type KeyBy,
} from '../../sim/scenarios/ch5-keys'
import { useSimulation } from '../../sim/useSimulation'
import { ChapterSection } from './ChapterSection'
import { KeyList } from './ch5/KeyList'

const info = CHAPTERS[4]

interface Run {
  before: Item[]
  after: Item[]
  action: Ch5Action
  /** Bumped per press so the same update can run again. */
  n: number
  /** Input text per key when the action was pressed (for removed rows). */
  snapshot: Record<KeyBy, Record<string, string>>
}

/** The notes we "typed" before the chapter starts, by each list's key. */
const seedFor = (keyBy: KeyBy, key: string) =>
  keyBy === 'id' ? (CH5_NOTES[key] ?? '') : (CH5_NOTES[CH5_ITEMS[Number(key)]?.id ?? ''] ?? '')

const seedSnapshot = (keyBy: KeyBy) => Object.fromEntries(CH5_ITEMS.map((it, i) => [keyOf(keyBy, it, i), seedFor(keyBy, keyOf(keyBy, it, i))]))

const INITIAL: Run = {
  before: [...CH5_ITEMS],
  after: CH5_ITEMS.slice(1),
  action: 'remove',
  n: 0,
  snapshot: { index: seedSnapshot('index'), id: seedSnapshot('id') },
}

const ACTIONS: Ch5Action[] = ['add', 'remove', 'shuffle']

const labels = (items: readonly Item[]) => (items.length ? items.map((i) => i.label).join(' · ') : 'empty')

/**
 * Chapter 5 · Reconciliation and keys. Two real React lists, keyed by index and by id, with
 * uncontrolled inputs. An action queues the same new array for both; the trace (fiber model)
 * walks trigger → reconcile → commit, and the real lists switch to the new array on the commit
 * step, so the browser's own inputs show where the typed text ends up.
 */
export function Chapter5() {
  const [run, setRun] = useState<Run>(INITIAL)
  const sim = useSimulation(ch5Keys, { before: run.before, after: run.after, action: run.action, run: run.n }, { autoplay: true })
  const data = sim.step.data
  const stage = data?.stage ?? 'before'
  const committed = stage === 'committed'
  const shown = committed ? run.after : run.before
  const base = shown

  const inputs = useRef<Record<KeyBy, Map<string, HTMLInputElement>>>({ index: new Map(), id: new Map() })
  const seeded = useRef(false)
  useEffect(() => {
    seeded.current = true
  }, [])

  const registerInput = (keyBy: KeyBy, key: string, el: HTMLInputElement | null) => {
    const map = inputs.current[keyBy]
    if (!el) {
      map.delete(key)
      return
    }
    if (!seeded.current && !map.has(key)) el.value = seedFor(keyBy, key)
    map.set(key, el)
  }

  const read = (keyBy: KeyBy) => Object.fromEntries([...inputs.current[keyBy]].map(([k, el]) => [k, el.value]))

  const nextFor = (action: Ch5Action): Item[] | null => {
    if (action === 'remove') return base.length ? base.slice(1) : null
    if (action === 'shuffle') return base.length > 1 ? shuffled(base) : null
    const it = nextItem(base)
    return it ? [...base, it] : null
  }

  const act = (action: Ch5Action) => {
    const after = nextFor(action)
    if (!after) return
    setRun((r) => ({ before: [...base], after, action, n: r.n + 1, snapshot: { index: read('index'), id: read('id') } }))
  }

  return (
    <ChapterSection n={5}>
      <ChapterHeader n={info.n} title={info.title} phases={info.phases} />
      <WhyWhatHow
        n={5}
        why="Using the index as a key hides the warning, and most of the time nothing looks wrong. Then you delete a row, and the text you typed jumps to the wrong row."
        what={
          <>
            After a render, React compares the new elements with the old ones to decide what to keep, change, add or remove. This is called{' '}
            <b className="term">reconciliation</b>. In a list, the <b className="term">key</b> is how React knows which new row is which old row. Same key,
            same component, same state.
          </>
        }
        analogy={{
          body: 'Think of a coat check. With key={item.id}, each ticket has the owner\'s name on it. With key={index}, the tickets only say "hook 1, hook 2, hook 3". If the first person leaves and everyone moves up one hook, each coat now hangs under the wrong name.',
          breaks: 'in React the coats (the state, like typed text) stay on their hooks, and the names (the labels) move. The effect is the same: they no longer match.',
        }}
        steps={[
          'Before: Milk, Bread and Eggs have keys 0, 1 and 2. You typed a note in each row.',
          'You remove Milk. The new list is Bread and Eggs, with keys 0 and 1.',
          'React matches by key. Key 0 still exists, so React keeps the first row and its input, and only changes the label to Bread.',
          'Key 2 is gone, so React removes the last row. Milk\'s note now sits next to Bread.',
        ]}
        ask={{
          q: 'Why does the index work most of the time?',
          a: 'If items are only ever added at the end, an item\'s index never changes, so index and identity stay the same thing. The bug only shows when items are removed, inserted or reordered before others.',
        }}
        how="Each row already has a note typed in, and the first row has been removed from both lists. Compare where the notes ended up. Then try Add and Shuffle."
      />
      <div className="flex flex-col gap-5">
        <div className="panel flex flex-wrap items-center gap-2 px-3.5 py-2.5">
          <span className="mr-1.5 font-mono text-xs leading-none font-medium text-text-label">Both lists</span>
          {ACTIONS.map((a) => {
            const on = a === run.action
            return (
              <button
                key={a}
                type="button"
                className="btn-control disabled:opacity-45"
                disabled={!nextFor(a)}
                onClick={() => act(a)}
                style={on ? { background: alpha(C.reconcile, 16), borderColor: alpha(C.reconcile, 70), color: C.reconcileInk } : undefined}
              >
                {ACTION_LABEL[a]}
              </button>
            )
          })}
          <span className="flex-1" />
          <span className="font-mono text-xs text-text-label">
            before: {labels(run.before)} → after: {labels(run.after)}
          </span>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(400px,1fr))] gap-5">
          {data &&
            (['index', 'id'] as const).map((k) => (
              <KeyList
                key={k}
                keyBy={k}
                items={shown}
                result={data[k]}
                stage={stage}
                snapshot={run.snapshot[k]}
                registerInput={registerInput}
                activeLine={sim.index > 0 ? CH5_KEY_LINE : 0}
              />
            ))}
        </div>
        <SimControls {...simControlProps(sim)} />
      </div>
      <Takeaway n={5} />
    </ChapterSection>
  )
}
