import {
  component,
  createRoot,
  domOpsOf,
  eventsOf,
  h,
  stepBuilder,
  summarizePass,
  toTreeNodes,
  useState,
  type ModelEvent,
  type Root,
} from '../model'
import type { Block, LogEntry, Scenario, StepPhase, TreeNode } from '../types'

/**
 * Chapter 1 · One click, slowed down. Copy from design/Render Commit Repeat.dc.html `ch1()`.
 * `variant: 'error'` swaps in `onClick={setCount(count + 1)}`, which loops in render.
 */
export interface Ch1Params {
  variant: 'ok' | 'error'
}

export const CH1_CODE =
  'function Counter() {\n  const [count, setCount] = useState(0);\n\n  return (\n    <div>\n      <button onClick={() => setCount(count + 1)}>+1</button>\n      <p>Count: {count}</p>\n    </div>\n  );\n}'

export const CH1_ERROR_CODE = CH1_CODE.replace('{() => setCount(count + 1)}', '{setCount(count + 1)}')

/** "From event to pixel": one 16.7ms frame. */
export const CH1_FRAME: Block[] = [
  { kind: 'trigger', width: 7, label: 'event' },
  { kind: 'render', width: 18, label: 'render Counter' },
  { kind: 'reconcile', width: 10, label: 'compare' },
  { kind: 'commit', width: 10, label: 'commit' },
  { kind: 'idle', label: 'browser is free' },
  { kind: 'paint', width: 16, label: 'paint' },
]

const IDLE_CAPTION = "Nothing has happened yet. Click +1 in the preview, or press step, and we'll follow that click all the way to the screen."

/** The app from the design: App > Header, Counter > div > button, p. */
function counterApp(buggy: boolean) {
  const Header = component('Header', () => h('header', null))
  const Counter = component('Counter', () => {
    const [count, setCount] = useState(0, 'count')
    const onClick = buggy ? setCount(count + 1) : () => setCount(count + 1)
    return h('div', { $id: 'div' }, h('button', { $id: 'button', onClick }, '+1'), h('p', { $id: 'p' }, 'Count: ', count))
  })
  const App = component('App', () => [h(Header, { $id: 'header' }), h(Counter, { $id: 'counter' })])
  return h(App, { $id: 'app' })
}

const tree = (root: Root, nodes: Record<string, Partial<TreeNode>> = {}) => toTreeNodes(root, { collapse: ['header'], nodes })

/** The number in <p>: its second text node. */
const shownCount = (root: Root) => root.dom('p')?.children[1]?.text ?? ''

const treeNote = (rendered: number, dom: number) =>
  `${rendered} rendered${dom ? ` · ${dom} DOM change${dom === 1 ? '' : 's'}` : ''}`

function okTrace() {
  const root = createRoot(counterApp(false))
  root.mount()
  const idleTree = tree(root)
  const b = stepBuilder({
    phase: 'trigger',
    caption: IDLE_CAPTION,
    code: CH1_CODE,
    tree: idleTree,
    treeNote: 'nothing scheduled',
    preview: { values: { count: shownCount(root) } },
    timeline: { playhead: 0, blocks: CH1_FRAME },
    loopPhases: [],
  })

  const at = (playhead: number) => ({ playhead, blocks: CH1_FRAME })
  const row = (text: string, tone: LogEntry['tone']): LogEntry => ({ text, tone })

  // 1 · click: the browser event runs the handler, which queues an update.
  const click = root.click('button')
  const queued = eventsOf(click, 'update-queued')[0]
  b.step({ phase: 'trigger', activeLine: 6, timeline: at(3), log: row('click on <button> → onClick()', 'trigger'), caption: 'You clicked the button. The browser fires a click event, and React calls your onClick handler.' })

  // 2 · setCount(1) queues an update on Counter.
  b.step({
    phase: 'trigger',
    activeLine: 6,
    timeline: at(6.5),
    tree: tree(root, { counter: { trigger: true, tag: 'state' } }),
    treeNote: '1 update queued',
    log: row(`${queued.text} → queue update on ${queued.component}`, 'trigger'),
    caption: "setCount doesn't change count right away. It adds an update to Counter's queue and asks React to render again soon.",
  })

  // Render + commit through the model; the remaining steps read its events.
  const rendered = root.render()
  const renderEvents: ModelEvent[] = rendered.events
  const pass = summarizePass(renderEvents)
  const counterRender = eventsOf(renderEvents, 'update-processed').find((e) => e.fiberId === 'counter')
  const order = pass.order
  const orderOf = (id: string, fallback: number) => order[id] ?? fallback
  const renderTree = (extra: Record<string, Partial<TreeNode>> = {}) =>
    tree(root, {
      counter: { state: 'render', tag: 'state', order: orderOf('counter', 1) },
      div: { order: 2 },
      button: { order: 3 },
      p: { order: 4 },
      ...extra,
    })

  // 3 · React calls Counter; useState returns the queued value.
  b.step({
    phase: 'render',
    activeLine: 2,
    timeline: at(14),
    tree: tree(root, { counter: { state: 'render', tag: 'state', order: orderOf('counter', 1) } }),
    treeNote: treeNote(pass.rendered.length, 0),
    log: row(`call Counter() → count is ${String(counterRender?.result)}`, 'render'),
    caption: 'React called Counter again. useState returned 1, the value from the queued update.',
  })

  // 4 · Counter returns elements: div with button and p.
  b.step({ phase: 'render', activeLine: 7, timeline: at(24), tree: renderTree(), log: row('returns <div> with <button> and <p>', 'render'), caption: 'Counter returned a new description: a <div> with the <button> and the <p>. Nothing on screen has changed yet.' })

  // 5 · Reconcile: only the text inside <p> differs.
  const diff = eventsOf(renderEvents, 'complete').find((e) => !e.created && e.changes.length)
  const before = 'Count: ' + (diff?.changes[0].prev ?? '')
  const after = 'Count: ' + (diff?.changes[0].next ?? '')
  b.step({ phase: 'reconcile', activeLine: 7, timeline: at(30), tree: renderTree({ p: { state: 'reconcile', order: 4 } }), log: row(`diff <p>: "${before}" → "${after}"`, 'reconcile'), caption: 'React compared the new <p> with the old one and found one text change.' })

  // 6 · Commit: one DOM write.
  const commit = root.commit()
  const ops = domOpsOf(commit)
  const write = ops[0]
  b.step({
    phase: 'commit',
    activeLine: 7,
    notes: { 7: '← text changes here' },
    timeline: at(44),
    tree: renderTree({ p: { state: 'dom', order: 4 } }),
    treeNote: treeNote(pass.rendered.length, ops.length),
    preview: { values: { count: shownCount(root) }, highlight: ['count'] },
    domOps: ops,
    log: row(`p.firstChild.nodeValue = "${write?.value ?? ''}"`, 'commit'),
    caption: 'React found one difference, the text inside <p>, so the commit makes just one DOM change. The <button> and the <div> are not touched.',
  })

  // 7 · The browser paints.
  root.paint()
  b.step({
    phase: 'paint',
    loopPhases: ['commit'],
    timeline: at(100),
    preview: { values: { count: shownCount(root) } },
    log: row('browser paints the frame', 'paint'),
    caption: "That's the whole loop: one click, one render of Counter, one text change, one new frame on screen. Each chapter after this looks closer at one of these steps.",
  })
  root.flush()
  return b.build()
}

