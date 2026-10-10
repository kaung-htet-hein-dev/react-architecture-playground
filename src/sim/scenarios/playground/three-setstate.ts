import { component, createRoot, domOpsOf, eventsOf, h, toTreeNodes, useEffect, useState, type Root } from '../../model'
import type { DomOp, EffectEntry, TreeNode, Update } from '../../types'
import {
  allNodes,
  field,
  flagsText,
  hookRows,
  intParam,
  line,
  pane,
  patchHooks,
  pgBuilder,
  queueRow,
  type PgData,
  type PgInput,
  type PresetDef,
  type TLBlock,
} from './shared'

/**
 * Preset 2 · Three setState calls in one handler. Fully specified by design/Playground.dc.html:
 * idle + 11 steps, ends with count 2, one DOM op, the title effect after paint, and the tree
 * swap at the commit step (9). Params: initial state and the three increments.
 */
export const THREE_SETSTATE_CODE =
  'function Counter() {\n  const [count, setCount] = useState(⟦0⟧);\n\n  useEffect(() => {\n    document.title = `Clicked ${count} times`;\n  }, [count]);\n\n  function handleClick() {\n    setCount(count + ⟦1⟧);\n    setCount(count + ⟦1⟧);\n    setCount(c => c + ⟦1⟧);\n  }\n\n  return <button onClick={handleClick}>Count: {count}</button>;\n}'

const BLOCKS: TLBlock[] = [
  { start: 18, width: 3, kind: 'trigger', title: 'click + handler' },
  { start: 21.4, width: 3.6, kind: 'render', title: 'render' },
  { start: 25.3, width: 1.8, kind: 'reconcile', title: 'diff' },
  { start: 27.4, width: 1.6, kind: 'commit', title: 'commit' },
  { start: 30, width: 3, kind: 'paint', title: 'paint' },
  { start: 34, width: 2, kind: 'commit', title: 'passive effects' },
]
const PLAYHEAD = [10, 18.5, 19.3, 20.1, 20.9, 21.2, 23, 24.6, 26.2, 28.2, 31.5, 35]

const IDLE = "Nothing has run yet. Click the button in the preview, or press step, and we'll go through it one line at a time."

const frameAt = (playhead: number) => `F${Math.floor(playhead / (100 / 6)) + 1}`

function app(init: number, inc: [number, number, number], doc: { title: string }) {
  const Counter = component('Counter', () => {
    const [count, setCount] = useState(init, 'count')
    useEffect(
      () => {
        doc.title = `Clicked ${count} times`
      },
      [count],
      'document.title',
    )
    const handleClick = () => {
      setCount(count + inc[0], `setCount(${count} + ${inc[0]})`)
      setCount(count + inc[1], `setCount(${count} + ${inc[1]})`)
      setCount((c) => c + inc[2], `setCount(c => c + ${inc[2]})`)
    }
    return h('button', { $id: 'button', onClick: handleClick }, 'Count: ', count)
  })
  const App = component('App', () => h(Counter, { $id: 'counter' }))
  return h(App, { $id: 'app' })
}

const snapshot = (root: Root, tree: 'current' | 'wip' = 'current') => toTreeNodes(root, { hostRoot: true, tree })

/** Design `chain(a, b, c, d)`: HostRoot > App > Counter > button with per-node overrides. */
const chain = (base: TreeNode[], a: Partial<TreeNode>, b: Partial<TreeNode>, c: Partial<TreeNode>, d: Partial<TreeNode>) => {
  const by: Record<string, Partial<TreeNode>> = { root: a, app: b, counter: c, button: d }
  return base.map((n) => ({ ...n, ...(by[n.id] ?? {}) }))
}

