import { component, createRoot, domOpsOf, eventsOf, Fragment, h, toTreeNodes, useState, type DomNode, type Root } from '../../model'
import type { DomOp, TreeNode } from '../../types'
import { allNodes, field, line, pane, pgBuilder, queueRow, type PgData, type PgHook, type PresetDef, type TLBlock } from './shared'

/**
 * Preset 4 · Index versus id keys. Remove the first row of a list whose rows hold typed text in
 * uncontrolled inputs. With `key={index}` React keeps the first two rows and rewrites their
 * labels, so the typed text ends up next to the wrong item; with `key={item.id}` it removes
 * exactly one row. The key expression is the editable param.
 */
export const KEYS_CODE =
  "function List() {\n  const [items, setItems] = useState(ITEMS);\n\n  return (\n    <>\n      <button onClick={() => setItems(items.slice(1))}>Remove first</button>\n      <ul>\n        {items.map((item, index) => (\n          <Row key={⟦index⟧} label={item.label} />\n        ))}\n      </ul>\n    </>\n  );\n}\n\nfunction Row({ label }) {\n  // the <input> keeps its own text in the DOM\n  return <li>{label} <input /></li>;\n}"

const ITEMS = [
  { id: 1, label: 'Milk', typed: '2 litres' },
  { id: 2, label: 'Bread', typed: 'sourdough' },
  { id: 3, label: 'Eggs', typed: 'a dozen' },
]

const BLOCKS: TLBlock[] = [
  { start: 18, width: 3, kind: 'trigger', title: 'click + handler' },
  { start: 21.4, width: 4, kind: 'render', title: 'render List and rows' },
  { start: 25.8, width: 2.2, kind: 'reconcile', title: 'match keys' },
  { start: 28.4, width: 2, kind: 'commit', title: 'commit' },
  { start: 31, width: 3, kind: 'paint', title: 'paint' },
]
const PLAYHEAD = [10, 18.6, 20.6, 22.4, 24.6, 27, 29.4, 32.6]

export type KeyBy = 'index' | 'id' | 'label'

/** `index` → index keys, `item.id` → id keys, `item.label` → label keys; anything else: index. */
export function keyByParam(v: string | undefined): KeyBy {
  const s = String(v ?? '').trim()
  if (/^(item\.)?id$/.test(s)) return 'id'
  if (/^(item\.)?label$/.test(s)) return 'label'
  return 'index'
}

function app(keyBy: KeyBy) {
  const Row = component('Row', (p: { label: string }) => h('li', null, p.label, ' ', h('input', null)))
  const List = component('List', () => {
    const [items, setItems] = useState(ITEMS, 'items')
    const keyOf = (it: (typeof ITEMS)[number], i: number) => (keyBy === 'id' ? it.id : keyBy === 'label' ? it.label : i)
    return h(
      Fragment,
      null,
      h('button', { $id: 'button', onClick: () => setItems(items.slice(1), `setItems(items.slice(1))`) }, 'Remove first'),
      h('ul', { $id: 'ul' }, items.map((it, i) => h(Row, { key: keyOf(it, i), label: it.label }))),
    )
  })
  return h(List, { $id: 'list' })
}

/** Rows as the user sees them: label, the text in that row's input, and whether it belongs there. */
function readRows(root: Root, typedBy: Map<DomNode, string>) {
  const ul = root.dom('ul')
  const rows = (ul?.children ?? []).map((li) => {
    const label = li.children[0]?.text ?? ''
    const input = li.children.find((c) => c.tag === 'input')
    const typed = (input && typedBy.get(input)) ?? ''
    const owner = ITEMS.find((it) => it.typed === typed)
    return { label, typed, ok: owner?.label === label }
  })
  return rows
}

const previewOf = (rows: ReturnType<typeof readRows>, highlight = false) => ({
  values: { labels: rows.map((r) => r.label), typed: rows.map((r) => r.typed), ok: rows.map((r) => (r.ok ? '1' : '0')) },
  ...(highlight ? { highlight: ['rows'] } : {}),
})

