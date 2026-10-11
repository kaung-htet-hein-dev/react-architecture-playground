import {
  component,
  createRoot,
  domOpsOf,
  eventsOf,
  h,
  memo,
  stepBuilder,
  TransitionLane,
  useState,
  useTransition,
  type ModelEvent,
  type Root,
  type SetState,
} from '../model'
import type { Scenario } from '../types'

/**
 * Chapter 8 · Concurrent rendering. We type "react" into an input that filters a 5,000-row
 * list, once with plain setState (blocking) and once with useTransition. The fiber model does
 * the React work (lanes, yielding, interrupting, committing); this file adds a clock: every
 * component call costs time, so the model's events become blocks on a main-thread track and
 * a strip of 20 browser frames. Code from design `codes()`.
 */

export const CH8_BLOCK_CODE = 'function onChange(e) {\n  setQuery(e.target.value);\n  setFilter(e.target.value); // renders 5,000 rows now\n}'
export const CH8_TRANS_CODE =
  'const [isPending, startTransition] = useTransition();\n\nfunction onChange(e) {\n  setQuery(e.target.value);        // urgent: the input\n  startTransition(() => {\n    setFilter(e.target.value);     // can wait: the list\n  });\n}'
export const CH8_DEFER_CODE =
  'const deferred = useDeferredValue(query);\n// HeavyList is wrapped in memo, so it only\n// re-renders when deferred catches up\n<HeavyList query={deferred} />'
export const CH8_SUSPENSE_CODE = '<Post />\n<Suspense fallback={<CommentsSkeleton />}>\n  <Comments postId={id} />\n</Suspense>'
export const CH8_BATCH_CODE = "setTimeout(() => {\n  setCount(c => c + 1);\n  setFlag(f => !f);\n  setLabel('saved');\n}, 1000);"

/* ------------------------------------------------------------------ the clock */

/** One browser frame at 60 Hz. */
export const FRAME_MS = 1000 / 60
export const FRAME_COUNT = 20
/** The track spans the 20-frame strip. */
export const SPAN_MS = FRAME_MS * FRAME_COUNT
export const ROWS = 5000
/** Rendering all 5,000 rows takes this long. */
export const LIST_MS = 180
/** The list is rendered in groups of rows; each group is one component (one unit of work). */
export const ROW_GROUPS = 40
/** When the five letters of "react" arrive (a fast typist). */
export const KEY_TIMES = [8, 38, 68, 98, 128] as const
export const TYPED = 'react'

const COST: Record<string, number> = { Rows: LIST_MS / ROW_GROUPS, App: 0.6, HeavyList: 0.3 }
const HANDLER_MS = 0.3
/** Fibers per transition chunk: one row group (component + its <li>) ≈ 4.5 ms, under React's 5 ms slice. */
const CHUNK_UNITS = 2
const commitCost = (ops: number) => 0.6 + ops * 0.05
const renderCost = (events: readonly ModelEvent[]) => eventsOf(events, 'render').reduce((ms, e) => ms + (COST[e.component] ?? 0.1), 0)

export type Mode = 'blocking' | 'transition'

/** A block on a main-thread track, in ms. */
export interface TrackBlock {
  kind: 'key' | 'urgent' | 'render' | 'slice' | 'gone' | 'commit'
  start: number
  end: number
  /** Letter above a keystroke. */
  label?: string
  /** A keystroke that had to wait for the main thread. */
  waited?: boolean
  /** Text inside a long render block. */
  text?: string
}

/** A value shown on screen from time `t`. */
export interface Shown {
  t: number
  value: string
}

export interface TrackRun {
  blocks: TrackBlock[]
  /** Main-thread tasks [start, end): the browser can only paint between tasks. */
  tasks: [number, number][]
  /** What the input shows, over time. */
  input: Shown[]
  /** Filter the committed list was rendered with, over time. */
  list: Shown[]
  /** When the transition was pending (isPending true), as [start, end). */
  pending: [number, number][]
  /** Number of interrupted (thrown-away) renders. */
  interrupts: number
}

