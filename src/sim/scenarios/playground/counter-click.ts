import { component, createRoot, domOpsOf, eventsOf, h, toTreeNodes, useState, type Root } from '../../model'
import type { DomOp, TreeNode } from '../../types'
import { allNodes, field, flagsText, hookRows, intParam, line, pane, patchHooks, pgBuilder, queueRow, withNodes, type PgData, type PresetDef, type TLBlock } from './shared'

/**
 * Preset 1 · Counter click: one setState, one render, one DOM write. Params: initial state and
 * the increment.
 */
export const COUNTER_CLICK_CODE =
  'function Counter() {\n  const [count, setCount] = useState(⟦0⟧);\n\n  function handleClick() {\n    setCount(count + ⟦1⟧);\n  }\n\n  return <button onClick={handleClick}>Count: {count}</button>;\n}'

const BLOCKS: TLBlock[] = [
  { start: 18, width: 3, kind: 'trigger', title: 'click + handler' },
  { start: 21.4, width: 3, kind: 'render', title: 'render' },
  { start: 24.7, width: 1.8, kind: 'reconcile', title: 'diff' },
  { start: 26.8, width: 1.6, kind: 'commit', title: 'commit' },
  { start: 30, width: 3, kind: 'paint', title: 'paint' },
]
const PLAYHEAD = [10, 18.6, 20.4, 22.6, 24, 25.8, 28.2, 31.5]

function app(init: number, inc: number) {
  const Counter = component('Counter', () => {
    const [count, setCount] = useState(init, 'count')
    const handleClick = () => setCount(count + inc, `setCount(${count} + ${inc})`)
    return h('button', { $id: 'button', onClick: handleClick }, 'Count: ', count)
  })
  const App = component('App', () => h(Counter, { $id: 'counter' }))
  return h(App, { $id: 'app' })
}

const snapshot = (root: Root, tree: 'current' | 'wip' = 'current') => toTreeNodes(root, { hostRoot: true, tree })

