import { component, createRoot, domOpsOf, eventsOf, Fragment, h, memo, toTreeNodes, useState, type Root } from '../../model'
import type { TreeNode } from '../../types'
import { allNodes, field, flagsText, intParam, line, pane, pgBuilder, queueRow, withNodes, type PgData, type PgHook, type PresetDef, type TLBlock } from './shared'

/**
 * Preset 5 · memo broken by a new object prop. Dashboard passes `options={{ theme: 'dark' }}`
 * to a memo() Chart: a fresh object every render, so memo's Object.is check fails and Chart
 * renders on every click even though its output never changes.
 */
export const MEMO_CODE =
  "const Chart = memo(function Chart({ options }) {\n  return <svg className={options.theme} />;\n});\n\nfunction Dashboard() {\n  const [clicks, setClicks] = useState(⟦0⟧);\n\n  return (\n    <>\n      <button onClick={() => setClicks(clicks + 1)}>Clicks: {clicks}</button>\n      <Chart options={{ theme: 'dark' }} />\n    </>\n  );\n}"

const BLOCKS: TLBlock[] = [
  { start: 18, width: 3, kind: 'trigger', title: 'click + handler' },
  { start: 21.4, width: 2.4, kind: 'render', title: 'render Dashboard' },
  { start: 24, width: 4.2, kind: 'render', title: 'render Chart (wasted)' },
  { start: 28.4, width: 1.8, kind: 'reconcile', title: 'diff' },
  { start: 30.4, width: 1.6, kind: 'commit', title: 'commit' },
  { start: 33.6, width: 3, kind: 'paint', title: 'paint' },
]
const PLAYHEAD = [10, 18.6, 20.6, 22.6, 24.2, 26.6, 29.4, 31.4, 35]

function app(init: number) {
  const Chart = memo(component('Chart', (p: { options: { theme: string } }) => h('svg', { $id: 'svg', className: p.options.theme })))
  const Dashboard = component('Dashboard', () => {
    const [clicks, setClicks] = useState(init, 'clicks')
    return h(
      Fragment,
      null,
      h('button', { $id: 'button', onClick: () => setClicks(clicks + 1, `setClicks(${clicks} + 1)`) }, 'Clicks: ', clicks),
      h(Chart, { $id: 'chart', options: { theme: 'dark' } }),
    )
  })
  return h(Dashboard, { $id: 'dashboard' })
}

const snapshot = (root: Root, tree: 'current' | 'wip' = 'current') =>
  toTreeNodes(root, { hostRoot: true, tree }).map((n) => (n.id === 'chart' ? { ...n, tag: 'memo' } : n))

