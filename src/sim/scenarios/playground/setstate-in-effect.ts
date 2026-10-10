import { component, createRoot, domOpsOf, eventsOf, h, toTreeNodes, useEffect, useState, type Root } from '../../model'
import type { EffectEntry, TreeNode, Update } from '../../types'
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
  withNodes,
  type PgData,
  type PgField,
  type PresetDef,
  type TLBlock,
} from './shared'

/**
 * Preset 3 · setState inside useEffect. The effect copies derived state after paint, so one
 * click costs two renders, two commits and two paints, and the first paint shows a stale value.
 */
export const SETSTATE_IN_EFFECT_CODE =
  'function Counter() {\n  const [count, setCount] = useState(⟦0⟧);\n  const [doubled, setDoubled] = useState(0);\n\n  useEffect(() => {\n    setDoubled(count * 2);\n  }, [count]);\n\n  return (\n    <button onClick={() => setCount(count + ⟦1⟧)}>\n      {count} × 2 = {doubled}\n    </button>\n  );\n}'

const BLOCKS: TLBlock[] = [
  { start: 18, width: 3, kind: 'trigger', title: 'click + handler' },
  { start: 21.4, width: 3, kind: 'render', title: 'render 1' },
  { start: 24.6, width: 1.6, kind: 'reconcile', title: 'diff' },
  { start: 26.4, width: 1.6, kind: 'commit', title: 'commit 1' },
  { start: 30, width: 3, kind: 'paint', title: 'paint (stale)' },
  { start: 34, width: 1.8, kind: 'commit', title: 'passive effect: setDoubled' },
  { start: 36.2, width: 3, kind: 'render', title: 'render 2' },
  { start: 39.4, width: 1.6, kind: 'reconcile', title: 'diff' },
  { start: 41.2, width: 1.6, kind: 'commit', title: 'commit 2' },
  { start: 46.6, width: 3, kind: 'paint', title: 'paint' },
]
const PLAYHEAD = [10, 18.6, 20.6, 23, 25.6, 27.8, 31.5, 35, 37.8, 40.4, 42.6, 48]

function app(init: number, inc: number) {
  const Counter = component('Counter', () => {
    const [count, setCount] = useState(init, 'count')
    const [doubled, setDoubled] = useState(0, 'doubled')
    useEffect(() => setDoubled(count * 2, `setDoubled(${count} * 2)`), [count], 'setDoubled')
    return h('button', { $id: 'button', onClick: () => setCount(count + inc, `setCount(${count} + ${inc})`) }, count, ' × 2 = ', doubled)
  })
  const App = component('App', () => h(Counter, { $id: 'counter' }))
  return h(App, { $id: 'app' })
}

const snapshot = (root: Root, tree: 'current' | 'wip' = 'current') => toTreeNodes(root, { hostRoot: true, tree })
const state = (root: Root, tree: 'current' | 'wip' = 'current') => {
  const hk = root.find('counter', tree)?.memoizedState
  return { count: hk?.memoizedState as number, doubled: hk?.next?.memoizedState as number }
}