export function counterClickTrace(params: readonly string[]) {
  const init = intParam(params[0], 0)
  const inc = intParam(params[1], 1)
  const root = createRoot(app(init, inc))
  root.mount()
  const base = snapshot(root)
  const hooks0 = hookRows(root.find('counter'))
  const treeA = (counter: Partial<TreeNode> = {}) => withNodes(base, { counter: { tag: `count ${init}`, ...counter } })
  const fieldsA = (onScreen: boolean, lanes: boolean) => [
    field('Counter', onScreen ? 'on screen' : 'last frame', 'label'),
    field('memoizedState', `count ${init}`),
    field('lanes', lanes ? 'SyncLane (pending)' : 'none', lanes ? 'trigger' : undefined),
    field('alternate', '→ other tree'),
  ]
  const fieldsB = (status: string, state: string, flags: string) => [
    field('Counter', status, 'label'),
    field('memoizedState', state),
    field('flags', flags, flags !== '—' ? 'commit' : undefined),
    field('alternate', '→ other tree'),
  ]
  const emptyB = pane('empty', [], fieldsB('not created', '—', '—'))
  const data = (d: Partial<PgData> & Pick<PgData, 'panes'>): PgData => ({ swapBanner: false, hooks: { counter: hooks0 }, focus: 'counter', queueOf: 'Counter', ...d })

  const b = pgBuilder(BLOCKS, {
    phase: 'trigger',
    caption: "Nothing has run yet. Click the button in the preview, or press step, and we'll follow one click through all four phases.",
    code: COUNTER_CLICK_CODE,
    playhead: PLAYHEAD[0],
    tree: treeA(),
    rootCurrent: 'current',
    queue: [],
    effects: [],
    preview: { values: { count: String(init) } },
    data: data({ panes: [pane('current', treeA(), fieldsA(true, false)), emptyB] }),
  })

  root.click('button')
  const [u] = root.updates
  const scheduled = root.pendingLanes !== 0
  b.step(
    {
      phase: 'trigger',
      activeLine: 8,
      playhead: PLAYHEAD[1],
      tree: treeA({ trigger: true }),
      caption: 'You clicked the button. The browser fires a click event, and React calls your onClick handler, handleClick.',
      data: data({ panes: [pane('current', treeA({ trigger: true }), fieldsA(true, false)), emptyB] }),
    },
    line('[event]', 'click on <button> → handleClick()', 'trigger'),
  )
  if (!scheduled) {
    b.step(
      {
        phase: 'trigger',
        activeLine: 5,
        notes: { 5: `← still ${init}` },
        playhead: PLAYHEAD[2],
        tree: treeA(),
        queue: [queueRow(u, 'skipped', 'same value · bailed out', true)],
        caption: `setCount(${init} + ${inc}) asks for the value count already has. React compares with Object.is, sees nothing changed, and skips the render entirely.`,
        data: data({ panes: [pane('current', treeA(), fieldsA(true, false)), emptyB] }),
      },
      line('[schedule]', 'same state → no render', 'trigger'),
    )
    return b.build()
  }
  b.step(
    {
      phase: 'trigger',
      activeLine: 5,
      notes: { 5: `← count is ${init}` },
      playhead: PLAYHEAD[2],
      queue: [queueRow(u, 'waiting', 'waiting', true)],
      caption: "setCount doesn't change count. It adds an update to Counter's queue and asks React to schedule a render on SyncLane, the lane for clicks.",
      data: data({ panes: [pane('current', treeA({ trigger: true }), fieldsA(true, true)), emptyB], hooks: { counter: patchHooks(hooks0, { 0: { val: `${init} · 1 queued` } }) } }),
    },
    line('[schedule]', `${u.text} → 1 render (SyncLane)`, 'trigger'),
  )

  const r = root.render()
  const final = eventsOf(r.events, 'update-processed')[0]?.result as number
  const wipBase = snapshot(root, 'wip')
  const counterB = root.find('counter', 'wip')
  const treeB = (button: Partial<TreeNode>, done = false) =>
    withNodes(wipBase, {
      root: done ? {} : { state: 'skip', tag: 'cloned' },
      app: done ? {} : { state: 'skip', tag: 'bailout' },
      counter: { state: done ? 'idle' : 'render', tag: `count ${final}` },
      button,
    })
  const renderHooks = patchHooks(hooks0, { 0: { val: `${init} → ${final} · this render`, tone: 'render', hot: true } })
  const renderPanes = (button: Partial<TreeNode>, flags = '—'): PgData['panes'] => [
    pane('current', treeA(), fieldsA(true, true)),
    pane('wip', treeB(button), fieldsB('being built', `count ${final}`, flags)),
  ]
  b.step(
    {
      phase: 'render',
      activeLine: 2,
      notes: { 2: `← count = ${final}` },
      playhead: PLAYHEAD[3],
      tree: treeA(),
      wipTree: treeB({ state: 'pending' }),
      queue: [queueRow(u, 'processing', `applied → ${final}`)],
      caption: `React calls Counter again, building a work-in-progress copy of its fiber. useState applies the queued update, so this render sees count = ${final}.`,
      data: data({ panes: renderPanes({ state: 'pending' }), hooks: { counter: renderHooks } }),
    },
    line('[render]', `Counter · count = ${final}`, 'render'),
  )
  b.step({
    phase: 'render',
    activeLine: 8,
    playhead: PLAYHEAD[4],
    wipTree: treeB({ state: 'render' }),
    queue: [queueRow(u, 'applied', `applied → ${final}`)],
    caption: 'Counter returns a new element for the button. Nothing on screen has changed yet; React is still building the work-in-progress tree.',
    data: data({ panes: renderPanes({ state: 'render' }), hooks: { counter: renderHooks } }),
  })
  b.step(
    {
      phase: 'reconcile',
      activeLine: 8,
      playhead: PLAYHEAD[5],
      wipTree: treeB({ state: 'reconcile' }),
      caption: 'React compares the new button with the current one. Same type and same props, only the text differs, so it marks one text update.',
      data: data({ panes: renderPanes({ state: 'reconcile' }, flagsText(counterB)), hooks: { counter: renderHooks } }),
    },
    line('[reconcile]', '1 change: text of <button>', 'reconcile'),
  )

  const ops: DomOp[] = domOpsOf(root.commit()).map((o) => (o.kind === 'setText' ? { ...o, text: `text.nodeValue = "Count: ${o.value}"` } : o))
  const oldA = allNodes(treeA(), { state: 'skip', trigger: false })
  const donePanes = (button: Partial<TreeNode>): PgData['panes'] => [
    pane('alternate', oldA, fieldsA(false, false)),
    pane('current', treeB(button, true), fieldsB('on screen', `count ${final}`, flagsText(counterB))),
  ]
  const doneHooks = patchHooks(hooks0, { 0: { val: String(final) } })
  b.step(
    {
      phase: 'commit',
      activeLine: 8,
      playhead: PLAYHEAD[6],
      tree: oldA,
      wipTree: treeB({ state: 'dom' }, true),
      rootCurrent: 'wip',
      domOps: ops,
      queue: [queueRow(u, 'cleared', 'applied · cleared')],
      preview: { values: { count: String(final) }, highlight: ['count'] },
      caption: 'Commit. React writes the one text change to the real DOM, then points root.current at the work-in-progress tree. The two trees swap roles.',
      data: data({ panes: donePanes({ state: 'dom' }), swapBanner: true, hooks: { counter: doneHooks } }),
    },
    line('[commit]', `${ops.length} DOM operation${ops.length === 1 ? '' : 's'} · root.current swapped`, 'commit'),
  )
  root.paint()
  b.step(
    {
      phase: 'commit',
      playhead: PLAYHEAD[7],
      wipTree: treeB({ state: 'idle' }, true),
      preview: { values: { count: String(final) } },
      caption: `The browser paints the frame and you see ${final}. One click, one render of Counter, one text write: that is the whole loop.`,
      data: data({ panes: donePanes({ state: 'idle' }), swapBanner: true, hooks: { counter: doneHooks } }),
    },
    line('[paint]', 'frame F2 painted', 'commit'),
  )
  return b.build()
}

export const counterClick: PresetDef = {
  id: 'counter-click',
  label: 'Counter click',
  file: 'Counter.jsx',
  code: COUNTER_CLICK_CODE,
  paramNote: 'Highlighted values are editable: initial state and the increment.',
  previewHint: 'click the button',
  colWidth: 132,
  scenario: counterClickTrace,
}
