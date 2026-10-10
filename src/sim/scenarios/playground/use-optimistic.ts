import { component, createRoot, domOpsOf, eventsOf, Fragment, h, startTransition, toTreeNodes, useOptimistic, useState, type Root } from '../../model'
import type { TreeNode, Update } from '../../types'
import { allNodes, boolParam, field, hookRows, line, pane, patchHooks, pgBuilder, queueRow, show, textParam, withNodes, type PgData, type PgPane, type PresetDef, type TLBlock } from './shared'

/**
 * Preset 9 · Optimistic update with useOptimistic. The message shows up at once with
 * "· sending"; when the server answers, a transition either adds the real message or sets an
 * error, and in that same render React drops the optimistic entry: confirmed or rolled back.
 * Params: whether the server accepts, and the message text.
 */
export const OPTIMISTIC_CODE =
  "const save = text => fakeApi(text, { ok: ⟦false⟧ });\n\nfunction Chat() {\n  const [messages, setMessages] = useState(['Hi!']);\n  const [error, setError] = useState(null);\n  const [shown, addOptimistic] = useOptimistic(\n    messages,\n    (list, text) => [...list, text + ' · sending'],\n  );\n\n  function send(text) {\n    startTransition(async () => {\n      addOptimistic(text);\n      const ok = await save(text);\n      startTransition(() => {\n        if (ok) setMessages(m => [...m, text]);\n        else setError('Not sent');\n      });\n    });\n  }\n\n  return (\n    <>\n      {shown.map(m => <p key={m}>{m}</p>)}\n      {error && <small>{error}</small>}\n      <button onClick={() => send(⟦'See you'⟧)}>Send</button>\n    </>\n  );\n}"

const BLOCKS: TLBlock[] = [
  { start: 4, width: 2.4, kind: 'trigger', title: 'click · addOptimistic' },
  { start: 6.8, width: 2.6, kind: 'render', title: 'render (optimistic)' },
  { start: 9.8, width: 1.4, kind: 'reconcile', title: 'diff' },
  { start: 11.4, width: 1.4, kind: 'commit', title: 'commit' },
  { start: 13.2, width: 3, kind: 'paint', title: 'paint · sending' },
  { start: 66.8, width: 2.4, kind: 'trigger', title: 'server answers · transition' },
  { start: 69.6, width: 3, kind: 'render', title: 'render (real state)' },
  { start: 72.8, width: 1.4, kind: 'reconcile', title: 'diff' },
  { start: 74.4, width: 1.4, kind: 'commit', title: 'commit' },
  { start: 80, width: 3, kind: 'paint', title: 'paint' },
]
const PLAYHEAD = [1, 5, 8, 10.4, 12, 15, 67.8, 71, 73.4, 75, 81.5]