/** The app from the design: an input and a memo'd HeavyList of 5,000 rows. */
function heavyListApp(mode: Mode, groups = ROW_GROUPS) {
  const handler: { type: (value: string) => void } = { type: () => {} }
  const per = ROWS / groups
  const Rows = component('Rows', (p: { filter: string; i: number }) => h('li', null, `rows ${p.i * per + 1}–${(p.i + 1) * per} · "${p.filter}"`))
  const HeavyList = memo(component('HeavyList', (p: { filter: string }) => h('ul', null, ...Array.from({ length: groups }, (_, i) => h(Rows, { key: i, i, filter: p.filter })))))
  const App = component('App', () => {
    const [query, setQuery] = useState('', 'query')
    const [filter, setFilter] = useState('', 'filter')
    let pending = false
    let start: (fn: () => void) => void = (fn) => fn()
    if (mode === 'transition') [pending, start] = useTransition()
    handler.type = (v: string) => {
      setQuery(v, `setQuery('${v}')`)
      start(() => setFilter(v, `setFilter('${v}')`))
    }
    return h('div', null, h('input', { $id: 'input', value: query, 'data-pending': pending }), h(HeavyList, { $id: 'list', filter }))
  })
  const root = createRoot(h(App, { $id: 'app' }))
  root.mount()
  return { root, handler }
}

const filterOf = (root: Root) => /"(.*)"$/.exec(root.dom((f) => f.name === 'li')?.text ?? '')?.[1] ?? ''
const inputOf = (root: Root) => String(root.dom('input')?.attrs.value ?? '')
const isPending = (root: Root) => String(root.dom('input')?.attrs['data-pending'] ?? 'false') === 'true'

/**
 * Type "react" with a clock. Keystrokes are handled when the main thread is free; urgent
 * (SyncLane) renders always finish; transition renders run in ~5 ms chunks and are thrown away
 * when a keystroke arrives in between.
 */
export function simulateTyping(mode: Mode, keyTimes: readonly number[] = KEY_TIMES, text = TYPED): TrackRun {
  const { root, handler } = heavyListApp(mode)
  const run: TrackRun = { blocks: [], tasks: [], input: [{ t: 0, value: '' }], list: [{ t: 0, value: '' }], pending: [], interrupts: 0 }
  let now = 0
  let next = 0
  let attempt: TrackBlock[] = []
  let pendingSince: number | null = null
  let firstRender = true

  const track = () => {
    const p = isPending(root)
    if (p && pendingSince === null) pendingSince = now
    if (!p && pendingSince !== null) {
      run.pending.push([pendingSince, now])
      pendingSince = null
    }
  }
  const commit = (start: number) => {
    const ops = domOpsOf(root.commit()).length
    const end = now + commitCost(ops)
    if (mode === 'transition' || start !== now) run.blocks.push({ kind: 'commit', start: now, end })
    now = end
    const iv = inputOf(root)
    if (iv !== run.input[run.input.length - 1].value) run.input.push({ t: now, value: iv })
    const lv = filterOf(root)
    if (lv !== run.list[run.list.length - 1].value) run.list.push({ t: now, value: lv })
    track()
  }

  for (let guard = 0; guard < 2000; guard++) {
    if (next < text.length && keyTimes[next] <= now) {
      // A keystroke: the handler runs, then React renders the urgent update to completion.
      const at = keyTimes[next]
      const value = text.slice(0, next + 1)
      run.blocks.push({ kind: 'key', start: at, end: at, label: text[next], waited: now - at > FRAME_MS / 2 })
      const start = now
      root.event(`type ${text[next]}`, () => handler.type(value))
      now += HANDLER_MS
      const r = root.render()
      if (eventsOf(r.events, 'interrupt').length) {
        run.interrupts++
        for (const b of attempt) b.kind = 'gone'
      }
      attempt = []
      const cost = renderCost(r.events)
      const heavy = cost > 20
      run.blocks.push(
        heavy
          ? { kind: 'render', start: now, end: now + cost, text: firstRender ? `setFilter → render ${ROWS.toLocaleString('en-US')} rows · ~${Math.round(cost)} ms` : 'again' }
          : { kind: 'urgent', start, end: now + cost + commitCost(1) },
      )
      if (heavy) firstRender = false
      now += cost
      if (heavy) commit(start)
      else {
        // Small urgent commit: drawn as part of the urgent block.
        root.commit()
        now += commitCost(1)
        const iv = inputOf(root)
        if (iv !== run.input[run.input.length - 1].value) run.input.push({ t: now, value: iv })
        track()
      }
      run.tasks.push([start, now])
      next++
      continue
    }
    if (root.pendingLanes & TransitionLane || root.wip) {
      // One transition chunk; React yields to the browser after it.
      const start = now
      const r = root.render({ budget: CHUNK_UNITS })
      const cost = Math.max(0.2, renderCost(r.events))
      const block: TrackBlock = { kind: 'slice', start: now, end: now + cost }
      run.blocks.push(block)
      attempt.push(block)
      now += cost
      if (r.status === 'complete') {
        commit(start)
        attempt = []
      }
      run.tasks.push([start, now])
      continue
    }
    if (next < text.length) now = keyTimes[next]
    else break
  }
  root.flush()
  return run
}

