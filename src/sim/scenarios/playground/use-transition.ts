import { component, createRoot, domOpsOf, eventsOf, Fragment, h, memo, renderOrder, toTreeNodes, useState, useTransition, type Root } from '../../model'
import type { TreeNode, Update } from '../../types'
import { allNodes, field, hookRows, line, pane, patchHooks, pgBuilder, queueRow, show, withNodes, type PgData, type PgPane, type PresetDef, type TLBlock } from './shared'

/**
 * Preset 8 · useTransition with a heavy list. Each keystroke makes an urgent update (the input,
 * SyncLane) and a transition (the filtered list, TransitionLane). The transition render works in
 * chunks; a second keystroke arrives mid-render, React throws that work away, handles the
 * keystroke first, then renders the list once for the latest text. No editable values.
 */
export const TRANSITION_CODE =
  "function Search() {\n  const [query, setQuery] = useState('');\n  const [filter, setFilter] = useState('');\n  const [isPending, startTransition] = useTransition();\n\n  function onChange(e) {\n    setQuery(e.target.value);        // urgent: the input\n    startTransition(() => {\n      setFilter(e.target.value);     // can wait: the list\n    });\n  }\n\n  return (\n    <>\n      <input value={query} onChange={onChange} />\n      {isPending && <small>Updating…</small>}\n      <HeavyList filter={filter} />\n    </>\n  );\n}\n\nconst HeavyList = memo(function HeavyList({ filter }) {\n  return <ul>{search(filter).map(w => <Row key={w} word={w} />)}</ul>;\n});"

/** What search() finds: the first three words that start with the filter (think 5,000 rows). */
const WORDS = ['angular', 'ember', 'preact', 'ruby', 'rust', 'react', 'redux', 'relay', 'solid', 'svelte', 'vue', 'qwik', 'lit', 'elm', 'alpine']
export const search = (filter: string) => WORDS.filter((w) => w.startsWith(filter)).slice(0, 3)

const BLOCKS: TLBlock[] = [
  { start: 3, width: 2, kind: 'trigger', title: 'keystroke 1' },
  { start: 5.4, width: 3, kind: 'render', title: 'urgent render: the input' },
  { start: 8.8, width: 1.6, kind: 'commit', title: 'commit' },
  { start: 12.4, width: 3, kind: 'paint', title: 'paint' },
  { start: 17.6, width: 9.4, kind: 'render', title: 'transition render, chunk 1', after: { playhead: 31, kind: 'gone', title: 'thrown away' } },
  { start: 27.6, width: 2, kind: 'trigger', title: 'keystroke 2' },
  { start: 30, width: 3, kind: 'render', title: 'urgent render: the input' },
  { start: 33.4, width: 1.6, kind: 'commit', title: 'commit' },
  { start: 36, width: 3, kind: 'paint', title: 'paint' },
  { start: 40, width: 7, kind: 'render', title: 'transition render, restarted' },
  { start: 47.4, width: 1.8, kind: 'commit', title: 'commit the list' },
  { start: 51, width: 3, kind: 'paint', title: 'paint' },
]
const PLAYHEAD = [1, 4, 7, 9.8, 13.5, 22, 28.6, 31.5, 34.4, 37.5, 44, 48.4, 52.5]

function app() {
  const Row = component('Row', (p: { word: string }) => h('li', null, p.word))
  const HeavyList = memo(
    component('HeavyList', (p: { filter: string }) =>
      h(
        'ul',
        { $id: 'ul' },
        search(p.filter).map((w) => h(Row, { key: w, word: w })),
      ),
    ),
  )
  const Search = component('Search', () => {
    const [query, setQuery] = useState('', 'query')
    const [filter, setFilter] = useState('', 'filter')
    const [isPending, startTransition] = useTransition()
    const onChange = (e: { target: { value: string } }) => {
      setQuery(e.target.value, `setQuery(${show(e.target.value)})`)
      startTransition(() => setFilter(e.target.value, `setFilter(${show(e.target.value)})`))
    }
    return h(
      Fragment,
      null,
      h('input', { $id: 'input', value: query, onChange }),
      isPending ? h('small', { $id: 'small' }, 'Updating…') : null,
      h(HeavyList, { $id: 'list', filter }),
    )
  })
  return h(Search, { $id: 'search' })
}