const unquote = (v: string | undefined) => String(v ?? '').trim().replace(/^['"]|['"]$/g, '')

function app(ok: boolean, text: string) {
  const Chat = component('Chat', () => {
    const [messages] = useState(['Hi!'], 'messages')
    const [error] = useState<string | null>(null, 'error')
    const [shown, addOptimistic] = useOptimistic<string[], string>(messages, (list, t) => [...list, `${t} · sending`])
    const send = () =>
      startTransition(() => {
        addOptimistic(text, `addOptimistic(${show(text)})`)
      })
    return h(
      Fragment,
      null,
      shown.map((m) => h('p', { key: m }, m)),
      error ? h('small', { $id: 'small' }, error) : null,
      h('button', { $id: 'button', onClick: send }, 'Send'),
    )
  })
  const answer = (root: Root) =>
    root.act(() =>
      startTransition(() => {
        const chat = root.find('chat')
        const setMessages = chat?.memoizedState?.queue?.dispatch
        const setError = chat?.memoizedState?.next?.queue?.dispatch
        if (ok) setMessages?.((m: string[]) => [...m, text], `setMessages(m => [...m, ${show(text)}])`)
        else setError?.('Not sent', `setError("Not sent")`)
      }),
    )
  return { element: h(Chat, { $id: 'chat' }), answer }
}

const snapshot = (root: Root, tree: 'current' | 'wip' = 'current'): TreeNode[] =>
  toTreeNodes(root, { tree, hostRoot: true }).map((n) => (n.label === 'p' && n.key ? { ...n, tag: n.key.length > 9 ? `${n.key.slice(0, 8)}…` : n.key, title: n.key } : n))

const stateOf = (root: Root, tree: 'current' | 'wip' = 'current') => {
  const hk = root.find('chat', tree)?.memoizedState
  return { messages: hk?.memoizedState as string[], error: hk?.next?.memoizedState as string | null, shown: hk?.next?.next?.memoizedState as string[] }
}

export function useOptimisticTrace(params: readonly string[]) {
  const ok = boolParam(params[0], false)
  const text = textParam(unquote(params[1]), 'See you', 18)
  const { element, answer } = app(ok, text)
  const root = createRoot(element)
  root.mount()
  const s0 = stateOf(root)
  const base = snapshot(root)
  const list = (xs: readonly string[]) => `[${xs.join(', ')}]`
  const fields = (status: string, s: ReturnType<typeof stateOf> | null, lanes: string | null = null) => [
    field('Chat', status, 'label'),
    field('memoizedState', s ? `messages ${list(s.messages)}${s.error ? ` · error "${s.error}"` : ''}` : '—'),
    field('lanes', lanes ? `${lanes} (pending)` : 'none', lanes ? 'trigger' : undefined),
    field('alternate', '→ other tree'),
  ]
  const preview = (s: ReturnType<typeof stateOf>, highlight = false) => ({
    values: { shown: s.shown, error: s.error ?? '' },
    ...(highlight ? { highlight: ['last'] } : {}),
  })
  const hooks = (tree: 'current' | 'wip', patch: Parameters<typeof patchHooks>[1] = {}) => ({
    chat: patchHooks(
      hookRows(root.find('chat', tree)).map((r) => (r.type === 'useOptimistic' ? { ...r, val: list(stateOf(root, tree).shown) } : r.type === 'useState' && r.n === 0 ? { ...r, val: list(stateOf(root, tree).messages) } : r)),
      patch,
    ),
  })
  const data = (d: Partial<PgData> & Pick<PgData, 'panes'>): PgData => ({ swapBanner: false, hooks: hooks('current'), focus: 'chat', queueOf: 'Chat', ...d })
  const t0 = withNodes(base, { chat: { tag: `${s0.shown.length} shown` } })
  const emptyB = pane('empty', [], fields('not created', null))
  const qOf = (statusFor: (i: number) => [Update['status'], string], active = -1): Update[] => root.updates.map((u, i) => queueRow(u, ...statusFor(i), i === active))

  const b = pgBuilder(BLOCKS, {
    phase: 'trigger',
    caption: `Click Send. The message should show up immediately, before the server answers. This server ${ok ? 'accepts' : 'rejects'} it.`,
    code: OPTIMISTIC_CODE,
    playhead: PLAYHEAD[0],
    tree: t0,
    rootCurrent: 'current',
    queue: [],
    effects: [],
    preview: preview(s0),
    data: data({ panes: [pane('current', t0, fields('on screen', s0)), emptyB] }),
  })

  root.click('button')
  const trig = withNodes(t0, { chat: { trigger: true } })
  b.step(
    {
      phase: 'trigger',
      activeLine: 26,
      playhead: PLAYHEAD[1],
      tree: trig,
      caption: `You clicked Send. send("${text}") starts a transition: an Action that will wait for the server.`,
      data: data({ panes: [pane('current', trig, fields('on screen', s0)), emptyB] }),
    },
    line('[event]', 'click on <button> → send()', 'trigger'),
  )
  b.step(
    {
      phase: 'trigger',
      activeLine: 13,
      notes: { 13: '← shown right away' },
      playhead: PLAYHEAD[2],
      queue: qOf(() => ['waiting', 'waiting · undone when the Action ends'], 0),
      caption: 'addOptimistic queues a temporary update on SyncLane, so it renders right now. React remembers to drop it when the transition finishes.',
      data: data({ panes: [pane('current', trig, fields('on screen', s0, 'SyncLane')), emptyB] }),
    },
    line('[schedule]', `addOptimistic(${show(text)}) → render now (SyncLane)`, 'trigger'),
  )

  root.render()
  const s1 = stateOf(root, 'wip')
  const wip1 = snapshot(root, 'wip')
  const newKey = s1.shown[s1.shown.length - 1]
  const treeB1 = (pState: TreeNode['state'], done = false) =>
    withNodes(
      wip1,
      Object.fromEntries(wip1.map((n) => [n.id, n.id === 'root' ? (done ? {} : { state: 'skip' as const, tag: 'cloned' }) : n.id === 'chat' ? { state: done ? ('idle' as const) : ('render' as const), tag: `${s1.shown.length} shown` } : n.key === newKey ? { state: pState } : {}])),
    )
  const r1Panes = (t: TreeNode[]): PgPane[] => [pane('current', t0, fields('on screen', s0, 'SyncLane')), pane('wip', t, fields('being built', s1))]
  const optimisticHooks = hooks('wip', { 2: { tone: 'render', hot: true } })
  b.step(
    {
      phase: 'render',
      activeLine: 6,
      notes: { 6: `← ${s1.shown.length} messages` },
      playhead: PLAYHEAD[3],
      tree: t0,
      wipTree: treeB1('render'),
      queue: qOf(() => ['processing', 'applied · temporary']),
      caption: `React renders Chat. useOptimistic starts from messages ${list(s1.messages)} and applies the temporary update: shown = ${list(s1.shown)}.`,
      data: data({ panes: r1Panes(treeB1('render')) as PgData['panes'], hooks: optimisticHooks }),
    },
    line('[render]', `Chat · shown = ${list(s1.shown)}`, 'render'),
  )
  b.step(
    {
      phase: 'reconcile',
      activeLine: 24,
      playhead: PLAYHEAD[4],
      wipTree: treeB1('reconcile'),
      caption: `One new key, "${newKey}", so React marks one new <p> for insertion.`,
      data: data({ panes: r1Panes(treeB1('reconcile')) as PgData['panes'], hooks: optimisticHooks }),
    },
    line('[reconcile]', '1 change: insert <p>', 'reconcile'),
  )
  const ops1 = domOpsOf(root.commit())
  const oldA = allNodes(t0, { state: 'skip', trigger: false })
  const c1 = (t: TreeNode[]): PgPane[] => [pane('alternate', oldA, fields('last frame', s0)), pane('current', t, fields('on screen', s1))]
  b.step(
    {
      phase: 'commit',
      activeLine: 24,
      playhead: PLAYHEAD[5],
      tree: oldA,
      wipTree: treeB1('dom', true),
      rootCurrent: 'wip',
      domOps: ops1,
      queue: qOf(() => ['applied', 'shown · until the Action ends']),
      preview: preview(stateOf(root), true),
      caption: `Commit: ${ops1.length} DOM operations add the "${newKey}" row, and root.current swaps.`,
      data: data({ panes: c1(treeB1('dom', true)) as PgData['panes'], swapBanner: true }),
    },
    line('[commit]', `${ops1.length} DOM operations · optimistic row inserted`, 'commit'),
  )
  root.paint()
  const shownB = treeB1('idle', true)
  b.step(
    {
      phase: 'commit',
      playhead: PLAYHEAD[6],
      wipTree: shownB,
      preview: preview(stateOf(root)),
      caption: `Painted. The user sees "${newKey}" right away, while the request is still in flight.`,
      data: data({ panes: c1(shownB) as PgData['panes'], swapBanner: true }),
    },
    line('[paint]', `frame F1 painted · "${newKey}"`, 'commit'),
  )

  // The server answers: a transition sets the real state.
  answer(root)
  const realIdx = root.updates.length - 1
  const trigB = withNodes(shownB, { chat: { trigger: true } })
  b.step(
    {
      phase: 'trigger',
      activeLine: ok ? 16 : 17,
      notes: { 14: `← ok = ${ok}` },
      playhead: PLAYHEAD[7],
      wipTree: trigB,
      queue: qOf((i) => (i === realIdx ? ['waiting', 'waiting'] : ['applied', 'shown · until the Action ends']), realIdx),
      caption: ok
        ? 'The server says ok. Inside a transition, setMessages adds the real message on TransitionLane.'
        : "The server says no. Inside a transition, setError records the failure on TransitionLane. Nobody adds the message to messages.",
      data: data({ panes: [pane('alternate', oldA, fields('last frame', s0)), pane('current', trigB, fields('on screen', s1, 'TransitionLane'))], swapBanner: false }),
    },
    line('[server]', `${ok ? 'ok' : 'rejected'} → ${root.updates[realIdx]?.text} (TransitionLane)`, 'trigger'),
  )

  const r2 = root.render()
  const s2 = stateOf(root, 'wip')
  const dropped = root.updates[0]?.status === 'cleared'
  const wip2 = snapshot(root, 'wip')
  const keys2 = new Set(wip2.map((n) => n.key))
  const created = eventsOf(r2.events, 'reconcile').filter((e) => e.action === 'create').map((e) => e.fiberId)
  const removedNodes = shownB.filter((n) => n.key != null && !keys2.has(n.key))
  const treeA2 = (st: 'render' | 'reconcile' | 'dom' | 'idle', done = false): TreeNode[] => [
    ...withNodes(
      wip2,
      Object.fromEntries(wip2.map((n) => [n.id, n.id === 'root' ? (done ? {} : { state: 'skip' as const, tag: 'cloned' }) : n.id === 'chat' ? { state: done ? ('idle' as const) : ('render' as const), tag: `${s2.shown.length} shown` } : created.includes(n.id) ? { state: st === 'render' ? ('render' as const) : st } : {}])),
    ),
    ...(done && st === 'idle' ? [] : removedNodes.map((n) => ({ ...n, state: 'removed' as const }))),
  ]
  const r2Panes = (t: TreeNode[]): PgPane[] => [pane('wip', t, fields('being built', s2)), pane('current', shownB, fields('on screen', s1, 'TransitionLane'))]
  b.step(
    {
      phase: 'render',
      activeLine: 6,
      notes: { 6: `← ${list(s2.shown)}` },
      playhead: PLAYHEAD[8],
      tree: treeA2('render'),
      wipTree: shownB,
      queue: qOf((i) => (i === 0 ? ['cleared', dropped ? 'dropped · Action finished' : 'applied'] : i === realIdx ? ['processing', 'applied'] : ['applied', 'applied'])),
      caption: ok
        ? `The transition render drops the temporary update and reads the real state: shown = ${list(s2.shown)}. The real "${text}" replaces the "· sending" one.`
        : `The transition render drops the temporary update. messages never got "${text}", so shown = ${list(s2.shown)}: rolled back.`,
      data: data({ panes: r2Panes(treeA2('render')) as PgData['panes'], hooks: hooks('wip', { 2: { tone: 'render', hot: true }, ...(ok ? { 0: { tone: 'render', hot: true } } : { 1: { tone: 'render', hot: true } }) }) }),
    },
    line('[render]', `Chat · optimistic update dropped · shown = ${list(s2.shown)}`, 'render'),
  )
  b.step(
    {
      phase: 'reconcile',
      activeLine: ok ? 24 : 25,
      playhead: PLAYHEAD[9],
      tree: treeA2('reconcile'),
      caption: ok
        ? `Keys changed: "${newKey}" is gone and "${text}" is new. React removes one <p> and creates another.`
        : `"${newKey}" is gone and the error is new: one <p> to remove, one <small> to add.`,
      data: data({ panes: r2Panes(treeA2('reconcile')) as PgData['panes'] }),
    },
    line('[reconcile]', `${removedNodes.length} removed · ${created.length} created`, 'reconcile'),
  )
  const ops2 = domOpsOf(root.commit())
  root.paint()
  const oldB = allNodes(shownB, { state: 'skip', trigger: false })
  const c2 = (t: TreeNode[]): PgPane[] => [pane('current', t, fields('on screen', s2)), pane('alternate', oldB, fields('last frame', s1))]
  b.step(
    {
      phase: 'commit',
      activeLine: ok ? 24 : 25,
      playhead: PLAYHEAD[10],
      tree: treeA2('dom', true),
      wipTree: oldB,
      rootCurrent: 'current',
      domOps: ops2,
      queue: qOf((i) => (i === 0 ? ['cleared', 'dropped · cleared'] : ['cleared', 'applied · cleared'])),
      preview: preview(stateOf(root), ok),
      caption: ok
        ? `Committed and painted: "${text}" is confirmed. To the user it simply stopped saying "sending".`
        : `Committed and painted: the message is gone and "Not sent" shows instead. useOptimistic rolled it back without any cleanup code.`,
      data: data({ panes: c2(treeA2('dom', true)) as PgData['panes'], swapBanner: true }),
    },
    line(ok ? '[commit]' : '[rollback]', `${ops2.length} DOM operations · ${ok ? `"${text}" confirmed` : `"${text}" rolled back`}`, ok ? 'commit' : 'error'),
  )
  return b.build()
}

export const useOptimisticPreset: PresetDef = {
  id: 'use-optimistic',
  label: 'Optimistic update with useOptimistic',
  file: 'Chat.jsx',
  code: OPTIMISTIC_CODE,
  paramNote: 'Highlighted values are editable: whether the server accepts, and the message.',
  previewHint: 'click Send',
  colWidth: 92,
  scenario: useOptimisticTrace,
}