function errorTrace() {
  // Same structure as the working app, for the idle frame before anything runs.
  const okRoot = createRoot(counterApp(false))
  okRoot.mount()
  const idleTree = tree(okRoot)

  const root = createRoot(counterApp(true))
  const events = root.mount()
  const err = eventsOf(events, 'error')[0]
  const renders = err?.renders ?? 0
  const queuedInRender = eventsOf(events, 'update-queued').filter((e) => e.duringRender)
  const notes = { 6: '← called during render' }
  const stuck = (extra: Partial<TreeNode> = {}) =>
    idleTree.map((n) => (n.id === 'counter' ? { ...n, state: 'render' as const, tag: 'state', ...extra } : n))

  const b = stepBuilder({
    phase: 'trigger',
    caption: IDLE_CAPTION,
    code: CH1_ERROR_CODE,
    tree: idleTree,
    treeNote: 'nothing scheduled',
    preview: { values: { count: '0' } },
    timeline: { playhead: 0, blocks: CH1_FRAME },
    loopPhases: [],
  })
  const phase: StepPhase = 'render'
  b.step({
    phase,
    activeLine: 6,
    notes,
    tree: stuck({ order: 1 }),
    treeNote: 'render 1',
    timeline: { playhead: 10, blocks: CH1_FRAME },
    log: { text: `call Counter() → runs ${queuedInRender[0]?.text ?? 'setCount(1)'} now`, tone: 'render' },
    caption: 'React calls Counter to render it. onClick={setCount(count + 1)} calls setCount right away, while Counter is still rendering.',
  })
  b.step({
    phase,
    activeLine: 6,
    notes,
    tree: stuck({ tag: 'render ×2' }),
    treeNote: 'render 2',
    timeline: { playhead: 12, blocks: CH1_FRAME },
    log: { text: 'update queued during render → render again', tone: 'render' },
    caption: 'setCount ran during render. That asked for another render, which ran setCount again.',
  })
  b.step({
    phase,
    activeLine: 6,
    notes,
    tree: stuck({ tag: `render ×${renders}` }),
    treeNote: `render ${renders}`,
    timeline: { playhead: 14, blocks: CH1_FRAME },
    log: { text: `… ${renders - 2} more renders, no commit`, tone: 'render' },
    caption: 'Every render adds one more update, so React keeps calling Counter and never gets to compare or commit anything.',
  })
  b.step({
    phase,
    status: 'error',
    errorLine: err ? 6 : 0,
    notes,
    tree: idleTree.map((n) => (n.id === err?.fiberId ? { ...n, state: 'error' as const, tag: `render ×${renders}` } : n)),
    treeNote: 'stuck in render',
    timeline: { playhead: 14, blocks: CH1_FRAME },
    preview: { values: { count: '0' }, error: { title: 'Uncaught Error', message: err?.message ?? '' } },
    log: { text: `Error: ${err?.message.split('.')[0] ?? ''}.`, tone: 'error' },
    caption: 'onClick={setCount(count + 1)} calls setCount while Counter is rendering, which asks for another render, which calls it again. Pass a function so it only runs on click: onClick={() => setCount(count + 1)}.',
  })
  return b.build()
}

/** Chapter 1 trace: idle + 7 steps, or idle + 4 steps ending in the "Too many re-renders" error. */
export const ch1Counter: Scenario<Ch1Params> = ({ variant }) => (variant === 'error' ? errorTrace() : okTrace())
