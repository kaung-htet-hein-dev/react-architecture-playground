import { component, createRoot, domOpsOf, eventsOf, h, toTreeNodes, useEffect, useState, type ModelUpdate, type Root } from '../../model'
import type { EffectEntry, TreeNode, Update } from '../../types'
import { allNodes, field, hookRows, intParam, line, pane, patchHooks, pgBuilder, queueRow, withNodes, type PgData, type PgHook, type PgInput, type PresetDef, type TLBlock } from './shared'

/**
 * Preset 7 · Stale closure in setInterval. The interval is created once (deps []), so its
 * callback keeps the count from the first render. Every tick asks for `0 + 1`: the first tick
 * renders 1, and every later tick computes the same value, so React bails out and the count
 * stays 1. Params: initial state and the increment.
 */
export const STALE_CLOSURE_CODE =
  'function Timer() {\n  const [count, setCount] = useState(⟦0⟧);\n\n  useEffect(() => {\n    const id = setInterval(() => {\n      setCount(count + ⟦1⟧);\n    }, 1000);\n    return () => clearInterval(id);\n  }, []);\n\n  return <p>Count: {count}</p>;\n}'

const BLOCKS: TLBlock[] = [
  { start: 4, width: 2.4, kind: 'trigger', title: 'tick 1 · setCount' },
  { start: 6.8, width: 2.4, kind: 'render', title: 'render' },
  { start: 9.6, width: 1.6, kind: 'commit', title: 'commit' },
  { start: 13, width: 3, kind: 'paint', title: 'paint' },
  { start: 37.5, width: 2.4, kind: 'trigger', title: 'tick 2 · same value' },
  { start: 71, width: 2.4, kind: 'trigger', title: 'tick 3 · same value' },
]
const PLAYHEAD = [1, 5.4, 8, 10.4, 15, 38.6, 42, 72, 80]

function app(init: number, inc: number, timers: (() => void)[]) {
  const Timer = component('Timer', () => {
    const [count, setCount] = useState(init, 'count')
    useEffect(
      () => {
        timers.push(() => setCount(count + inc, `setCount(${count} + ${inc})`))
        return () => {
          timers.length = 0
        }
      },
      // The missing `count` dependency is the bug this preset demonstrates.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [],
      'setInterval',
    )
    return h('p', { $id: 'p' }, 'Count: ', count)
  })
  return h(Timer, { $id: 'timer' })
}

const snapshot = (root: Root, tree: 'current' | 'wip' = 'current') => toTreeNodes(root, { hostRoot: true, tree })