export function setStateInEffectTrace(params: readonly string[]) {
  const init = intParam(params[0], 0)
  const inc = intParam(params[1], 1)
  const root = createRoot(app(init, inc))
  root.mount()
  const s0 = state(root)
  const base = snapshot(root)
  const tagOf = (s: { count: number; doubled: number }) => `${s.count} · ${s.doubled}`
  const fields = (status: string, s: { count: number; doubled: number } | null, extra: PgField): PgField[] => [
    field('Counter', status, 'label'),
    field('memoizedState', s ? `count ${s.count} → doubled ${s.doubled}` : '—'),
    extra,
    field('alternate', '→ other tree'),
  ]
  const lanes = (l: string | null) => field('lanes', l ? `${l} (pending)` : 'none', l ? 'trigger' : undefined)
  const flags = (f: string | null) => field('flags', f ?? '—', f && f !== '—' ? 'commit' : undefined)
  const data = (d: Partial<PgData> & Pick<PgData, 'panes'>): PgData => ({
    swapBanner: false,
    hooks: { counter: hookRows(root.find('counter')) },
    focus: 'counter',
    queueOf: 'Counter',
    ...d,
  })
  const preview = (s: { count: number; doubled: number }, extra: Record<string, boolean | readonly string[]> = {}) => ({
    values: { count: String(s.count), doubled: String(s.doubled), ...(extra.stale ? { stale: true } : {}) },
    ...(extra.highlight ? { highlight: extra.highlight as readonly string[] } : {}),
  })
  const treeA0 = withNodes(base, { counter: { tag: tagOf(s0) } })
  const emptyB = pane('empty', [], fields('not created', null, flags(null)))
  const effectRow = (status: EffectEntry['status'], detail: string): EffectEntry[] => [
    { id: 'sync', kind: 'passive', component: 'Counter', label: 'useEffect · setDoubled', deps: '[count]', status, detail },
  ]

  const b = pgBuilder(BLOCKS, {
    phase: 'trigger',
    caption: "Nothing has run yet. Click the button in the preview and we'll count how many renders one click really costs.",
    code: SETSTATE_IN_EFFECT_CODE,
    playhead: PLAYHEAD[0],
    tree: treeA0,
    rootCurrent: 'current',
    queue: [],
    effects: [],
    preview: preview(s0),
    data: data({ panes: [pane('current', treeA0, fields('on screen', s0, lanes(null))), emptyB] }),
  })

  // 1–2 · click → setCount on SyncLane.
  root.click('button')
  const [uCount] = root.updates.filter((u) => u.status === 'waiting')
  const treeATrig = withNodes(base, { counter: { tag: tagOf(s0), trigger: true } })
  b.step(
    {
      phase: 'trigger',
      activeLine: 10,
      playhead: PLAYHEAD[1],
      tree: treeATrig,
      caption: 'You clicked the button. React calls the onClick arrow, which calls setCount.',
      data: data({ panes: [pane('current', treeATrig, fields('on screen', s0, lanes(null))), emptyB] }),
    },
    line('[event]', 'click on <button> → onClick()', 'trigger'),
  )
  if (!uCount) {
    b.step(
      {
        phase: 'trigger',
        activeLine: 10,
        notes: { 10: '← same value' },
        playhead: PLAYHEAD[2],
        tree: treeA0,
        caption: `count + ${inc} is still ${s0.count}, so React bails out: no render, and the effect never gets a reason to run.`,
        data: data({ panes: [pane('current', treeA0, fields('on screen', s0, lanes(null))), emptyB] }),
      },
      line('[schedule]', 'same state → no render', 'trigger'),
    )
    return b.build()
  }
  b.step(
    {
      phase: 'trigger',
      activeLine: 10,
      notes: { 10: `← count is ${s0.count}` },
      playhead: PLAYHEAD[2],
      queue: [queueRow(uCount, 'waiting', 'waiting', true)],
      caption: 'setCount queues an update on SyncLane. doubled is not part of this update; nothing has asked for it to change yet.',
      data: data({ panes: [pane('current', treeATrig, fields('on screen', s0, lanes('SyncLane'))), emptyB] }),
    },
    line('[schedule]', `${uCount.text} → 1 render (SyncLane)`, 'trigger'),
  )

  // 3–6 · first render, commit, paint: the screen shows a stale doubled.
  root.render()
  const s1 = state(root, 'wip')
  const wipB = snapshot(root, 'wip')
  const counterWip1 = root.find('counter', 'wip')
  const hooksR1 = patchHooks(hookRows(counterWip1), {
    0: { val: `${s0.count} → ${s1.count} · this render`, tone: 'render', hot: true },
    1: { val: `${s1.doubled} · nothing queued` },
    2: { val: `deps [${s0.count}] → [${s1.count}] · changed`, tone: 'commit' },
  })
  const treeB1 = (button: Partial<TreeNode>, done = false) =>
    withNodes(wipB, {
      root: done ? {} : { state: 'skip', tag: 'cloned' },
      app: done ? {} : { state: 'skip', tag: 'bailout' },
      counter: { state: done ? 'idle' : 'render', tag: tagOf(s1) },
      button,
    })
  const r1Panes = (button: Partial<TreeNode>, f: string | null): PgData['panes'] => [
    pane('current', treeA0, fields('on screen', s0, lanes('SyncLane'))),
    pane('wip', treeB1(button), fields('being built', s1, flags(f))),
  ]
  b.step(
    {
      phase: 'render',
      activeLine: 2,
      notes: { 2: `← count = ${s1.count}`, 3: `← doubled = ${s1.doubled}` },
      playhead: PLAYHEAD[3],
      tree: treeA0,
      wipTree: treeB1({ state: 'render' }),
      queue: [queueRow(uCount, 'processing', `applied → ${s1.count}`)],
      effects: effectRow('waiting', 'deps changed · waiting for paint'),
      caption: `React renders Counter with count = ${s1.count}. doubled is still ${s1.doubled}: the effect that would fix it only runs after this render is on screen.`,
      data: data({ panes: r1Panes({ state: 'render' }, null), hooks: { counter: hooksR1 } }),
    },
    line('[render]', `Counter · count = ${s1.count}, doubled = ${s1.doubled}`, 'render'),
  )
  b.step(
    {
      phase: 'reconcile',
      activeLine: 11,
      notes: { 11: `← doubled is still ${s1.doubled}` },
      playhead: PLAYHEAD[4],
      wipTree: treeB1({ state: 'reconcile' }),
      caption: 'React compares the button with the current one. Only the count text differs, so it marks one text update.',
      data: data({ panes: r1Panes({ state: 'reconcile' }, flagsText(counterWip1)), hooks: { counter: hooksR1 } }),
    },
    line('[reconcile]', '1 change: count text in <button>', 'reconcile'),
  )
  const ops1 = domOpsOf(root.commit())
  const oldA = allNodes(treeA0, { state: 'skip' })
  const c1Panes = (button: Partial<TreeNode>): PgData['panes'] => [
    pane('alternate', oldA, fields('last frame', s0, lanes(null))),
    pane('current', treeB1(button, true), fields('on screen', s1, flags(flagsText(counterWip1)))),
  ]
  const hooksC1 = patchHooks(hooksR1, { 0: { val: String(s1.count), tone: undefined, hot: false } })
  b.step(
    {
      phase: 'commit',
      activeLine: 11,
      playhead: PLAYHEAD[5],
      tree: oldA,
      wipTree: treeB1({ state: 'dom' }, true),
      rootCurrent: 'wip',
      domOps: ops1,
      queue: [queueRow(uCount, 'cleared', 'applied · cleared')],
      preview: preview(s1, { highlight: ['count'] }),
      caption: 'Commit: one text write, and root.current swaps to the new tree. The effect is scheduled for after paint.',
      data: data({ panes: c1Panes({ state: 'dom' }), swapBanner: true, hooks: { counter: hooksC1 } }),
    },
    line('[commit]', `${ops1.length} DOM operation · root.current swapped`, 'commit'),
  )
  root.paint()
  const staleShown = s1.doubled !== s1.count * 2
  b.step(
    {
      phase: 'commit',
      playhead: PLAYHEAD[6],
      wipTree: treeB1({ state: 'idle' }, true),
      preview: preview(s1, { stale: staleShown }),
      effects: effectRow('scheduled', 'running next'),
      caption: staleShown
        ? `The browser paints ${s1.count} × 2 = ${s1.doubled}. That's wrong, and for one frame the user can see it.`
        : `The browser paints ${s1.count} × 2 = ${s1.doubled}. The effect still runs next, because count changed.`,
      data: data({ panes: c1Panes({ state: 'idle' }), swapBanner: true, hooks: { counter: hooksC1 } }),
    },
    line('[paint]', `frame F2 painted · ${s1.count} × 2 = ${s1.doubled}`, staleShown ? 'error' : 'commit'),
  )

  // 7 · the passive effect calls setDoubled: a second update, on DefaultLane.
  const passive = root.flushPassiveEffects()
  const queued = eventsOf(passive, 'update-queued')[0]
  const uDoubled = root.updates.find((u) => u.id === queued?.updateId)
  const effectDone = effectRow('ran', 'ran after paint · queued setDoubled')
  if (!uDoubled) {
    b.step(
      {
        phase: 'commit',
        activeLine: 6,
        playhead: PLAYHEAD[7],
        effects: effectRow('ran', 'ran after paint'),
        caption: 'After paint the effect runs, but setDoubled asks for the value doubled already has, so React bails out. One render this time, by luck.',
        data: data({ panes: c1Panes({ state: 'idle' }), swapBanner: true, hooks: { counter: patchHooks(hooksC1, { 2: { val: `deps [${s1.count}] · ran`, tone: 'commit', hot: true } }) } }),
      },
      line('[effect]', 'setDoubled: same value → no render', 'commit'),
    )
    return b.build()
  }
  const doubledQueue = (status: Update['status'], result: string, active = false) => [
    queueRow(uCount, 'cleared', 'applied · cleared'),
    queueRow(uDoubled, status, result, active),
  ]
  const hooksE = patchHooks(hooksC1, {
    1: { val: `${s1.doubled} · 1 queued` },
    2: { val: `deps [${s1.count}] · ran`, tone: 'commit', hot: true },
  })
  const treeBTrig = withNodes(treeB1({ state: 'idle' }, true), { counter: { trigger: true } })
  b.step(
    {
      phase: 'trigger',
      activeLine: 6,
      notes: { 6: '← a second update' },
      playhead: PLAYHEAD[7],
      wipTree: treeBTrig,
      queue: doubledQueue('waiting', 'waiting', true),
      effects: effectDone,
      caption: `After paint, the effect runs and calls setDoubled(${s1.count * 2}). That's a new update on DefaultLane, so React has to render all over again.`,
      data: data({
        panes: [pane('alternate', oldA, fields('last frame', s0, lanes(null))), pane('current', treeBTrig, fields('on screen', s1, lanes('DefaultLane')))],
        swapBanner: false,
        hooks: { counter: hooksE },
      }),
    },
    line('[effect]', `${uDoubled.text} → render again (DefaultLane)`, 'trigger'),
  )

  // 8–11 · the second render reuses the alternate (left) tree as work in progress.
  root.render()
  const s2 = state(root, 'wip')
  const wipA = snapshot(root, 'wip')
  const counterWip2 = root.find('counter', 'wip')
  const treeA2 = (button: Partial<TreeNode>, done = false) =>
    withNodes(wipA, {
      root: done ? {} : { state: 'skip', tag: 'cloned' },
      app: done ? {} : { state: 'skip', tag: 'bailout' },
      counter: { state: done ? 'idle' : 'render', tag: tagOf(s2) },
      button,
    })
  const currentB = withNodes(treeB1({ state: 'idle' }, true), {})
  const hooksR2 = patchHooks(hookRows(counterWip2), {
    1: { val: `${s1.doubled} → ${s2.doubled} · this render`, tone: 'render', hot: true },
    2: { val: `deps [${s2.count}] · unchanged` },
  })
  const r2Panes = (button: Partial<TreeNode>, f: string | null): PgData['panes'] => [
    pane('wip', treeA2(button), fields('being built', s2, flags(f))),
    pane('current', currentB, fields('on screen', s1, lanes('DefaultLane'))),
  ]
  b.step(
    {
      phase: 'render',
      activeLine: 3,
      notes: { 3: `← doubled = ${s2.doubled}` },
      playhead: PLAYHEAD[8],
      tree: treeA2({ state: 'render' }),
      wipTree: currentB,
      queue: doubledQueue('processing', `applied → ${s2.doubled}`),
      effects: [],
      caption: `React calls Counter a second time, now building in the left tree, the alternate it kept. doubled = ${s2.doubled}; count didn't change, so the effect won't run again.`,
      data: data({ panes: r2Panes({ state: 'render' }, null), hooks: { counter: hooksR2 } }),
    },
    line('[render]', `Counter · count = ${s2.count}, doubled = ${s2.doubled}`, 'render'),
  )
  b.step(
    {
      phase: 'reconcile',
      activeLine: 11,
      playhead: PLAYHEAD[9],
      tree: treeA2({ state: 'reconcile' }),
      caption: 'Another diff of the same button. This time the doubled text differs: one more text update.',
      data: data({ panes: r2Panes({ state: 'reconcile' }, flagsText(counterWip2)), hooks: { counter: hooksR2 } }),
    },
    line('[reconcile]', '1 change: doubled text in <button>', 'reconcile'),
  )
  const ops2 = domOpsOf(root.commit())
  const oldB = allNodes(currentB, { state: 'skip', trigger: false })
  const c2Panes = (button: Partial<TreeNode>): PgData['panes'] => [
    pane('current', treeA2(button, true), fields('on screen', s2, flags(flagsText(counterWip2)))),
    pane('alternate', oldB, fields('last frame', s1, lanes(null))),
  ]
  const hooksC2 = patchHooks(hooksR2, { 1: { val: String(s2.doubled), tone: undefined, hot: false } })
  b.step(
    {
      phase: 'commit',
      activeLine: 11,
      playhead: PLAYHEAD[10],
      tree: treeA2({ state: 'dom' }, true),
      wipTree: oldB,
      rootCurrent: 'current',
      domOps: ops2,
      queue: doubledQueue('cleared', 'applied · cleared'),
      preview: preview(s2, { highlight: ['doubled'] }),
      caption: 'Second commit: one more text write, and root.current swaps back to the left tree.',
      data: data({ panes: c2Panes({ state: 'dom' }), swapBanner: true, hooks: { counter: hooksC2 } }),
    },
    line('[commit]', `${ops2.length} DOM operation · root.current swapped back`, 'commit'),
  )
  root.paint()
  root.flushPassiveEffects()
  b.step(
    {
      phase: 'commit',
      playhead: PLAYHEAD[11],
      tree: treeA2({ state: 'idle' }, true),
      preview: preview(s2),
      caption: `Painted ${s2.count} × 2 = ${s2.doubled}. One click cost two renders, two commits and two paints. Compute it during render instead: const doubled = count * 2.`,
      data: data({ panes: c2Panes({ state: 'idle' }), swapBanner: true, hooks: { counter: hooksC2 } }),
    },
    line('[paint]', `frame F3 painted · ${s2.count} × 2 = ${s2.doubled}`, 'commit'),
  )
  return b.build()
}

export const setStateInEffect: PresetDef = {
  id: 'setstate-in-effect',
  label: 'setState inside useEffect',
  file: 'Counter.jsx',
  code: SETSTATE_IN_EFFECT_CODE,
  paramNote: 'Highlighted values are editable: initial count and the increment.',
  previewHint: 'click the button',
  colWidth: 132,
  scenario: setStateInEffectTrace,
}
