import { component, createRoot, domOpsOf, eventsOf, Fragment, h, toTreeNodes, useEffect, useLayoutEffect, useState, type Root } from '../../model'
import type { EffectEntry, TreeNode, Update } from '../../types'
import { allNodes, field, hookRows, line, pane, patchHooks, pgBuilder, queueRow, withNodes, type PgData, type PgPane, type PresetDef, type TLBlock } from './shared'

/**
 * Preset 6 · useLayoutEffect versus useEffect. A tooltip is positioned by an effect that
 * measures and calls setTop. As a layout effect it re-renders before paint, so the user only
 * ever sees the final position; as a passive effect the first paint shows it at top 0 and it
 * jumps a frame later. The hook name is the editable param.
 */
export const LAYOUT_CODE =
  'function Tooltip() {\n  const [open, setOpen] = useState(false);\n  const [top, setTop] = useState(0);\n\n  ⟦useLayoutEffect⟧(() => {\n    if (open) setTop(measure());\n  }, [open]);\n\n  return (\n    <>\n      <button onClick={() => setOpen(true)}>Show tip</button>\n      {open && <p style={{ top }}>Tip</p>}\n    </>\n  );\n}'

/** Where measure() puts the tooltip. */
export const MEASURED_TOP = 40

const LAYOUT_BLOCKS: TLBlock[] = [
  { start: 18, width: 3, kind: 'trigger', title: 'click + handler' },
  { start: 21.4, width: 2.6, kind: 'render', title: 'render (top 0)' },
  { start: 24.2, width: 1.4, kind: 'reconcile', title: 'diff' },
  { start: 25.8, width: 1.4, kind: 'commit', title: 'commit (top 0)' },
  { start: 27.4, width: 1.2, kind: 'commit', title: 'layout effect: setTop' },
  { start: 28.8, width: 2.2, kind: 'render', title: 're-render before paint (top 40)' },
  { start: 31.2, width: 1.4, kind: 'commit', title: 'commit (top 40)' },
  { start: 34, width: 3, kind: 'paint', title: 'paint' },
]
const LAYOUT_PLAYHEAD = [10, 18.6, 20.6, 22.8, 24.8, 26.6, 28, 30, 32, 35.5]

const PASSIVE_BLOCKS: TLBlock[] = [
  { start: 18, width: 3, kind: 'trigger', title: 'click + handler' },
  { start: 21.4, width: 2.6, kind: 'render', title: 'render (top 0)' },
  { start: 24.2, width: 1.4, kind: 'reconcile', title: 'diff' },
  { start: 25.8, width: 1.4, kind: 'commit', title: 'commit (top 0)' },
  { start: 30, width: 3, kind: 'paint', title: 'paint (tooltip at top 0)' },
  { start: 34, width: 1.4, kind: 'commit', title: 'passive effect: setTop' },
  { start: 35.6, width: 2.2, kind: 'render', title: 're-render (top 40)' },
  { start: 38, width: 1.4, kind: 'commit', title: 'commit (top 40)' },
  { start: 46.6, width: 3, kind: 'paint', title: 'paint (it jumps)' },
]
const PASSIVE_PLAYHEAD = [10, 18.6, 20.6, 22.8, 24.8, 26.6, 31.5, 34.8, 36.8, 38.8, 48]

/** `useEffect` → passive; anything with "Layout" → layout. */
export const isLayoutParam = (v: string | undefined) => !/^\s*useEffect\s*$/.test(String(v ?? 'useLayoutEffect'))

function app(layout: boolean) {
  const Tooltip = component('Tooltip', () => {
    const [open, setOpen] = useState(false, 'open')
    const [top, setTop] = useState(0, 'top')
    const effect = layout ? useLayoutEffect : useEffect
    effect(
      () => {
        if (open) setTop(MEASURED_TOP, `setTop(${MEASURED_TOP})`)
      },
      [open],
      'position',
    )
    return h(
      Fragment,
      null,
      h('button', { $id: 'button', onClick: () => setOpen(true, 'setOpen(true)') }, 'Show tip'),
      open ? h('p', { $id: 'tip', style: { top } }, 'Tip') : null,
    )
  })
  return h(Tooltip, { $id: 'tooltip' })
}

const snapshot = (root: Root, tree: 'current' | 'wip' = 'current') => toTreeNodes(root, { hostRoot: true, tree })
const stateOf = (root: Root, tree: 'current' | 'wip' = 'current') => {
  const hk = root.find('tooltip', tree)?.memoizedState
  return { open: hk?.memoizedState as boolean, top: hk?.next?.memoizedState as number }
}

