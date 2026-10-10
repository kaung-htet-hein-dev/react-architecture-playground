import { component, createRoot, eventsOf, Fragment, h, toTreeNodes, useEffect, useState, type Root } from '../../model'
import type { TreeNode } from '../../types'
import { boolParam, field, hookRows, line, pane, pgBuilder, queueRow, withNodes, type PgData, type PgHook, type PresetDef, type TLBlock } from './shared'

/**
 * Preset 10 · Conditional hook error. Profile calls useEffect only when isAdmin is true, so
 * switching users changes the order of hook calls: React warns, then the next useState reads
 * the wrong slot and React throws. The trace ends in the error state. Param: the initial isAdmin.
 */
export const CONDITIONAL_HOOK_CODE =
  "function App() {\n  const [isAdmin, setIsAdmin] = useState(⟦true⟧);\n  return (\n    <>\n      <button onClick={() => setIsAdmin(!isAdmin)}>Switch user</button>\n      <Profile isAdmin={isAdmin} />\n    </>\n  );\n}\n\nfunction Profile({ isAdmin }) {\n  const [name, setName] = useState('Ada');\n  if (isAdmin) {\n    useEffect(() => logAccess(), []);\n  }\n  const [theme, setTheme] = useState('dark');\n  return <Card name={name} theme={theme} />;\n}"

const BLOCKS: TLBlock[] = [
  { start: 18, width: 3, kind: 'trigger', title: 'click + handler' },
  { start: 21.4, width: 2, kind: 'render', title: 'render App' },
  { start: 23.8, width: 3, kind: 'render', title: 'render Profile' },
  { start: 27, width: 1.6, kind: 'error', title: 'error: render stops' },
]
const PLAYHEAD = [10, 18.6, 20.6, 22.6, 24.6, 26.2, 28]

function app(initial: boolean) {
  const Card = component('Card', (p: { name: string; theme: string }) => h('div', null, `${p.name} · ${p.theme}`))
  const Profile = component('Profile', (p: { isAdmin: boolean }) => {
    const [name] = useState('Ada', 'name')
    if (p.isAdmin) useEffect(() => {}, [], 'logAccess')
    const [theme] = useState('dark', 'theme')
    return h(Card, { $id: 'card', name, theme })
  })
  const App = component('App', () => {
    const [isAdmin, setIsAdmin] = useState(initial, 'isAdmin')
    return h(Fragment, null, h('button', { $id: 'button', onClick: () => setIsAdmin(!isAdmin, `setIsAdmin(${!isAdmin})`) }, 'Switch user'), h(Profile, { $id: 'profile', isAdmin }))
  })
  return h(App, { $id: 'app' })
}

const snapshot = (root: Root, tree: 'current' | 'wip' = 'current') => toTreeNodes(root, { hostRoot: true, tree, collapse: ['card'] }).filter((n) => n.parent !== 'card')