const snapshot = (root: Root, tree: 'current' | 'wip' = 'current'): TreeNode[] =>
  toTreeNodes(root, { tree, collapse: ['button'], label: (f) => f.name })
    .filter((n) => n.id !== 'button' && !/\/li/.test(n.id) && n.label !== 'Fragment')
    .map((n) => (n.label === 'Row' ? { ...n, tag: `key ${n.key}` } : n.id === 'ul' ? { ...n, parent: 'list' } : n))

export function keysTrace(params: readonly string[]) {
  const keyBy = keyByParam(params[0])
  const root = createRoot(app(keyBy))
  root.mount()
  const typedBy = new Map<DomNode, string>()
  for (const li of root.dom('ul')?.children ?? []) {
    const input = li.children.find((c) => c.tag === 'input')
    const item = ITEMS.find((it) => it.label === li.children[0]?.text)
    if (input && item) typedBy.set(input, item.typed)
  }
  const rows0 = readRows(root, typedBy)
  const base = snapshot(root)
  const keyText = keyBy === 'index' ? 'key={index}' : keyBy === 'id' ? 'key={item.id}' : 'key={item.label}'
  const listHooks = (val: string, extra: Partial<PgHook> = {}): Record<string, PgHook[]> => ({ list: [{ n: 0, type: 'useState', val, ...extra }] })
  const fields = (status: string, items: string, extra = field('keys', base.filter((n) => n.label === 'Row').map((n) => n.key).join(', '))) => [
    field('List', status, 'label'),
    field('memoizedState', items),
    extra,
    field('alternate', '→ other tree'),
  ]
  const names = (xs: { label: string }[]) => `[${xs.map((x) => x.label).join(', ')}]`
  const data = (d: Partial<PgData> & Pick<PgData, 'panes'>): PgData => ({ swapBanner: false, hooks: listHooks(names(ITEMS)), focus: 'list', queueOf: 'List', ...d })
  const emptyB = pane('empty', [], fields('not created', '—', field('keys', '—')))

  const b = pgBuilder(BLOCKS, {
    phase: 'trigger',
    caption: `Each row's input already holds text you typed. Click "Remove first" in the preview and watch which text survives with ${keyText}.`,
    code: KEYS_CODE,
    playhead: PLAYHEAD[0],
    tree: base,
    rootCurrent: 'current',
    queue: [],
    effects: [],
    preview: previewOf(rows0),
    data: data({ panes: [pane('current', base, fields('on screen', names(ITEMS))), emptyB] }),
  })

  root.click('button')
  const [u] = root.updates
  const trig = base.map((n) => (n.id === 'list' ? { ...n, trigger: true } : n))
  b.step(
    {
      phase: 'trigger',
      activeLine: 6,
      playhead: PLAYHEAD[1],
      tree: trig,
      caption: 'You clicked "Remove first". The handler builds a new array without Milk and passes it to setItems.',
      data: data({ panes: [pane('current', trig, fields('on screen', names(ITEMS))), emptyB] }),
    },
    line('[event]', 'click on <button> → setItems()', 'trigger'),
  )
  b.step(
    {
      phase: 'trigger',
      activeLine: 6,
      notes: { 6: '← [Bread, Eggs]' },
      playhead: PLAYHEAD[2],
      queue: [queueRow(u, 'waiting', 'waiting', true, 'setItems([Bread, Eggs])')],
      caption: "setItems queues the new array on List's queue and schedules a render on SyncLane.",
      data: data({ panes: [pane('current', trig, fields('on screen', names(ITEMS))), emptyB], hooks: listHooks(`${names(ITEMS)} · 1 queued`) }),
    },
    line('[schedule]', 'setItems → 1 render (SyncLane)', 'trigger'),
  )

  const r = root.render()
  const after = ITEMS.slice(1)
  const reconcile = eventsOf(r.events, 'reconcile').filter((e) => e.name === 'Row')
  const deleted = new Set(reconcile.filter((e) => e.action === 'delete').map((e) => e.fiberId))
  const labelChanged = new Set(
    eventsOf(r.events, 'complete')
      .filter((e) => !e.created && e.changes.length)
      .map((e) => base.find((n) => n.label === 'Row' && e.fiberId.startsWith(`${n.id}/`))?.id)
      .filter((id): id is string => !!id),
  )
  const wipRows = snapshot(root, 'wip').filter((n) => n.label === 'Row')
  const wipIds = new Set(wipRows.map((n) => n.id))
  const rowLabel = (id: string) => {
    const f = root.find(id, 'wip')
    return (f?.memoizedProps ?? f?.pendingProps)?.label as string | undefined
  }
  const prevLabel = (id: string) => root.find(id)?.memoizedProps?.label as string | undefined
  /** The new tree drawn over the old one: rows that are gone stay visible as removed. */
  const treeB = (rowState: (id: string) => Partial<TreeNode>, listState: Partial<TreeNode>, removedVisible = true) =>
    base
      .filter((n) => removedVisible || !deleted.has(n.id))
      .map((n) => {
        if (n.id === 'list') return { ...n, ...listState }
        if (n.label !== 'Row') return { ...n }
        if (deleted.has(n.id)) return { ...n, state: 'removed' as const, tag: `key ${n.key}` }
        return { ...n, ...rowState(n.id) }
      })
  const rendering = (id: string): Partial<TreeNode> => (wipIds.has(id) ? { state: 'render', title: rowLabel(id) } : {})
  const renderPanes = (tree: TreeNode[]): PgData['panes'] => [pane('current', base, fields('on screen', names(ITEMS))), pane('wip', tree, fields('being built', names(after), field('keys', wipRows.map((n) => n.key).join(', '))))]
  const hooksR = listHooks(`${names(ITEMS)} → ${names(after)}`, { tone: 'render', hot: true })

  const listOnly = treeB(() => ({ state: 'pending' }), { state: 'render' }).filter((n) => !deleted.has(n.id))
  b.step(
    {
      phase: 'render',
      activeLine: 2,
      notes: { 2: `← ${names(after)}` },
      playhead: PLAYHEAD[3],
      tree: base,
      wipTree: listOnly,
      queue: [queueRow(u, 'processing', `applied → ${names(after)}`, false, 'setItems([Bread, Eggs])')],
      caption: 'React calls List with the new array. It maps two items to two Row elements, each with a key.',
      data: data({ panes: renderPanes(listOnly), hooks: hooksR }),
    },
    line('[render]', `List · items = ${names(after)}`, 'render'),
  )
  const rowsRendering = treeB(rendering, { state: 'render' }).filter((n) => !deleted.has(n.id))
  b.step(
    {
      phase: 'render',
      activeLine: 9,
      notes: { 9: keyBy === 'index' ? '← keys 0, 1' : `← keys ${wipRows.map((n) => n.key).join(', ')}` },
      playhead: PLAYHEAD[4],
      wipTree: rowsRendering,
      caption:
        keyBy === 'index'
          ? 'With key={index}, Bread now has key 0 and Eggs key 1. Those are the keys Milk and Bread had a moment ago.'
          : `With ${keyText}, Bread and Eggs keep the keys they had before. Only Milk's key is missing.`,
      data: data({ panes: renderPanes(rowsRendering), hooks: hooksR }),
    },
    line('[render]', `Row × ${wipRows.length} · keys ${wipRows.map((n) => n.key).join(', ')}`, 'render'),
  )
  const matched = treeB((id) => ({ state: labelChanged.has(id) ? 'reconcile' : 'idle', tag: `key ${base.find((n) => n.id === id)?.key}` }), { state: 'render' })
  const matchText = base
    .filter((n) => n.label === 'Row')
    .map((n) => (deleted.has(n.id) ? `key ${n.key}: remove` : labelChanged.has(n.id) ? `key ${n.key}: ${prevLabel(n.id)} → ${rowLabel(n.id)}` : `key ${n.key}: keep`))
  b.step(
    {
      phase: 'reconcile',
      activeLine: 9,
      playhead: PLAYHEAD[5],
      wipTree: matched,
      caption:
        keyBy === 'index'
          ? "React matches old and new rows by key. Keys 0 and 1 still exist, so it keeps those rows and only changes their labels. Key 2 is gone, so the last row, the one that really held Eggs' text, is removed."
          : 'React matches old and new rows by key. Bread and Eggs are the same rows as before, untouched. Only the Milk row is gone.',
      data: data({ panes: renderPanes(matched), hooks: hooksR }),
    },
    line('[reconcile]', matchText.join(' · '), 'reconcile'),
  )

  const commitEvents = root.commit()
  const ops: DomOp[] = domOpsOf(commitEvents)
  const rows1 = readRows(root, typedBy)
  const wrong = rows1.some((r) => !r.ok)
  const oldA = allNodes(base, { state: 'skip', trigger: false })
  const touched = (id: string) => ops.some((o) => o.nodeId?.startsWith(`${id}/`) || o.nodeId === id)
  const committed = treeB((id) => ({ state: touched(id) ? 'dom' : 'idle' }), { state: 'idle', trigger: false })
  const finalTree = treeB(() => ({ state: 'idle' }), { state: 'idle', trigger: false }, false).filter((n) => !deleted.has(n.id))
  const donePanes = (tree: TreeNode[]): PgData['panes'] => [
    pane('alternate', oldA, fields('last frame', names(ITEMS))),
    pane('current', tree, fields('on screen', names(after), field('keys', wipRows.map((n) => n.key).join(', ')))),
  ]
  const doneHooks = listHooks(names(after))
  b.step(
    {
      phase: 'commit',
      activeLine: 18,
      playhead: PLAYHEAD[6],
      tree: oldA,
      wipTree: committed,
      rootCurrent: 'wip',
      domOps: ops,
      queue: [queueRow(u, 'cleared', 'applied · cleared', false, 'setItems([Bread, Eggs])')],
      preview: previewOf(rows1, true),
      caption:
        keyBy === 'index'
          ? `Commit: ${ops.length} DOM operations. Two label texts are rewritten and the last <li> is removed. The <input> elements were never touched, so the typed text stayed where it was.`
          : `Commit: ${ops.length} DOM operation${ops.length === 1 ? '' : 's'}. React removes the Milk <li>, input and all. The other rows are the same DOM nodes as before.`,
      data: data({ panes: donePanes(committed), swapBanner: true, hooks: doneHooks }),
    },
    line('[commit]', `${ops.length} DOM operation${ops.length === 1 ? '' : 's'} · root.current swapped`, 'commit'),
  )
  root.paint()
  b.step(
    {
      phase: 'commit',
      playhead: PLAYHEAD[7],
      wipTree: finalTree,
      preview: previewOf(rows1),
      caption: wrong
        ? `Painted, and wrong: ${rows1.map((r) => `${r.label} shows "${r.typed}"`).join(', ')}. Change the key to item.id in the code and run it again.`
        : `Painted, and right: ${rows1.map((r) => `${r.label} keeps "${r.typed}"`).join(', ')}. A stable key per item is what makes that work.`,
      data: data({ panes: donePanes(finalTree), swapBanner: true, hooks: doneHooks }),
    },
    line('[paint]', wrong ? 'frame F2 painted · typed text on the wrong rows' : 'frame F2 painted · every row kept its text', wrong ? 'error' : 'commit'),
  )
  return b.build()
}

export const keys: PresetDef = {
  id: 'keys',
  label: 'Index versus id keys',
  file: 'List.jsx',
  code: KEYS_CODE,
  paramNote: 'The highlighted key is editable: try index, then item.id.',
  previewHint: 'click Remove first',
  colWidth: 80,
  scenario: keysTrace,
}