const snapshot = (root: Root, tree: 'current' | 'wip' = 'current'): TreeNode[] =>
  toTreeNodes(root, { tree, collapse: [] })
    .filter((n) => !/\/li$/.test(n.id))
    .map((n) => (n.label === 'Row' ? { ...n, tag: n.key ?? undefined } : n.id === 'list' ? { ...n, tag: 'memo' } : n))

const stateOf = (root: Root, tree: 'current' | 'wip' = 'current') => {
  const hk = root.find('search', tree)?.memoizedState
  return { query: hk?.memoizedState as string, filter: hk?.next?.memoizedState as string, pending: hk?.next?.next?.memoizedState as boolean }
}

/** The update queue as the model left it. */
function liveQueue(root: Root, activeFrom = Infinity): Update[] {
  return root.updates.map((u, i) => {
    const res =
      u.status === 'waiting'
        ? 'waiting'
        : u.status === 'skipped'
          ? 'skipped · lower priority'
          : u.status === 'interrupted'
            ? 'thrown away · will redo'
            : u.status === 'cleared'
              ? 'applied · cleared'
              : `applied → ${show(u.result)}`
    return queueRow(u, u.status, res, i >= activeFrom)
  })
}

/** The two keystrokes. */
const KEYS = ['r', 'e'] as const