export function threeSetStateTrace(params: readonly string[]) {
  const init = intParam(params[0], 0)
  const inc: [number, number, number] = [intParam(params[1], 1), intParam(params[2], 1), intParam(params[3], 1)]
  const doc = { title: '' }
  const root = createRoot(app(init, inc, doc))
  root.mount()

  const base = snapshot(root)
  const counterA = root.find('counter')
  const titleBefore = doc.title
  const effectLabel = 'useEffect · document.title'

  const fieldsA = (onScreen: boolean, lanes: string | null) => [
    field('Counter', onScreen ? 'on screen' : 'last frame', 'label'),
    field('memoizedState', `count ${init}`),
    field('lanes', lanes ? `${lanes} (pending)` : 'none', lanes ? 'trigger' : undefined),
    field('alternate', '→ other tree'),
  ]
  const fieldsB = (status: string, state: string, flags: string | null) => [
    field('Counter', status, 'label'),
    field('memoizedState', state),
    field('flags', flags ?? '—', flags ? 'commit' : undefined),
    field('alternate', '→ other tree'),
  ]
  const emptyB = pane('empty', [], fieldsB('not created', '—', null))
  const treeA = (extra: Partial<TreeNode> = {}) => chain(base, {}, {}, { tag: `count ${init}`, ...extra }, {})

  const hooks0 = hookRows(counterA)
  const data = (d: Partial<PgData> & Pick<PgData, 'panes'>): PgData => ({ swapBanner: false, hooks: { counter: hooks0 }, focus: 'counter', queueOf: 'Counter', ...d })

  const b = pgBuilder(BLOCKS, {
    phase: 'trigger',
    caption: IDLE,
    code: THREE_SETSTATE_CODE,
    playhead: PLAYHEAD[0],
    tree: treeA(),
    rootCurrent: 'current',
    queue: [],
    effects: [],
    preview: { values: { count: String(init) }, tabTitle: titleBefore },
    data: data({ panes: [pane('current', treeA(), fieldsA(true, null)), emptyB] }),
  })

  // 1–4 · the click runs handleClick; each setCount lines up an update.
  root.click('button')
  const updates = root.updates.filter((u) => u.component === 'Counter')
  const scheduled = root.pendingLanes !== 0
  const eager = (i: number) => updates[i].status === 'applied'
  const waiting = (n: number, active: number): Update[] =>
    updates.slice(0, n).map((u, i) => queueRow(u, eager(i) ? 'skipped' : 'waiting', eager(i) ? 'same value · bailed out' : 'waiting', i === active))
  const queuedCount = (n: number) => updates.slice(0, n).filter((_, i) => !eager(i)).length
  const lanesA = (n: number) => (queuedCount(n) ? 'SyncLane' : null)
  const pendingHooks = (n: number) => patchHooks(hooks0, { 0: { val: queuedCount(n) ? `${init} · ${queuedCount(n)} queued` : String(init) } })
  const triggerStep = (n: number, lines: { activeLine: number; notes?: Record<number, string>; caption: string; playhead: number }): PgInput => ({
    phase: 'trigger',
    ...lines,
    tree: treeA({ trigger: true }),
    queue: waiting(n, n - 1),
    data: data({ panes: [pane('current', treeA({ trigger: true }), fieldsA(true, lanesA(n))), emptyB], hooks: { counter: pendingHooks(n) } }),
  })

  b.step(
    { ...triggerStep(0, { activeLine: 14, playhead: PLAYHEAD[1], caption: 'You clicked the button. The browser fires a click event, and React calls your onClick handler, handleClick.' }) },
    line('[event]', 'click on <button> → handleClick()', 'trigger'),
  )
  b.step(
    triggerStep(1, {
      activeLine: 9,
      notes: { 9: `← count is ${init}` },
      playhead: PLAYHEAD[2],
      caption: eager(0)
        ? `setCount(${init} + ${inc[0]}) asks for the value count already has, so React drops it right away without scheduling a render.`
        : `setCount doesn't change count. It adds an update to Counter's queue and asks React to schedule a render. count is still ${init} in this handler.`,
    }),
  )
  b.step(
    triggerStep(2, {
      activeLine: 10,
      notes: { 10: `← count is ${init}` },
      playhead: PLAYHEAD[3],
      caption: `Same line again with the same captured count, so the second update also says 'set it to ${init} + ${inc[1]}'. It waits behind the first.`,
    }),
  )
  b.step(
    triggerStep(3, {
      activeLine: 11,
      notes: { 11: '← c is filled in later' },
      playhead: PLAYHEAD[4],
      caption: 'This one passes a function. React will call it with whatever the state is at that point in the queue, not the count this handler saw.',
    }),
  )

  if (!scheduled) {
    // Every update computed the same state: React bails out before rendering.
    b.step(
      {
        phase: 'trigger',
        activeLine: 12,
        playhead: PLAYHEAD[5],
        tree: treeA(),
        queue: waiting(3, -1),
        caption: `The handler returns. Every update produced count ${init} again, so React bailed out early: there is nothing to render, commit or paint.`,
        data: data({ panes: [pane('current', treeA(), fieldsA(true, null)), emptyB] }),
      },
      line('[schedule]', 'same state → no render', 'trigger'),
    )
    return b.build()
  }

  b.step(
    { ...triggerStep(3, { activeLine: 12, playhead: PLAYHEAD[5], caption: 'The handler returns. Three updates, one render: React batches every update from the same event into a single pass.' }), queue: waiting(3, -1) },
    line('[schedule]', `${queuedCount(3)} update${queuedCount(3) === 1 ? '' : 's'} batched → 1 render (SyncLane)`, 'trigger'),
  )

  // 6–8 · render: Counter runs through the queue, returns the button, React diffs it.
  const r = root.render()
  const processed = eventsOf(r.events, 'update-processed').filter((e) => e.fiberId === 'counter')
  const resultOf = (id: string) => processed.find((e) => e.updateId === id)?.result
  const counterB = root.find('counter', 'wip')
  const final = (counterB?.memoizedState?.memoizedState as number | undefined) ?? init
  const changed = final !== init
  const wipBase = snapshot(root, 'wip')
  const bailApp = eventsOf(r.events, 'bailout').some((e) => e.fiberId === 'app')
  const textChanges = eventsOf(r.events, 'complete').filter((e) => !e.created && e.changes.length)
  const applied = (status: 'processing' | 'applied' | 'cleared'): Update[] =>
    updates.map((u) =>
      queueRow(u, status, status === 'cleared' ? 'applied · cleared' : `applied → ${String(resultOf(u.id) ?? u.result)}`),
    )
  const treeB = (button: Partial<TreeNode>, swapped = false) =>
    chain(
      wipBase,
      { state: swapped ? 'idle' : 'skip', tag: swapped ? '' : 'cloned' },
      { state: swapped ? 'idle' : 'skip', tag: swapped ? '' : bailApp ? 'bailout' : '' },
      { state: swapped ? 'idle' : 'render', tag: `count ${final}` },
      button,
    )
  const [r1, r2] = updates.map((u) => String(resultOf(u.id)))
  const queueStory = `${r1}, then ${r2}${r1 === r2 ? ' again' : ''}, then the updater adds ${inc[2] === 1 ? 'one' : inc[2]}`
  const effectHooks = (deps: string, tone: 'commit' | undefined, hot = false) =>
    patchHooks(hooks0, { 1: { val: deps, ...(tone ? { tone } : {}), ...(hot ? { hot } : {}) } })
  const renderHooks = patchHooks(effectHooks(changed ? `deps [${init}] → [${final}] · changed` : `deps [${init}] · unchanged`, changed ? 'commit' : undefined), {
    0: { val: `${init} → ${final} · this render`, tone: 'render', hot: true },
  })
  const effect = (status: EffectEntry['status'], detail: string): EffectEntry[] =>
    changed ? [{ id: 'title', kind: 'passive', component: 'Counter', label: effectLabel, deps: '[count]', status, detail }] : []
  const panesRender = (button: Partial<TreeNode>, flags: string | null): PgData['panes'] => [
    pane('current', treeA(), fieldsA(true, 'SyncLane')),
    pane('wip', treeB(button), fieldsB('being built', `count ${final}`, flags)),
  ]

  b.step(
    {
      phase: 'render',
      activeLine: 2,
      notes: { 2: `← count = ${final}` },
      playhead: PLAYHEAD[6],
      tree: treeA(),
      wipTree: treeB({ state: 'pending' }),
      queue: applied('processing'),
      effects: effect('waiting', 'waiting for paint'),
      caption: `React calls Counter again. useState works through the queue in order: ${queueStory}. This render sees count = ${final}.`,
      data: data({ panes: panesRender({ state: 'pending' }, null), hooks: { counter: renderHooks } }),
    },
    line('[render]', `Counter · count = ${final}`, 'render'),
  )
  b.step({
    phase: 'render',
    activeLine: 14,
    playhead: PLAYHEAD[7],
    wipTree: treeB({ state: changed ? 'render' : 'skip' }),
    queue: applied('applied'),
    caption: changed
      ? 'Counter returns a new element for the button. Nothing on screen has changed; React is still building the work-in-progress tree.'
      : `count is ${final} again, the same value as before, so React throws away what Counter returned and keeps the old button.`,
    data: data({ panes: panesRender({ state: changed ? 'render' : 'skip' }, null), hooks: { counter: renderHooks } }),
  })
  b.step(
    {
      phase: 'reconcile',
      activeLine: 14,
      playhead: PLAYHEAD[8],
      wipTree: treeB({ state: changed ? 'reconcile' : 'skip' }),
      caption: changed
        ? 'React compares the new button with the current one. Same type, same props apart from the text, so it marks one text update.'
        : 'Nothing to compare: no element changed, so React marks no updates.',
      data: data({ panes: panesRender({ state: changed ? 'reconcile' : 'skip' }, flagsText(counterB)), hooks: { counter: renderHooks } }),
    },
    line('[reconcile]', textChanges.length ? `${textChanges.length} change${textChanges.length === 1 ? '' : 's'}: text of <button>` : 'no changes', 'reconcile'),
  )

  // 9 · commit: the DOM write, then root.current moves to the finished tree.
  const committed = root.commit()
  const ops: DomOp[] = domOpsOf(committed).map((o) => (o.kind === 'setText' ? { ...o, text: `text.nodeValue = "Count: ${o.value}"` } : o))
  const swappedA = allNodes(treeA(), { state: 'skip', trigger: false })
  const doneHooks = patchHooks(effectHooks(changed ? `deps [${init}] → [${final}] · changed` : `deps [${init}] · unchanged`, changed ? 'commit' : undefined), {
    0: { val: String(final) },
  })
  const panesDone = (button: Partial<TreeNode>): PgData['panes'] => [
    pane('alternate', swappedA, fieldsA(false, null)),
    pane('current', treeB(button, true), fieldsB('on screen', `count ${final}`, flagsText(counterB))),
  ]
  b.step(
    {
      phase: 'commit',
      activeLine: 14,
      playhead: PLAYHEAD[9],
      tree: swappedA,
      wipTree: treeB({ state: ops.length ? 'dom' : 'idle' }, true),
      rootCurrent: 'wip',
      domOps: ops,
      queue: applied('cleared'),
      preview: { values: { count: String(final) }, tabTitle: titleBefore, highlight: ops.length ? ['count'] : [] },
      caption: ops.length
        ? 'Commit. React writes the one change to the real DOM, then points root.current at the work-in-progress tree. The two trees have swapped roles.'
        : 'Commit. There is nothing to write to the DOM, but React still points root.current at the work-in-progress tree. The two trees have swapped roles.',
      data: data({ panes: panesDone({ state: ops.length ? 'dom' : 'idle' }), swapBanner: true, hooks: { counter: doneHooks } }),
    },
    line('[commit]', `${ops.length} DOM operation${ops.length === 1 ? '' : 's'} · root.current swapped`, 'commit'),
  )

  // 10 · paint.
  root.paint()
  b.step(
    {
      phase: 'commit',
      playhead: PLAYHEAD[10],
      wipTree: treeB({ state: 'idle' }, true),
      preview: { values: { count: String(final) }, tabTitle: titleBefore },
      effects: effect('scheduled', 'running next'),
      caption: `The browser paints the new frame. This is the first moment you can actually see ${final}.`,
      data: data({ panes: panesDone({ state: 'idle' }), swapBanner: true, hooks: { counter: doneHooks } }),
    },
    line('[paint]', `frame ${frameAt(PLAYHEAD[10])} painted`, 'commit'),
  )

  // 11 · passive effects after paint.
  const passive = root.flushPassiveEffects()
  const ran = eventsOf(passive, 'effect').some((e) => e.action === 'run' && e.label === 'document.title')
  b.step(
    {
      phase: 'commit',
      activeLine: ran ? 5 : 6,
      notes: ran ? { 5: '← title updated' } : { 6: '← deps unchanged' },
      playhead: PLAYHEAD[11],
      preview: { values: { count: String(final) }, tabTitle: doc.title },
      effects: effect('ran', 'ran after paint'),
      caption: ran
        ? `After paint, React runs passive effects whose dependencies changed. count went from ${init} to ${final}, so the title effect runs.`
        : `After paint, React checks passive effects. count is still ${final}, so the title effect is skipped.`,
      data: data({
        panes: panesDone({ state: 'idle' }),
        swapBanner: true,
        hooks: { counter: patchHooks(doneHooks, { 1: ran ? { val: `deps [${final}] · ran`, tone: 'commit', hot: true } : { val: `deps [${final}] · skipped` } }) },
      }),
    },
    ran ? line('[effect]', `document.title = "${doc.title}"`, 'commit') : line('[effect]', 'title effect skipped: deps unchanged', 'commit'),
  )
  return b.build()
}

export const threeSetState: PresetDef = {
  id: 'three-setstate',
  label: 'Three setState calls in one handler',
  file: 'Counter.jsx',
  code: THREE_SETSTATE_CODE,
  paramNote: 'Highlighted values are editable: initial state and each increment.',
  previewHint: 'click the button',
  colWidth: 132,
  scenario: threeSetStateTrace,
}