export function staleClosureTrace(params: readonly string[]) {
  const init = intParam(params[0], 0)
  const inc = intParam(params[1], 1)
  const timers: (() => void)[] = []
  const root = createRoot(app(init, inc, timers))
  root.mount()
  const base = snapshot(root)
  const countOf = (tree: 'current' | 'wip' = 'current') => root.find('timer', tree)?.memoizedState?.memoizedState as number
  const tagged = (t: TreeNode[], count: number, extra: Partial<TreeNode> = {}) => withNodes(t, { timer: { tag: `count ${count}`, ...extra } })
  const fields = (status: string, count: number | null, lanes: string | null = null) => [
    field('Timer', status, 'label'),
    field('memoizedState', count == null ? '—' : `count ${count}`),
    field('lanes', lanes ? `${lanes} (pending)` : 'none', lanes ? 'trigger' : undefined),
    field('alternate', '→ other tree'),
  ]
  const effectHook: Partial<PgHook> = { val: 'deps [] · ran once on mount' }
  const hooks = (val: string, extra: Partial<PgHook> = {}) => ({ timer: patchHooks(hookRows(root.find('timer')), { 0: { val, ...extra }, 1: effectHook }) })
  const effects: EffectEntry[] = [{ id: 'interval', kind: 'passive', component: 'Timer', label: 'useEffect · setInterval', deps: '[]', status: 'ran', detail: `ran on mount · its callback saw count = ${init}` }]
  const data = (d: Partial<PgData> & Pick<PgData, 'panes'>): PgData => ({ swapBanner: false, hooks: hooks(String(init)), focus: 'timer', queueOf: 'Timer', ...d })
  const emptyB = pane('empty', [], fields('not created', null))
  const t0 = tagged(base, init)
  const preview = (count: number, seconds: number, highlight = false) => ({ values: { count: String(count), seconds: String(seconds) }, ...(highlight ? { highlight: ['count'] } : {}) })

  const b = pgBuilder(BLOCKS, {
    phase: 'trigger',
    caption: `The effect ran once on mount and started an interval whose callback remembers count = ${init}. Press "Wait 1 s" in the preview to let a second pass.`,
    code: STALE_CLOSURE_CODE,
    playhead: PLAYHEAD[0],
    tree: t0,
    rootCurrent: 'current',
    queue: [],
    effects,
    preview: preview(init, 0),
    data: data({ panes: [pane('current', t0, fields('on screen', init)), emptyB] }),
    console: [line('[effect]', `setInterval started · callback sees count = ${init}`, 'commit')],
  })

  const tick = () => {
    const ev = root.act(() => timers[0]?.())
    const u = root.updates[root.updates.length - 1] as ModelUpdate | undefined
    const bailed = eventsOf(ev, 'update-bailout').length > 0
    return { u, bailed, scheduled: root.pendingLanes !== 0 }
  }

  // Tick 1: the callback asks for init + inc.
  const t1 = tick()
  const trig = tagged(base, init, { trigger: true })
  const q1 = (status: Update['status'], result: string, active = false): Update[] => (t1.u ? [queueRow(t1.u, status, result, active)] : [])
  b.step(
    {
      phase: 'trigger',
      activeLine: 6,
      notes: { 6: `← count is ${init}` },
      playhead: PLAYHEAD[1],
      tree: trig,
      queue: q1(t1.scheduled ? 'waiting' : 'skipped', t1.scheduled ? 'waiting' : 'same value · bailed out', true),
      preview: preview(init, 1),
      caption: t1.scheduled
        ? `One second passes and the interval fires. Its callback calls setCount(${init} + ${inc}). A timer isn't a user event, so the update goes on DefaultLane.`
        : `One second passes and the interval fires: setCount(${init} + ${inc}) is the value count already has, so React bails out.`,
      data: data({ panes: [pane('current', trig, fields('on screen', init, t1.scheduled ? 'DefaultLane' : null)), emptyB], hooks: hooks(t1.scheduled ? `${init} · 1 queued` : String(init)) }),
    },
    line('[timer]', `tick 1 → ${t1.u?.text ?? 'setCount'}${t1.scheduled ? ' (DefaultLane)' : ' · same value'}`, 'trigger'),
  )
  if (!t1.scheduled) {
    b.step(
      {
        phase: 'trigger',
        activeLine: 6,
        playhead: PLAYHEAD[8],
        preview: preview(init, 3),
        caption: `Every tick asks for ${init} + ${inc}, which is ${init}. Nothing ever renders.`,
        data: data({ panes: [pane('current', t0, fields('on screen', init)), emptyB] }),
      },
      line('[timer]', 'ticks 2, 3 · same value · no render', 'trigger'),
    )
    return b.build()
  }

  root.render()
  const c1 = countOf('wip')
  const wip = snapshot(root, 'wip')
  const treeB = (p: Partial<TreeNode>, done = false) => withNodes(wip, { root: done ? {} : { state: 'skip', tag: 'cloned' }, timer: { state: done ? 'idle' : 'render', tag: `count ${c1}` }, p })
  const r1Panes = (t: TreeNode[]): PgData['panes'] => [pane('current', t0, fields('on screen', init, 'DefaultLane')), pane('wip', t, fields('being built', c1))]
  b.step(
    {
      phase: 'render',
      activeLine: 2,
      notes: { 2: `← count = ${c1}` },
      playhead: PLAYHEAD[2],
      tree: t0,
      wipTree: treeB({ state: 'render' }),
      queue: q1('processing', `applied → ${c1}`),
      caption: `React renders Timer with count = ${c1}. The effect has deps [], so it does not run again, and the interval keeps the callback from the first render.`,
      data: data({ panes: r1Panes(treeB({ state: 'render' })), hooks: hooks(`${init} → ${c1} · this render`, { tone: 'render', hot: true }) }),
    },
    line('[render]', `Timer · count = ${c1} · effect skipped (deps [])`, 'render'),
  )
  const ops = domOpsOf(root.commit())
  const oldA = allNodes(t0, { state: 'skip', trigger: false })
  const donePanes = (t: TreeNode[], lanes: string | null = null, trigger = false): PgData['panes'] => [
    pane('alternate', oldA, fields('last frame', init)),
    pane('current', trigger ? withNodes(t, { timer: { trigger: true } }) : t, fields('on screen', c1, lanes)),
  ]
  b.step(
    {
      phase: 'commit',
      activeLine: 11,
      playhead: PLAYHEAD[3],
      tree: oldA,
      wipTree: treeB({ state: 'dom' }, true),
      rootCurrent: 'wip',
      domOps: ops,
      queue: q1('cleared', 'applied · cleared'),
      preview: preview(c1, 1, true),
      caption: `Commit: one text write, Count: ${c1}, and root.current swaps.`,
      data: data({ panes: donePanes(treeB({ state: 'dom' }, true)), swapBanner: true, hooks: hooks(String(c1)) }),
    },
    line('[commit]', `${ops.length} DOM operation · root.current swapped`, 'commit'),
  )
  root.paint()
  root.flushPassiveEffects()
  const idleB = treeB({ state: 'idle' }, true)
  b.step(
    {
      phase: 'commit',
      playhead: PLAYHEAD[4],
      wipTree: idleB,
      preview: preview(c1, 1),
      caption: `Painted: Count: ${c1}. So far so good. The interval callback, though, still closes over count = ${init}.`,
      data: data({ panes: donePanes(idleB), swapBanner: true, hooks: hooks(String(c1)) }),
    },
    line('[paint]', `frame F1 painted · Count: ${c1}`, 'commit'),
  )

  // Ticks 2 and 3: the same stale callback, the same value.
  let currentIsB = true
  const idleA = allNodes(withNodes(wip, { timer: { tag: `count ${c1}` } }), { state: 'idle' })
  const panesNow = (trigger = false): PgData['panes'] => {
    if (currentIsB) return donePanes(idleB, null, trigger)
    return [pane('current', trigger ? withNodes(idleA, { timer: { trigger: true } }) : idleA, fields('on screen', c1)), pane('alternate', allNodes(idleB, { state: 'skip' }), fields('last frame', c1))]
  }
  const tickStep = (n: 2 | 3, at: number, seconds: number) => {
    const t = tick()
    let rendered = false
    if (t.scheduled) {
      // Not eagerly bailed out: React renders Timer, sees the same state and bails out there,
      // then commits a tree with no changes (root.current still moves).
      const ev = root.flush()
      rendered = eventsOf(ev, 'render').length > 0
      if (eventsOf(ev, 'root-swap').length) currentIsB = !currentIsB
    }
    const rows: Update[] = [...(t1.u ? [queueRow(t1.u, 'cleared', 'applied · cleared')] : []), ...(t.u ? [queueRow(t.u, 'skipped', rendered ? 'same value · render bailed out' : 'same value · bailed out', true)] : [])]
    const step: PgInput = {
      phase: 'trigger',
      activeLine: 6,
      notes: { 6: `← count is still ${init}` },
      playhead: at,
      queue: rows,
      rootCurrent: currentIsB ? 'wip' : 'current',
      preview: preview(countOf(), seconds),
      caption: rendered
        ? `Tick ${n}: the callback again calls setCount(${init} + ${inc}). React renders Timer once more, finds count is still ${c1}, and bails out: no DOM writes.`
        : `Tick ${n}: the callback again calls setCount(${init} + ${inc}), because count in that closure is still ${init}. The result is ${c1}, the value count already has, so React bails out before rendering.`,
      data: data({ panes: panesNow(true), swapBanner: rendered, hooks: hooks(String(c1)) }),
    }
    b.step(step, line('[timer]', `tick ${n} → ${t.u?.text ?? 'setCount'} · same value${rendered ? ' · rendered, bailed out' : ' · no render'}`, 'trigger'))
  }
  tickStep(2, PLAYHEAD[5], 2)
  b.step({
    phase: 'commit',
    activeLine: 9,
    notes: { 9: '← the effect never re-runs' },
    playhead: PLAYHEAD[6],
    caption: `Why? The interval was created by the effect from the first render, and deps [] means that effect never runs again. Its callback still reads count = ${init}.`,
    data: data({ panes: panesNow(), swapBanner: false, hooks: { timer: patchHooks(hookRows(root.find('timer')), { 1: { val: 'deps [] · never re-runs', tone: 'error', hot: true } }) } }),
  })
  tickStep(3, PLAYHEAD[7], 3)
  b.step(
    {
      phase: 'commit',
      activeLine: 6,
      notes: { 6: '← setCount(c => c + 1)' },
      playhead: PLAYHEAD[8],
      queue: [],
      preview: preview(countOf(), 3),
      caption: `Three seconds, and the count stays ${countOf()}. Use the updater form, setCount(c => c + ${inc}), so each tick reads the latest state instead of the one it closed over.`,
      data: data({ panes: panesNow(), swapBanner: false, hooks: hooks(String(countOf())) }),
    },
    line('[timer]', `after 3 s · Count: ${countOf()} (expected ${init + 3 * inc})`, 'error'),
  )
  return b.build()
}

export const staleClosure: PresetDef = {
  id: 'stale-closure',
  label: 'Stale closure in setInterval',
  file: 'Timer.jsx',
  code: STALE_CLOSURE_CODE,
  paramNote: 'Highlighted values are editable: initial state and the increment.',
  previewHint: 'press Wait 1 s',
  colWidth: 132,
  scenario: staleClosureTrace,
}