export function conditionalHookTrace(params: readonly string[]) {
  const initial = boolParam(params[0], true)
  const next = !initial
  const root = createRoot(app(initial))
  root.mount()
  const base = snapshot(root)
  const profileHooks = hookRows(root.find('profile'))
  const appHooks = hookRows(root.find('app'))
  const fields = (status: string, isAdmin: boolean | null, extra = field('hooks', profileHooks.map((x) => x.type).join(' → '))) => [
    field('Profile', status, 'label'),
    field('props', isAdmin == null ? '—' : `isAdmin ${isAdmin}`),
    extra,
    field('alternate', '→ other tree'),
  ]
  const data = (d: Partial<PgData> & Pick<PgData, 'panes'>): PgData => ({ swapBanner: false, hooks: { app: appHooks, profile: profileHooks }, focus: 'profile', queueOf: 'App', ...d })
  const emptyB = pane('empty', [], fields('not created', null, field('hooks', '—')))
  const t0 = withNodes(base, { profile: { tag: `isAdmin ${initial}` } })

  const b = pgBuilder(BLOCKS, {
    phase: 'trigger',
    caption: `Profile has ${profileHooks.length} hook slots, filled in call order on the last render. Click "Switch user" and watch what happens when the order changes.`,
    code: CONDITIONAL_HOOK_CODE,
    playhead: PLAYHEAD[0],
    tree: t0,
    rootCurrent: 'current',
    queue: [],
    effects: [],
    preview: { values: { name: 'Ada', theme: 'dark', isAdmin: initial } },
    data: data({ panes: [pane('current', t0, fields('on screen', initial)), emptyB] }),
  })

  root.click('button')
  const [u] = root.updates
  const trig = withNodes(t0, { app: { trigger: true } })
  b.step(
    {
      phase: 'trigger',
      activeLine: 5,
      playhead: PLAYHEAD[1],
      tree: trig,
      queue: [queueRow(u, 'waiting', 'waiting', true)],
      caption: `You clicked "Switch user". App queues setIsAdmin(${next}) on SyncLane.`,
      data: data({ panes: [pane('current', trig, fields('on screen', initial)), emptyB], focus: 'app' }),
    },
    line('[event]', `click on <button> → setIsAdmin(${next})`, 'trigger'),
  )

  const r = root.render()
  const warning = eventsOf(r.events, 'hook-order-warning')[0]
  const error = eventsOf(r.events, 'error')[0]
  const wip = snapshot(root, 'wip')
  const treeB = (profile: Partial<TreeNode>, card: Partial<TreeNode> = { state: 'pending' }) =>
    withNodes(wip.length ? wip : base, { root: { state: 'skip', tag: 'cloned' }, app: { state: 'render', tag: `isAdmin ${next}` }, profile: { tag: `isAdmin ${next}`, ...profile }, card })
  const panes = (t: TreeNode[], hooks = '…'): PgData['panes'] => [pane('current', t0, fields('on screen', initial)), pane('wip', t, fields('being built', next, field('hooks', hooks, hooks.includes('✕') ? 'error' : undefined)))]
  const readRows = (upTo: number, bad = -1, by = ''): PgHook[] =>
    profileHooks.map((h, i) => {
      if (i === bad) return { ...h, val: `${h.val} · read by ${by} ✕`, tone: 'error', hot: true }
      if (i < upTo) return { ...h, val: `${h.val} · read ✓`, tone: 'render', hot: i === upTo - 1 }
      return { ...h, val: `${h.val} · not read yet` }
    })

  b.step(
    {
      phase: 'render',
      activeLine: 2,
      notes: { 2: `← isAdmin = ${next}` },
      playhead: PLAYHEAD[2],
      wipTree: treeB({ state: 'pending' }),
      queue: [queueRow(u, 'processing', `applied → ${next}`)],
      caption: `React renders App with isAdmin = ${next} and passes it down. Profile's props changed, so Profile renders next.`,
      data: data({ panes: panes(treeB({ state: 'pending' })), focus: 'app', hooks: { app: [{ ...appHooks[0], val: `${initial} → ${next} · this render`, tone: 'render', hot: true }], profile: profileHooks } }),
    },
    line('[render]', `App · isAdmin = ${next}`, 'render'),
  )
  b.step(
    {
      phase: 'render',
      activeLine: 12,
      notes: { 12: '← slot 0 ✓' },
      playhead: PLAYHEAD[3],
      wipTree: treeB({ state: 'render' }),
      caption: "Profile's first call, useState('Ada'), reads slot 0. That slot holds a useState, so far so good.",
      data: data({ panes: panes(treeB({ state: 'render' }), 'useState ✓'), hooks: { app: appHooks, profile: readRows(1) } }),
    },
    line('[render]', "Profile · call 1 useState('Ada') → slot 0 (useState) ✓", 'render'),
  )

  const prev = warning?.previous ?? profileHooks.map((x) => x.type)
  const nextTypes = warning?.next ?? []
  const mismatch = prev.findIndex((t, i) => nextTypes[i] !== undefined && nextTypes[i] !== t)
  const at = mismatch < 0 ? 1 : mismatch
  const pad = (s: string) => s.padEnd(18)
  b.step(
    {
      phase: 'render',
      activeLine: next ? 14 : 16,
      dimLines: next ? [] : [13, 14, 15],
      notes: next ? { 14: `← slot ${at} holds ${prev[at] ?? 'nothing'}` } : { 16: `← slot ${at} holds ${prev[at]}` },
      playhead: PLAYHEAD[4],
      wipTree: treeB({ state: 'render', tag: 'order changed' }),
      caption: next
        ? `isAdmin is now true, so useEffect runs. It is call 2 and reads slot 1, which holds ${prev[1]}. React notices the order changed and warns.`
        : `isAdmin is now false, so the if block is skipped. The next call, useState('dark'), is call 2, and it reads slot 1, which holds the useEffect. React notices and warns.`,
      data: data({ panes: panes(treeB({ state: 'render' }), `${nextTypes.join(' → ')} ✕`), hooks: { app: appHooks, profile: readRows(at, at, nextTypes[at] ?? '') } }),
    },
    warning
      ? [
          line('[warn]', `React has detected a change in the order of Hooks called by ${warning.component}.`, 'error', 'warn'),
          line('[warn]', `${pad('Previous render')}Next render`, 'info', 'warn'),
          ...prev.slice(0, at + 1).map((t, i) => line('[warn]', `${i + 1}. ${pad(t)}${nextTypes[i] ?? 'undefined'}`, i === at ? 'error' : 'info', 'warn')),
        ]
      : [],
  )

  const message = error?.message ?? ''
  b.step(
    {
      phase: 'render',
      status: 'error',
      errorLine: 16,
      notes: { 16: next ? '← no slot left to read' : '← slot 1 has no state queue' },
      playhead: PLAYHEAD[5],
      wipTree: treeB({ state: 'error', tag: 'hooks ✕' }, { state: 'pending' }),
      preview: { values: { name: 'Ada', theme: 'dark', isAdmin: initial }, error: { title: 'Uncaught Error', message } },
      caption: next
        ? `useState('dark') is call 3 but Profile only had 2 slots last time, so React throws: ${message.split('.')[0]}. Never put a hook inside an if; put the condition inside the effect instead.`
        : `useState('dark') needs a state queue, but slot 1 is an effect, so React throws instead of returning a wrong value. Never put a hook inside an if; put the condition inside the effect: useEffect(() => { if (isAdmin) logAccess(); }, [isAdmin]).`,
      data: data({ panes: panes(treeB({ state: 'error', tag: 'hooks ✕' }), `${nextTypes.join(' → ')} ✕`), hooks: { app: appHooks, profile: readRows(at, at, nextTypes[at] ?? '') } }),
    },
    line('[error]', message, 'error', 'error'),
  )
  return b.build()
}

export const conditionalHook: PresetDef = {
  id: 'conditional-hook',
  label: 'Conditional hook error',
  file: 'Profile.jsx',
  code: CONDITIONAL_HOOK_CODE,
  paramNote: 'The highlighted value is editable: whether the first user is an admin.',
  previewHint: 'click Switch user',
  colWidth: 104,
  scenario: conditionalHookTrace,
}