export function useTransitionTrace() {
  const [k1, k2] = KEYS
  const q1 = k1
  const q2 = k1 + k2
  const root = createRoot(app())
  root.mount()
  const type = (value: string) => {
    const f = root.find('input')
    const handler = f?.memoizedProps?.onChange as (e: { target: { value: string } }) => void
    return root.event(`input on <input>`, () => handler({ target: { value } }))
  }
  const base = snapshot(root)
  const s0 = stateOf(root)
  const tag = (s: ReturnType<typeof stateOf>) => `"${s.query}" · "${s.filter}"`
  const fields = (status: string, s: ReturnType<typeof stateOf> | null, lanes: string | null = null) => [
    field('Search', status, 'label'),
    field('memoizedState', s ? `query "${s.query}" · filter "${s.filter}"` : '—'),
    field('lanes', lanes ?? 'none', lanes ? 'trigger' : undefined),
    field('alternate', '→ other tree'),
  ]
  const preview = (s: ReturnType<typeof stateOf>, highlight: string[] = []) => ({
    values: { query: s.query, pending: s.pending, rows: search(s.filter), next: s.query === '' ? q1 : s.query === q1 ? q2 : '' },
    ...(highlight.length ? { highlight } : {}),
  })
  const hooksOf = (tree: 'current' | 'wip', patch: Parameters<typeof patchHooks>[1] = {}) => ({ search: patchHooks(hookRows(root.find('search', tree)), patch) })
  const data = (d: Partial<PgData> & Pick<PgData, 'panes'>): PgData => ({ swapBanner: false, hooks: hooksOf('current'), focus: 'search', queueOf: 'Search', ...d })
  const t0 = withNodes(base, { search: { tag: tag(s0) } })
  const emptyB = pane('empty', [], fields('not created', null))

  const b = pgBuilder(BLOCKS, {
    phase: 'trigger',
    caption: `Pretend HeavyList renders 5,000 rows. Type in the preview (or press step) and we'll send "${k1}", then "${k2}" while the list is still rendering.`,
    code: TRANSITION_CODE,
    playhead: PLAYHEAD[0],
    tree: t0,
    rootCurrent: 'current',
    queue: [],
    effects: [],
    preview: preview(s0),
    data: data({ panes: [pane('current', t0, fields('on screen', s0)), emptyB] }),
  })

  /* Keystroke 1 */
  type(q1)
  const trig0 = withNodes(t0, { search: { trigger: true } })
  b.step(
    {
      phase: 'trigger',
      activeLine: 7,
      playhead: PLAYHEAD[1],
      tree: trig0,
      queue: liveQueue(root, 0),
      caption: `You typed "${k1}". setQuery is urgent: SyncLane. Inside startTransition, setFilter and isPending → false go on TransitionLane, which can wait.`,
      data: data({ panes: [pane('current', trig0, fields('on screen', s0, 'SyncLane · TransitionLane')), emptyB] }),
    },
    line('[event]', `keystroke "${k1}" → 2 urgent + 2 transition updates`, 'trigger'),
  )

  // Urgent render: only SyncLane updates are applied.
  const r1 = root.render()
  const s1 = stateOf(root, 'wip')
  const memoSkipped = eventsOf(r1.events, 'bailout').some((e) => e.fiberId === 'list')
  const wip1 = snapshot(root, 'wip')
  const urgentTree = (state: TreeNode['state'], done = false) =>
    withNodes(wip1, { search: { state: done ? 'idle' : 'render', tag: tag(s1) }, input: { state }, small: { state }, list: { state: done ? 'idle' : memoSkipped ? 'skip' : 'render', tag: 'memo' } })
  b.step(
    {
      phase: 'render',
      activeLine: 2,
      notes: { 2: `← "${s1.query}"`, 3: `← still "${s1.filter}"` },
      playhead: PLAYHEAD[2],
      tree: t0,
      wipTree: urgentTree('render'),
      queue: liveQueue(root),
      caption: `The urgent render applies only the SyncLane updates: query = "${s1.query}" and isPending = true. The transition updates are skipped for now, so filter is still "${s1.filter}" and memo skips HeavyList.`,
      data: data({ panes: [pane('current', t0, fields('on screen', s0, 'SyncLane · TransitionLane')), pane('wip', urgentTree('render'), fields('being built', s1))], hooks: hooksOf('wip', { 0: { tone: 'render', hot: true } }) }),
    },
    line('[render]', `urgent (SyncLane) · query "${s1.query}" · HeavyList skipped`, 'render'),
  )
  const ops1 = domOpsOf(root.commit())
  const oldA = allNodes(t0, { state: 'skip', trigger: false })
  const c1Panes = (t: TreeNode[]): PgPane[] => [pane('alternate', oldA, fields('last frame', s0)), pane('current', t, fields('on screen', s1, 'TransitionLane'))]
  b.step(
    {
      phase: 'commit',
      activeLine: 15,
      playhead: PLAYHEAD[3],
      tree: oldA,
      wipTree: urgentTree('dom', true),
      rootCurrent: 'wip',
      domOps: ops1,
      queue: liveQueue(root),
      caption: `Commit: ${ops1.length} DOM writes for the input and the "Updating…" hint. The list wasn't touched.`,
      data: data({ panes: c1Panes(urgentTree('dom', true)) as PgData['panes'], swapBanner: true }),
    },
    line('[commit]', `${ops1.length} DOM operations · input shows "${s1.query}"`, 'commit'),
  )
  root.paint()
  const shown1 = urgentTree('idle', true)
  b.step(
    {
      phase: 'commit',
      playhead: PLAYHEAD[4],
      wipTree: shown1,
      preview: preview(stateOf(root)),
      caption: `Painted. "${s1.query}" is in the input within the same frame as the keystroke, even though the list hasn't started.`,
      data: data({ panes: c1Panes(shown1) as PgData['panes'], swapBanner: true }),
    },
    line('[paint]', `frame F1 painted · input "${s1.query}"`, 'commit'),
  )

  // Transition render: yields partway through the list.
  const r2 = root.render({ budget: 6 })
  const sT = stateOf(root, 'wip')
  const begun = new Set(renderOrder(r2.events))
  const wipT = snapshot(root, 'wip')
  const ownerBegun = (n: TreeNode) => (n.id === 'input' || n.id === 'small' ? begun.has('search') : n.id === 'ul' ? begun.has('list') : begun.has(n.id))
  const partialTree = wipT.map((n) => ({ ...n, state: ownerBegun(n) ? ('render' as const) : ('pending' as const), ...(n.id === 'search' ? { tag: tag(sT) } : {}) }))
  const transitionPanes = (t: TreeNode[]): PgData['panes'] => [pane('wip', t, fields('being built', sT)), pane('current', shown1, fields('on screen', s1, 'TransitionLane'))]
  b.step(
    {
      phase: 'render',
      activeLine: 23,
      notes: { 3: `← "${sT.filter}"` },
      playhead: PLAYHEAD[5],
      tree: partialTree,
      wipTree: shown1,
      queue: liveQueue(root),
      caption: `Now the transition render: filter = "${sT.filter}", building in the left tree. It works in small chunks and yields to the browser between them, so the page stays responsive.`,
      data: data({ panes: transitionPanes(partialTree), swapBanner: false, hooks: hooksOf('wip', { 1: { tone: 'render', hot: true } }) }),
    },
    line('[render]', `transition (TransitionLane) · filter "${sT.filter}" · yielded after ${begun.size} components`, 'render'),
  )

  /* Keystroke 2, mid-render */
  type(q2)
  const trigB = withNodes(shown1, { search: { trigger: true } })
  b.step(
    {
      phase: 'trigger',
      activeLine: 7,
      playhead: PLAYHEAD[6],
      wipTree: trigB,
      queue: liveQueue(root, root.updates.length - 4),
      caption: `You typed "${k2}" before the list finished. Another urgent setQuery("${q2}") arrives on SyncLane, plus a new transition.`,
      data: data({ panes: [pane('wip', partialTree, fields('being built', sT)), pane('current', trigB, fields('on screen', s1, 'SyncLane · TransitionLane'))], swapBanner: false }),
    },
    line('[event]', `keystroke "${k2}" during the transition render`, 'trigger'),
  )

  const r3 = root.render()
  const interrupted = eventsOf(r3.events, 'interrupt').length > 0
  const s3 = stateOf(root, 'wip')
  const wip3 = snapshot(root, 'wip')
  const urgent2 = (state: TreeNode['state'], done = false) =>
    withNodes(wip3, { search: { state: done ? 'idle' : 'render', tag: tag(s3) }, input: { state }, list: { state: done ? 'idle' : 'skip', tag: 'memo' } })
  b.step(
    {
      phase: 'render',
      activeLine: 2,
      notes: { 2: `← "${s3.query}"` },
      playhead: PLAYHEAD[7],
      tree: urgent2('render'),
      wipTree: shown1,
      queue: liveQueue(root),
      caption: interrupted
        ? `Higher priority wins. React throws away the unfinished list render and renders the urgent update first: query = "${s3.query}".`
        : `React renders the urgent update first: query = "${s3.query}".`,
      data: data({ panes: [pane('wip', urgent2('render'), fields('being built', s3)), pane('current', shown1, fields('on screen', s1, 'SyncLane · TransitionLane'))], swapBanner: false, hooks: hooksOf('wip', { 0: { tone: 'render', hot: true } }) }),
    },
    line('[render]', `${interrupted ? 'transition interrupted · ' : ''}urgent · query "${s3.query}"`, interrupted ? 'error' : 'render'),
  )
  const ops2 = domOpsOf(root.commit())
  root.paint()
  const shown2 = urgent2('idle', true)
  const oldB = allNodes(shown1, { state: 'skip', trigger: false })
  b.step(
    {
      phase: 'commit',
      activeLine: 15,
      playhead: PLAYHEAD[8],
      tree: urgent2('dom', true),
      wipTree: oldB,
      rootCurrent: 'current',
      domOps: ops2,
      queue: liveQueue(root),
      preview: preview(stateOf(root), ['query']),
      caption: `Commit and paint: the input shows "${s3.query}" right away. The list still shows the old results; its transition is pending.`,
      data: data({ panes: [pane('current', urgent2('dom', true), fields('on screen', s3, 'TransitionLane')), pane('alternate', oldB, fields('last frame', s1))], swapBanner: true }),
    },
    line('[commit]', `${ops2.length} DOM operation${ops2.length === 1 ? '' : 's'} · input "${s3.query}" · painted`, 'commit'),
  )
  b.step(
    {
      phase: 'commit',
      playhead: PLAYHEAD[9],
      tree: shown2,
      preview: preview(stateOf(root)),
      caption: `Two keystrokes, and the input never waited for the list. The list will render once, for "${q2}", not for "${q1}".`,
      data: data({ panes: [pane('current', shown2, fields('on screen', s3, 'TransitionLane')), pane('alternate', oldB, fields('last frame', s1))], swapBanner: true }),
    },
    line('[paint]', `frame F3 painted · input "${s3.query}"`, 'commit'),
  )

  // Transition restarts with the latest filter and finishes.
  const r4 = root.render()
  const s4 = stateOf(root, 'wip')
  const wip4 = snapshot(root, 'wip')
  const prevRows = new Set(base.filter((n) => n.label === 'Row').map((n) => n.id))
  const rowsNow = new Set(wip4.filter((n) => n.label === 'Row').map((n) => n.id))
  const listTree = (done: boolean, dom = false): TreeNode[] => [
    ...withNodes(
      wip4,
      Object.fromEntries(
        wip4.map((n) => [
          n.id,
          n.id === 'search'
            ? { state: done ? 'idle' : 'render', tag: tag(s4) }
            : n.id === 'list' || n.label === 'Row' || n.id === 'ul'
              ? { state: done ? (dom && n.label === 'Row' ? 'dom' : 'idle') : n.label === 'Row' && !prevRows.has(n.id) ? 'reconcile' : 'render' }
              : { state: n.id === 'small' ? 'removed' : 'idle' },
        ]),
      ),
    ),
    ...(done ? [] : base.filter((n) => n.label === 'Row' && !rowsNow.has(n.id)).map((n) => ({ ...n, state: 'removed' as const }))),
  ]
  b.step(
    {
      phase: 'render',
      activeLine: 23,
      notes: { 3: `← "${s4.filter}"` },
      playhead: PLAYHEAD[10],
      tree: shown2,
      wipTree: listTree(false),
      queue: liveQueue(root),
      caption: `The transition starts over with filter = "${s4.filter}" and finishes this time. Old rows are matched by key: new words are created, the rest removed.`,
      data: data({ panes: [pane('current', shown2, fields('on screen', s3, 'TransitionLane')), pane('wip', listTree(false), fields('being built', s4))], swapBanner: false, hooks: hooksOf('wip', { 1: { tone: 'render', hot: true }, 2: { tone: 'render', hot: true } }) }),
    },
    line('[render]', `transition · filter "${s4.filter}" · ${eventsOf(r4.events, 'render').length} components`, 'render'),
  )
  const ops3 = domOpsOf(root.commit())
  const oldA2 = allNodes(shown2, { state: 'skip', trigger: false })
  b.step(
    {
      phase: 'commit',
      activeLine: 23,
      playhead: PLAYHEAD[11],
      tree: oldA2,
      wipTree: listTree(true, true),
      rootCurrent: 'wip',
      domOps: ops3,
      queue: liveQueue(root),
      caption: `Commit: ${ops3.length} DOM operations replace the list and remove the "Updating…" hint, in one go.`,
      data: data({ panes: [pane('alternate', oldA2, fields('last frame', s3)), pane('current', listTree(true, true), fields('on screen', s4))], swapBanner: true }),
    },
    line('[commit]', `${ops3.length} DOM operations · list for "${s4.filter}"`, 'commit'),
  )
  root.paint()
  root.flush()
  b.step(
    {
      phase: 'commit',
      playhead: PLAYHEAD[12],
      wipTree: listTree(true),
      preview: preview(stateOf(root)),
      caption: `Painted: ${search(s4.filter).join(', ')}. The input stayed instant the whole time, and the list rendered for "${q1}" was simply dropped.`,
      data: data({ panes: [pane('alternate', oldA2, fields('last frame', s3)), pane('current', listTree(true), fields('on screen', s4))], swapBanner: true }),
    },
    line('[paint]', `frame F4 painted · ${search(s4.filter).length} rows`, 'commit'),
  )
  return b.build()
}

export const useTransitionPreset: PresetDef = {
  id: 'use-transition',
  label: 'useTransition with a heavy list',
  file: 'Search.jsx',
  code: TRANSITION_CODE,
  paramNote: null,
  previewHint: 'type in the input',
  colWidth: 76,
  scenario: useTransitionTrace,
}