export function memoObjectPropTrace(params: readonly string[]) {
  const init = intParam(params[0], 0)
  const root = createRoot(app(init))
  root.mount()
  const base = snapshot(root)
  const hooks = (val: string, extra: Partial<PgHook> = {}): Record<string, PgHook[]> => ({ dashboard: [{ n: 0, type: 'useState', val, ...extra }] })
  const fields = (status: string, clicks: number | null, extra = field('chart props', 'options → object #1')) => [
    field('Dashboard', status, 'label'),
    field('memoizedState', clicks == null ? '—' : `clicks ${clicks}`),
    extra,
    field('alternate', '→ other tree'),
  ]
  const data = (d: Partial<PgData> & Pick<PgData, 'panes'>): PgData => ({ swapBanner: false, hooks: hooks(String(init)), focus: 'dashboard', queueOf: 'Dashboard', ...d })
  const emptyB = pane('empty', [], fields('not created', null, field('chart props', '—')))

  const b = pgBuilder(BLOCKS, {
    phase: 'trigger',
    caption: 'Chart is wrapped in memo, so it should skip renders when its props are the same. Click the button and check whether it does.',
    code: MEMO_CODE,
    playhead: PLAYHEAD[0],
    tree: base,
    rootCurrent: 'current',
    queue: [],
    effects: [],
    preview: { values: { clicks: String(init) } },
    data: data({ panes: [pane('current', base, fields('on screen', init)), emptyB] }),
  })

  root.click('button')
  const [u] = root.updates
  const trig = withNodes(base, { dashboard: { trigger: true } })
  b.step(
    {
      phase: 'trigger',
      activeLine: 10,
      playhead: PLAYHEAD[1],
      tree: trig,
      caption: 'You clicked the button. Its onClick calls setClicks with clicks + 1.',
      data: data({ panes: [pane('current', trig, fields('on screen', init)), emptyB] }),
    },
    line('[event]', 'click on <button> → setClicks()', 'trigger'),
  )
  b.step(
    {
      phase: 'trigger',
      activeLine: 10,
      notes: { 10: `← clicks is ${init}` },
      playhead: PLAYHEAD[2],
      queue: [queueRow(u, 'waiting', 'waiting', true)],
      caption: "setClicks queues an update on Dashboard. Chart has no state of its own; nothing asked it to change.",
      data: data({ panes: [pane('current', trig, fields('on screen', init)), emptyB], hooks: hooks(`${init} · 1 queued`) }),
    },
    line('[schedule]', `${u.text} → 1 render (SyncLane)`, 'trigger'),
  )

  const r = root.render()
  const clicks = init + 1
  const wipBase = snapshot(root, 'wip')
  const memoBailed = eventsOf(r.events, 'bailout').some((e) => e.fiberId === 'chart' && e.reason === 'memo')
  const chartRendered = eventsOf(r.events, 'render').some((e) => e.fiberId === 'chart')
  const svgChanged = eventsOf(r.events, 'complete').some((e) => e.fiberId === 'svg' && !e.created && e.changes.length > 0)
  const treeB = (nodes: Record<string, Partial<TreeNode>>, done = false) =>
    withNodes(wipBase, { root: done ? {} : { state: 'skip', tag: 'cloned' }, dashboard: { state: done ? 'idle' : 'render', tag: `clicks ${clicks}` }, ...nodes })
  const fieldsB = (status: string) => fields(status, clicks, field('chart props', 'options → object #2 (new)', 'error'))
  const renderPanes = (tree: TreeNode[]): PgData['panes'] => [pane('current', base, fields('on screen', init)), pane('wip', tree, fieldsB('being built'))]
  const hooksR = hooks(`${init} → ${clicks} · this render`, { tone: 'render', hot: true })

  const t3 = treeB({ button: { state: 'pending' }, chart: { state: 'pending', tag: 'memo' }, svg: { state: 'pending' } })
  b.step(
    {
      phase: 'render',
      activeLine: 6,
      notes: { 6: `← clicks = ${clicks}` },
      playhead: PLAYHEAD[3],
      tree: base,
      wipTree: t3,
      queue: [queueRow(u, 'processing', `applied → ${clicks}`)],
      caption: `React calls Dashboard with clicks = ${clicks}. Its JSX creates a brand-new { theme: 'dark' } object for Chart, as every render does.`,
      data: data({ panes: renderPanes(t3), hooks: hooksR }),
    },
    line('[render]', `Dashboard · clicks = ${clicks}`, 'render'),
  )
  const t4 = treeB({ button: { state: 'render' }, chart: memoBailed ? { state: 'skip', tag: 'memo ✓' } : { state: 'reconcile', tag: 'memo ✕' }, svg: { state: 'pending' } })
  b.step(
    {
      phase: 'render',
      activeLine: 11,
      notes: { 11: '← new object ≠ old object' },
      playhead: PLAYHEAD[4],
      wipTree: t4,
      queue: [queueRow(u, 'applied', `applied → ${clicks}`)],
      caption: memoBailed
        ? 'memo compared the props and found them equal, so Chart is skipped.'
        : "memo compares each prop with Object.is. The old options and the new options look the same, but they are two different objects, so the check fails.",
      data: data({ panes: renderPanes(t4), hooks: hooksR }),
    },
    line('[render]', memoBailed ? 'memo(Chart) · props equal → skip' : 'memo(Chart) · options changed (new object) → render', 'render'),
  )
  const t5 = treeB({ button: { state: 'render' }, chart: { state: chartRendered ? 'render' : 'skip', tag: chartRendered ? 'memo ✕' : 'memo ✓' }, svg: { state: chartRendered ? 'render' : 'skip' } })
  b.step(
    {
      phase: 'render',
      activeLine: 2,
      playhead: PLAYHEAD[5],
      wipTree: t5,
      caption: chartRendered
        ? 'So React calls Chart anyway. It returns exactly the same <svg className="dark"> as last time. That render was wasted work.'
        : 'Chart was skipped, so its <svg> is reused as it is.',
      data: data({ panes: renderPanes(t5), hooks: hooksR }),
    },
    line('[render]', 'Chart · same output as before', 'render'),
  )
  const t6 = treeB({ button: { state: 'reconcile' }, chart: { state: 'render', tag: 'memo ✕' }, svg: { state: svgChanged ? 'reconcile' : 'idle' } })
  b.step(
    {
      phase: 'reconcile',
      activeLine: 10,
      playhead: PLAYHEAD[6],
      wipTree: t6,
      caption: 'The diff finds one change: the button text. The <svg> is identical, so Chart rendered for nothing.',
      data: data({ panes: renderPanes(t6), hooks: hooksR }),
    },
    line('[reconcile]', `1 change: text of <button> · <svg> unchanged`, 'reconcile'),
  )

  const ops = domOpsOf(root.commit())
  const oldA = allNodes(base, { state: 'skip', trigger: false })
  const done = (nodes: Record<string, Partial<TreeNode>>) => treeB({ chart: { tag: 'memo ✕' }, ...nodes }, true)
  const donePanes = (tree: TreeNode[]): PgData['panes'] => [
    pane('alternate', oldA, fields('last frame', init)),
    pane('current', tree, fields('on screen', clicks, field('flags', flagsText(root.find('dashboard'))))),
  ]
  b.step(
    {
      phase: 'commit',
      activeLine: 10,
      playhead: PLAYHEAD[7],
      tree: oldA,
      wipTree: done({ button: { state: 'dom' } }),
      rootCurrent: 'wip',
      domOps: ops,
      queue: [queueRow(u, 'cleared', 'applied · cleared')],
      preview: { values: { clicks: String(clicks) }, highlight: ['clicks'] },
      caption: `Commit: ${ops.length} DOM write for the button text, and root.current swaps. Chart contributed nothing to it.`,
      data: data({ panes: donePanes(done({ button: { state: 'dom' } })), swapBanner: true, hooks: hooks(String(clicks)) }),
    },
    line('[commit]', `${ops.length} DOM operation · root.current swapped`, 'commit'),
  )
  root.paint()
  b.step(
    {
      phase: 'commit',
      playhead: PLAYHEAD[8],
      wipTree: done({}),
      preview: { values: { clicks: String(clicks) } },
      caption: "Painted. memo only helps when props are equal under Object.is. Move the object outside the component, or wrap it in useMemo, and Chart will be skipped.",
      data: data({ panes: donePanes(done({})), swapBanner: true, hooks: hooks(String(clicks)) }),
    },
    line('[paint]', 'frame F3 painted · Chart rendered 1 time for nothing', 'commit'),
  )
  return b.build()
}

export const memoObjectProp: PresetDef = {
  id: 'memo-object-prop',
  label: 'memo broken by a new object prop',
  file: 'Dashboard.jsx',
  code: MEMO_CODE,
  paramNote: 'The highlighted value is editable: the initial click count.',
  previewHint: 'click the button',
  colWidth: 104,
  scenario: memoObjectPropTrace,
}