/** A frame is dropped when one task covers it entirely: the browser never got to paint. */
export function droppedFrames(tasks: readonly [number, number][], frames = FRAME_COUNT): boolean[] {
  return Array.from({ length: frames }, (_, k) => {
    const a = k * FRAME_MS
    const b = (k + 1) * FRAME_MS
    return tasks.some(([s, e]) => s <= a && e >= b)
  })
}

const shownAt = (series: readonly Shown[], t: number) => {
  let v = series[0]?.value ?? ''
  for (const s of series) if (s.t <= t) v = s.value
  return v
}

/* ------------------------------------------------------------------ steps */

/** One side (blocking or transition) at the current step. */
export interface Side {
  blocks: TrackBlock[]
  /** Frame k: dropped, ok, or not reached yet. */
  frames: ('dropped' | 'ok' | 'future')[]
  dropped: number
  input: string
  list: string
  pending: boolean
}

export interface Ch8Data {
  /** Playhead in ms. */
  t: number
  /** What has been typed so far. */
  typed: string
  blocking: Side
  transition: Side
}

function side(run: TrackRun, t: number): Side {
  const drops = droppedFrames(run.tasks)
  const frames = drops.map((d, k) => ((k + 1) * FRAME_MS <= t + 0.01 ? (d ? 'dropped' : 'ok') : 'future'))
  return {
    blocks: run.blocks.filter((b) => b.start <= t).map((b) => ({ ...b, end: Math.min(b.end, t) })),
    frames,
    dropped: frames.filter((f) => f === 'dropped').length,
    input: shownAt(run.input, t),
    list: shownAt(run.list, t),
    pending: run.pending.some(([s, e]) => s <= t && t < e),
  }
}

export type Ch8Params = Record<string, never>

const CAPTIONS = [
  "You typed 'r'. With plain setState, React must render all 5,000 rows before the input can show the letter. With a transition, the input updates at once and the list renders in small chunks.",
  "You typed 'e'. On the left the browser is still busy, so the key press waits. On the right React drops the half-done list, updates the input and starts the list again.",
  "You typed 'a' while React was rendering the filtered list. The key press is urgent, so React drops the unfinished list render, updates the input, and starts the list again with the newer text. The old work never shows on screen.",
  "You typed 'c'. Same again: the transition lets the key press go first. On the left, the browser hasn't drawn a single frame since 'r'.",
  "You typed 't', the last letter. Nothing else is coming, so the transition can now run to the end.",
]

/** Chapter 8 trace: idle + one step per letter + the final commit. */
export const ch8Concurrent: Scenario<Ch8Params, Ch8Data> = () => {
  const blocking = simulateTyping('blocking')
  const transition = simulateTyping('transition')
  const at = (t: number): Ch8Data => {
    const typed = TYPED.slice(0, KEY_TIMES.filter((k) => k <= t).length)
    return { t, typed, blocking: side(blocking, t), transition: side(transition, t) }
  }
  const b = stepBuilder<Ch8Data>({
    phase: 'trigger',
    caption: 'We are about to type "react" into both inputs. Press step to send one letter at a time.',
    tree: [],
    preview: { values: {} },
    data: at(0),
  })
  KEY_TIMES.forEach((k, i) => {
    const t = Math.min(SPAN_MS, (KEY_TIMES[i + 1] ?? k + 24) - 2)
    b.step({ phase: i === 0 ? 'trigger' : 'render', activeLine: 6, caption: CAPTIONS[i], data: at(t), loopPhases: ['trigger', 'render'] })
  })
  const end = SPAN_MS
  const last = at(end)
  b.step({
    phase: 'commit',
    activeLine: 0,
    loopPhases: ['trigger', 'render'],
    caption: `The transition finished and React committed the list once, for "${last.transition.list}". Blocking dropped ${last.blocking.dropped} of ${FRAME_COUNT} frames and still shows "${last.blocking.input}"; the transition dropped ${last.transition.dropped}.`,
    data: last,
  })
  return b.build()
}