export function layoutVsPassiveTrace(params: readonly string[]) {
  const layout = isLayoutParam(params[0])
  const hook = layout ? 'useLayoutEffect' : 'useEffect'
  const blocks = layout ? LAYOUT_BLOCKS : PASSIVE_BLOCKS
  const P = layout ? LAYOUT_PLAYHEAD : PASSIVE_PLAYHEAD
  const root = createRoot(app(layout))
  root.mount()
  const base = snapshot(root)
  const s0 = stateOf(root)
  const tag = (s: { open: boolean; top: number }) => `open ${s.open} · top ${s.top}`
  const fields = (status: string, s: { open: boolean; top: number } | null, extra = field('lanes', 'none')) => [
    field('Tooltip', status, 'label'),
    field('memoizedState', s ? tag(s) : '—'),
    extra,
    field('alternate', '→ other tree'),
  ]
  const lanes = (l: string | null) => field('lanes', l ? `${l} (pending)` : 'none', l ? 'trigger' : undefined)
  const screen = (s: { open: boolean; top: number }, highlight = false) => ({ values: { open: s.open, top: String(s.top) }, ...(highlight ? { highlight: ['tip'] } : {}) })
  const effectRow = (status: EffectEntry['status'], detail: string): EffectEntry[] => [
    { id: 'position', kind: layout ? 'layout' : 'passive', component: 'Tooltip', label: `${hook} · position`, deps: '[open]', status, detail },
  ]
  const data = (d: Partial<PgData> & Pick<PgData, 'panes'>): PgData => ({
    swapBanner: false,
    hooks: { tooltip: hookRows(root.find('tooltip')) },
    focus: 'tooltip',
    queueOf: 'Tooltip',
    effectNote: layout ? 'layout: before paint' : 'runs after paint',
    ...d,
  })
  const emptyB = pane('empty', [], fields('not created', null, field('flags', '—')))
  const tooltipTag = (t: TreeNode[], s: { open: boolean; top: number }, extra: Partial<TreeNode> = {}) => withNodes(t, { tooltip: { tag: tag(s), ...extra } })
  const treeA0 = tooltipTag(base, s0)

  const b = pgBuilder(blocks, {
    phase: 'trigger',
    caption: `The tooltip's position comes from ${hook}. Click "Show tip" and watch where the tooltip is on each painted frame.`,
    code: LAYOUT_CODE,
    playhead: P[0],
    tree: treeA0,
    rootCurrent: 'current',
    queue: [],
    effects: [],
    preview: screen(s0),
    data: data({ panes: [pane('current', treeA0, fields('on screen', s0)), emptyB] }),
  })

  root.click('button')
  const [uOpen] = root.updates
  const trig = tooltipTag(base, s0, { trigger: true })
  b.step(
    {
      phase: 'trigger',
      activeLine: 11,
      playhead: P[1],
      tree: trig,
      caption: 'You clicked "Show tip". The handler calls setOpen(true).',
      data: data({ panes: [pane('current', trig, fields('on screen', s0)), emptyB] }),
    },
    line('[event]', 'click on <button> → setOpen(true)', 'trigger'),
  )
  b.step(
    {
      phase: 'trigger',
      activeLine: 11,
      playhead: P[2],
      queue: [queueRow(uOpen, 'waiting', 'waiting', true)],
      caption: 'setOpen queues an update on SyncLane. The position is not known yet; it gets measured once the tooltip is in the DOM.',
      data: data({ panes: [pane('current', trig, fields('on screen', s0, lanes('SyncLane'))), emptyB] }),
    },
    line('[schedule]', 'setOpen(true) → 1 render (SyncLane)', 'trigger'),
  )

  // First render: open, still top 0.
  root.render()
  const s1 = stateOf(root, 'wip')
  const wip1 = snapshot(root, 'wip')
  const flagsWip1 = root.find('tooltip', 'wip')
  const treeB1 = (tip: Partial<TreeNode>, done = false) =>
    withNodes(wip1, { root: done ? {} : { state: 'skip', tag: 'cloned' }, tooltip: { state: done ? 'idle' : 'render', tag: tag(s1) }, tip, button: {} })
  const hooksR1 = patchHooks(hookRows(flagsWip1), {
    0: { val: `false → true · this render`, tone: 'render', hot: true },
    2: { val: 'deps [false] → [true] · changed', tone: 'commit' },
  })
  const r1Panes = (t: TreeNode[]): PgData['panes'] => [pane('current', treeA0, fields('on screen', s0, lanes('SyncLane'))), pane('wip', t, fields('being built', s1, field('flags', '—')))]
  b.step(
    {
      phase: 'render',
      activeLine: 2,
      notes: { 2: '← open = true', 3: `← top = ${s1.top}` },
      playhead: P[3],
      tree: treeA0,
      wipTree: treeB1({ state: 'render' }),
      queue: [queueRow(uOpen, 'processing', 'applied → true')],
      effects: effectRow('waiting', layout ? 'deps changed · runs after the DOM writes' : 'deps changed · runs after paint'),
      caption: `React renders Tooltip with open = true. top is still ${s1.top}, because nothing has been measured yet.`,
      data: data({ panes: r1Panes(treeB1({ state: 'render' })), hooks: { tooltip: hooksR1 } }),
    },
    line('[render]', `Tooltip · open = true, top = ${s1.top}`, 'render'),
  )
  b.step(
    {
      phase: 'reconcile',
      activeLine: 12,
      playhead: P[4],
      wipTree: treeB1({ state: 'reconcile', tag: 'new' }),
      caption: 'The <p> is new: there was nothing in that spot before, so React marks it for insertion.',
      data: data({ panes: r1Panes(treeB1({ state: 'reconcile', tag: 'new' })), hooks: { tooltip: hooksR1 } }),
    },
    line('[reconcile]', '1 change: insert <p>', 'reconcile'),
  )

  const c1 = root.commit()
  const ops1 = domOpsOf(c1)
  const oldA = allNodes(treeA0, { state: 'skip', trigger: false })
  const committed1 = treeB1({ state: 'dom' }, true)
  const c1Panes = (t: TreeNode[], l: string | null = null): PgData['panes'] => [
    pane('alternate', oldA, fields('last frame', s0)),
    pane('current', t, fields(layout ? 'in the DOM, not painted' : 'on screen', s1, lanes(l))),
  ]
  const hooksC1 = patchHooks(hooksR1, { 0: { val: 'true', tone: undefined, hot: false } })
  b.step(
    {
      phase: 'commit',
      activeLine: 12,
      notes: { 12: `← top: ${s1.top}` },
      playhead: P[5],
      tree: oldA,
      wipTree: committed1,
      rootCurrent: 'wip',
      domOps: ops1,
      queue: [queueRow(uOpen, 'cleared', 'applied · cleared')],
      caption: `Commit: React creates the <p> with top ${s1.top} and inserts it. root.current swaps. The browser hasn't painted yet.`,
      data: data({ panes: c1Panes(committed1), swapBanner: true, hooks: { tooltip: hooksC1 } }),
    },
    line('[commit]', `${ops1.length} DOM operations · <p> inserted at top ${s1.top}`, 'commit'),
  )

  let effectEvents = eventsOf(c1, 'effect')
  if (!layout) {
    root.paint()
    b.step(
      {
        phase: 'commit',
        playhead: P[6],
        wipTree: treeB1({ state: 'idle' }, true),
        preview: screen(s1, true),
        effects: effectRow('scheduled', 'running next'),
        caption: `The browser paints. The tooltip is on screen at top ${s1.top}, the wrong spot, because useEffect hasn't run yet.`,
        data: data({ panes: c1Panes(treeB1({ state: 'idle' }, true)), swapBanner: true, hooks: { tooltip: hooksC1 } }),
      },
      line('[paint]', `frame F2 painted · tooltip at top ${s1.top}`, 'error'),
    )
    effectEvents = eventsOf(root.flushPassiveEffects(), 'effect')
  }
  const ran = effectEvents.some((e) => e.action === 'run')
  const uTop = root.updates.find((u) => u.text.startsWith('setTop'))
  const lane = layout ? 'SyncLane' : 'DefaultLane'
  const queue2 = (status: Update['status'], result: string, active = false) => (uTop ? [queueRow(uOpen, 'cleared', 'applied · cleared'), queueRow(uTop, status, result, active)] : [])
  const effHooks = patchHooks(hooksC1, { 1: { val: `${s1.top} · 1 queued` }, 2: { val: 'deps [true] · ran', tone: 'commit', hot: true } })
  const trigB = withNodes(treeB1({ state: layout ? 'dom' : 'idle' }, true), { tooltip: { trigger: true } })
  b.step(
    {
      phase: 'trigger',
      activeLine: 6,
      notes: { 6: `← measure() = ${MEASURED_TOP}` },
      playhead: P[layout ? 6 : 7],
      wipTree: trigB,
      queue: queue2('waiting', 'waiting', true),
      effects: effectRow('ran', layout ? 'ran before paint' : 'ran after paint'),
      caption: layout
        ? `useLayoutEffect runs right after the DOM writes, before the browser paints. It measures and calls setTop(${MEASURED_TOP}): a SyncLane update React must handle before it lets the browser paint.`
        : `After paint, useEffect runs, measures and calls setTop(${MEASURED_TOP}). That's a new update on DefaultLane, so another render, commit and paint.`,
      data: data({ panes: c1Panes(trigB, lane), swapBanner: false, hooks: { tooltip: effHooks } }),
    },
    line('[effect]', `${hook} ran${layout ? ' before paint' : ' after paint'} · setTop(${MEASURED_TOP}) (${lane})`, ran ? 'commit' : 'info'),
  )

  // Second render reuses the left tree.
  root.render()
  const s2 = stateOf(root, 'wip')
  const wip2 = snapshot(root, 'wip')
  const curB = treeB1({ state: 'idle' }, true)
  const treeA2 = (tip: Partial<TreeNode>, done = false) =>
    withNodes(wip2, { root: done ? {} : { state: 'skip', tag: 'cloned' }, tooltip: { state: done ? 'idle' : 'render', tag: tag(s2) }, tip })
  const hooksR2 = patchHooks(hookRows(root.find('tooltip', 'wip')), { 1: { val: `${s1.top} → ${s2.top} · this render`, tone: 'render', hot: true }, 2: { val: 'deps [true] · unchanged' } })
  const r2Panes = (t: TreeNode[]): PgData['panes'] => [pane('wip', t, fields('being built', s2, field('flags', '—'))), pane('current', curB, fields(layout ? 'in the DOM, not painted' : 'on screen', s1, lanes(lane)))]
  b.step(
    {
      phase: 'render',
      activeLine: 3,
      notes: { 3: `← top = ${s2.top}` },
      playhead: P[layout ? 7 : 8],
      tree: treeA2({ state: 'render' }),
      wipTree: curB,
      queue: queue2('processing', `applied → ${s2.top}`),
      caption: layout
        ? `React renders Tooltip again, still before paint, with top = ${s2.top}. It builds in the left tree, the alternate.`
        : `React renders Tooltip again with top = ${s2.top}, building in the left tree, the alternate.`,
      data: data({ panes: r2Panes(treeA2({ state: 'render' })), hooks: { tooltip: hooksR2 } }),
    },
    line('[render]', `Tooltip · top = ${s2.top}`, 'render'),
  )
  const ops2 = domOpsOf(root.commit())
  const oldB = allNodes(curB, { state: 'skip', trigger: false })
  const c2 = (tip: Partial<TreeNode>): PgPane[] => [pane('current', treeA2(tip, true), fields('on screen', s2)), pane('alternate', oldB, fields('last frame', s1))]
  b.step(
    {
      phase: 'commit',
      activeLine: 12,
      notes: { 12: `← top: ${s2.top}` },
      playhead: P[layout ? 8 : 9],
      tree: treeA2({ state: 'dom' }, true),
      wipTree: oldB,
      rootCurrent: 'current',
      domOps: ops2,
      queue: queue2('cleared', 'applied · cleared'),
      caption: `Commit: one style write moves the <p> to top ${s2.top}, and root.current swaps back.`,
      data: data({ panes: c2({ state: 'dom' }) as PgData['panes'], swapBanner: true, hooks: { tooltip: patchHooks(hooksR2, { 1: { val: String(s2.top), tone: undefined, hot: false } }) } }),
    },
    line('[commit]', `${ops2.length} DOM operation · p.style.top = ${s2.top}`, 'commit'),
  )
  root.paint()
  root.flush()
  b.step(
    {
      phase: 'commit',
      playhead: P[layout ? 9 : 10],
      tree: treeA2({ state: 'idle' }, true),
      preview: screen(s2, true),
      caption: layout
        ? `The first and only paint shows the tooltip at top ${s2.top}. The user never saw top ${s1.top}. Change the hook to useEffect to see the other order.`
        : `Painted again, now at top ${s2.top}: the tooltip visibly jumped. Measuring belongs in useLayoutEffect, which runs before paint.`,
      data: data({ panes: c2({ state: 'idle' }) as PgData['panes'], swapBanner: true, hooks: { tooltip: patchHooks(hooksR2, { 1: { val: String(s2.top), tone: undefined, hot: false } }) } }),
    },
    line('[paint]', `frame F3 painted · tooltip at top ${s2.top}`, 'commit'),
  )
  return b.build()
}

export const layoutVsPassive: PresetDef = {
  id: 'layout-vs-passive',
  label: 'useLayoutEffect versus useEffect',
  file: 'Tooltip.jsx',
  code: LAYOUT_CODE,
  paramNote: 'The highlighted hook is editable: try useLayoutEffect, then useEffect.',
  previewHint: 'click Show tip',
  colWidth: 104,
  scenario: layoutVsPassiveTrace,
}