/* ------------------------------------------------------------------ lanes card */

export interface LaneCard {
  /** SyncLane track. */
  sync: TrackBlock[]
  /** TransitionLane track. */
  lane: TrackBlock[]
  /** Chunks thrown away when the keystroke arrived. */
  thrownAway: number
  /** Chunks rendered after the restart. */
  restarted: number
}

/**
 * "An urgent update interrupts": a 6-chunk transition render; a keystroke arrives during the
 * fifth chunk, React throws the unfinished render away, handles the keystroke on SyncLane and
 * restarts the list. Positions are in % of the card's track (chunks 6% wide, 1% apart).
 */
export function laneInterrupt(groups = 6, keyDuring = 5): LaneCard {
  const { root, handler } = heavyListApp('transition', groups)
  const sync: TrackBlock[] = []
  const lane: TrackBlock[] = []
  let x = 2
  root.event('type r', () => handler.type('r'))
  root.render()
  root.commit()
  let attempt: TrackBlock[] = []
  let thrownAway = 0
  let restarted = 0
  let interrupted = false
  for (let guard = 0; guard < 200; guard++) {
    if (!interrupted && attempt.length === keyDuring) {
      // A keystroke arrives between chunks.
      root.event('type e', () => handler.type('re'))
      const r = root.render()
      root.commit()
      if (eventsOf(r.events, 'interrupt').length) {
        interrupted = true
        for (const b of attempt) b.kind = 'gone'
        thrownAway = attempt.length
        attempt = []
        // The last chunk was cut short.
        const cut = lane[lane.length - 1]
        cut.end -= 0.6
        x = cut.end + 0.6
      }
      sync.push({ kind: 'key', start: x, end: x }, { kind: 'urgent', start: x + 1, end: x + 5 })
      x += 7
      continue
    }
    if (!(root.pendingLanes & TransitionLane) && !root.wip) break
    const r = root.render({ budget: CHUNK_UNITS })
    const worked = eventsOf(r.events, 'render').some((e) => e.component === 'Rows')
    if (r.status === 'complete') {
      if (worked) {
        lane.push({ kind: 'slice', start: x, end: x + 6 })
        x += 7
        if (interrupted) restarted++
      }
      root.commit()
      lane.push({ kind: 'commit', start: x + 1, end: x + 6 })
      break
    }
    if (!worked) continue
    const block: TrackBlock = { kind: 'slice', start: x, end: x + 6 }
    lane.push(block)
    attempt.push(block)
    if (interrupted) restarted++
    x += 7
  }
  return { sync, lane, thrownAway, restarted }
}

/* ------------------------------------------------------------------ batching card */

/**
 * Three setState calls inside a setTimeout. React 18+ batches every update into one render;
 * React 17 only batched inside React event handlers, so outside one each call rendered
 * synchronously (modeled by flushing after each call).
 */
export function batchingRenders(version: 17 | 18): number {
  const set: { count: SetState<number>; flag: SetState<boolean>; label: SetState<string> } = { count: () => {}, flag: () => {}, label: () => {} }
  const App = component('App', () => {
    const [count, setCount] = useState(0, 'count')
    const [flag, setFlag] = useState(false, 'flag')
    const [label, setLabel] = useState('', 'label')
    set.count = setCount
    set.flag = setFlag
    set.label = setLabel
    return h('p', null, `${count} ${flag} ${label}`)
  })
  const root = createRoot(h(App))
  root.mount()
  const calls = [() => set.count((c) => c + 1, 'setCount(c => c + 1)'), () => set.flag((f) => !f, 'setFlag(f => !f)'), () => set.label('saved', "setLabel('saved')")]
  const events: ModelEvent[] = []
  if (version === 18) {
    events.push(...root.act(() => calls.forEach((c) => c())), ...root.flush())
  } else {
    for (const c of calls) events.push(...root.act(c), ...root.flush())
  }
  return eventsOf(events, 'render-start').length
}
