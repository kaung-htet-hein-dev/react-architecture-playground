import {
  component,
  createContext,
  createRoot,
  domOpsOf,
  eventsOf,
  h,
  memo,
  summarizePass,
  toTreeNodes,
  useContext,
  useState,
  type Child,
  type ComponentType,
  type ModelEvent,
  type Root,
  type SetState,
} from '../model'
import type { NodeState, Scenario, TreeNode } from '../types'

/**
 * Chapter 4 · What re-renders and why. App > Header, Main > (Sidebar > Nav, Avatar),
 * (Feed > Post ×3). Main provides ThemeContext with a new object every render. Clicking a node
 * calls setState there; the model decides who renders (memo + Object.is, context propagation).
 */
export const CH4_NODES = ['app', 'header', 'main', 'sidebar', 'nav', 'avatar', 'feed', 'p1', 'p2', 'p3'] as const
export type Ch4NodeId = (typeof CH4_NODES)[number]

export interface Ch4Params {
  trigger: Ch4NodeId
  /** memo(Sidebar) */
  memo: boolean
  /** Sidebar gets style={{ gap: 8 }}: a new object every render. */
  newObj: boolean
  /** Avatar calls useContext(ThemeContext). */
  ctx: boolean
}

export const CH4_DEFAULTS: Ch4Params = { trigger: 'main', memo: true, newObj: false, ctx: true }

/** One row of "Why each one rendered", in render (tree) order. */
export interface WhyRow {
  id: string
  label: string
  why: string
  state: 'rendered' | 'skipped'
}

export interface Ch4Data {
  why: WhyRow[]
  rendered: number
  skipped: number
  untouched: number
  domOps: number
}

export const WHY = {
  state: 'its own state changed (setState)',
  parent: 'its parent rendered',
  memoBroken: 'memo, but style is a new object every render',
  context: 'it reads ThemeContext, and the value changed',
  memoSkip: 'memo: its props are the same as last render (Object.is)',
  parentSkipped: 'its parent skipped',
} as const

/** Main.jsx as it reads with the current toggles (design `ch4()`). */
export function ch4Code({ memo: m, newObj, ctx }: Pick<Ch4Params, 'memo' | 'newObj' | 'ctx'>): string {
  const sidebarLine = newObj ? '      <Sidebar user={user} style={{ gap: 8 }} />' : '      <Sidebar user={user} />'
  return (
    "const ThemeContext = createContext(null);\n\nfunction Main() {\n  const [filter, setFilter] = useState('all');\n  const theme = { mode: 'dark' }; // new object every render\n  return (\n    <ThemeContext value={theme}>\n" +
    sidebarLine +
    '\n      <Feed filter={filter} />\n    </ThemeContext>\n  );\n}\n\n' +
    (m
      ? 'const Sidebar = memo(function Sidebar({ user }) {\n  return <nav><Nav /><Avatar user={user} /></nav>;\n});'
      : 'function Sidebar({ user }) {\n  return <nav><Nav /><Avatar user={user} /></nav>;\n}') +
    '\n\nfunction Avatar({ user }) {\n' +
    (ctx ? '  const theme = useContext(ThemeContext);\n  return <img className={theme.mode} src={user.photo} />;' : '  return <img src={user.photo} />;') +
    '\n}'
  )
}

/** Line of `<Sidebar … />` in Main.jsx. */
export const CH4_SIDEBAR_LINE = 8

/** Context lines dimmed when nothing reads ThemeContext. */
export const ch4DimLines = (ctx: boolean) => (ctx ? [] : [1, 5, 7, 10])

const USER = { name: 'Ada', photo: 'ada.png' }

/** Build the app on the fiber model. Every component keeps a counter state we can bump. */
function buildApp(p: Ch4Params) {
  const setters: Partial<Record<Ch4NodeId, SetState<number>>> = {}
  const ThemeContext = createContext<{ mode: string } | null>(null, 'ThemeContext')
  const stateful = <P,>(name: string, idOf: (props: P) => Ch4NodeId, body: (props: P) => Child) =>
    component<P>(name, (props) => {
      const [, set] = useState(0, 'state')
      setters[idOf(props)] = set
      return body(props)
    })

  const Nav = stateful('Nav', () => 'nav', () => h('ul', null))
  const Avatar = stateful<{ user: typeof USER }>('Avatar', () => 'avatar', ({ user }) => {
    if (!p.ctx) return h('img', { src: user.photo })
    const theme = useContext(ThemeContext)
    return h('img', { className: theme?.mode ?? '', src: user.photo })
  })
  type SidebarProps = { user: typeof USER; style?: { gap: number } }
  const SidebarBase = stateful<SidebarProps>('Sidebar', () => 'sidebar', ({ user }) =>
    h('nav', null, h(Nav, { $id: 'nav' }), h(Avatar, { $id: 'avatar', user })),
  )
  const Sidebar: ComponentType<SidebarProps> = p.memo ? memo(SidebarBase) : SidebarBase
  const Post = stateful<{ n: 1 | 2 | 3 }>('Post', ({ n }) => `p${n}`, ({ n }) => h('article', null, `Post ${n}`))
  const Feed = stateful<{ filter: string }>('Feed', () => 'feed', () =>
    h('section', null, h(Post, { $id: 'p1', key: 1, n: 1 }), h(Post, { $id: 'p2', key: 2, n: 2 }), h(Post, { $id: 'p3', key: 3, n: 3 })),
  )
  const Main = stateful('Main', () => 'main', () => {
    const theme = { mode: 'dark' } // new object every render
    const sidebar = p.newObj ? h(Sidebar, { $id: 'sidebar', user: USER, style: { gap: 8 } }) : h(Sidebar, { $id: 'sidebar', user: USER })
    return h(ThemeContext.Provider, { value: theme }, sidebar, h(Feed, { $id: 'feed', filter: 'all' }))
  })
  const Header = stateful('Header', () => 'header', () => h('header', null))
  const App = stateful('App', () => 'app', () => [h(Header, { $id: 'header' }), h(Main, { $id: 'main' })])
  return { app: h(App, { $id: 'app' }), setters }
}

export interface Ch4Result {
  states: Record<string, NodeState>
  order: Record<string, number>
  why: WhyRow[]
  domOps: number
  queued: string
  events: ModelEvent[]
  root: Root
}

/** Run one setState on the model and classify every node. */
export function runCh4(p: Ch4Params): Ch4Result {
  const { app, setters } = buildApp(p)
  const root = createRoot(app)
  root.mount()
  const click = root.event(`setState in ${p.trigger}`, () => setters[p.trigger]?.((n) => n + 1))
  const queued = eventsOf(click, 'update-queued')[0]?.text ?? 'setState(1)'
  const rendered = root.render().events
  const commit = root.commit()
  root.flush()
  const pass = summarizePass(rendered)

  const nodes = toTreeNodes(root, { hosts: false })
  const labelOf = new Map(nodes.map((n) => [n.id, n.label]))
  const renders = new Map(eventsOf(rendered, 'render').map((e) => [e.fiberId, e.reasons]))
  const memoSkipped = new Set(eventsOf(rendered, 'bailout').filter((b) => b.reason === 'memo').map((b) => b.fiberId))

  const states: Record<string, NodeState> = {}
  const why: WhyRow[] = []
  for (const n of nodes) {
    const reasons = renders.get(n.id)
    const label = labelOf.get(n.id) ?? n.id
    if (reasons) {
      states[n.id] = 'render'
      const text = reasons.includes('state')
        ? WHY.state
        : reasons.includes('parent')
          ? n.id === 'sidebar' && p.memo
            ? WHY.memoBroken
            : WHY.parent
          : WHY.context
      why.push({ id: n.id, label, why: text, state: 'rendered' })
    } else if (memoSkipped.has(n.id)) {
      states[n.id] = 'skip'
      why.push({ id: n.id, label, why: WHY.memoSkip, state: 'skipped' })
    } else if (n.parent && states[n.parent] === 'skip') {
      states[n.id] = 'skip'
      why.push({ id: n.id, label, why: WHY.parentSkipped, state: 'skipped' })
    } else states[n.id] = 'idle'
  }
  return { states, order: pass.order, why, domOps: domOpsOf(commit).length, queued, events: rendered, root }
}

const LABEL: Record<Ch4NodeId, string> = {
  app: 'App',
  header: 'Header',
  main: 'Main',
  sidebar: 'Sidebar',
  nav: 'Nav',
  avatar: 'Avatar',
  feed: 'Feed',
  p1: 'Post',
  p2: 'Post',
  p3: 'Post',
}

const count = (states: Record<string, NodeState>, s: NodeState) => Object.values(states).filter((v) => v === s).length

/**
 * Trace: idle → setState queued → the trigger node renders → the wave below it (renders and
 * skips, in render order) → commit. Always 4 steps, so toggles can update live.
 */
export const ch4Rerender: Scenario<Ch4Params, Ch4Data> = (p) => {
  const r = runCh4(p)
  const name = LABEL[p.trigger]
  const tags = (id: string, trig: boolean) =>
    trig && id === p.trigger ? 'setState' : id === 'sidebar' && p.memo ? 'memo' : id === 'avatar' && p.ctx ? 'useContext' : undefined
  const tree = (show: (id: string) => boolean, trig: boolean): TreeNode[] =>
    toTreeNodes(r.root, { hosts: false }).map((n) => {
      const st = show(n.id) ? r.states[n.id] : 'idle'
      const tag = tags(n.id, trig)
      return {
        ...n,
        state: st,
        ...(tag ? { tag } : {}),
        ...(trig && n.id === p.trigger ? { trigger: true } : {}),
        ...(!trig && n.id === p.trigger ? { selected: true } : {}),
        ...(st === 'render' && r.order[n.id] ? { order: r.order[n.id] } : {}),
      }
    })
  const data = (rows: WhyRow[], states: NodeState[]): Ch4Data => {
    const rendered = states.filter((s) => s === 'render').length
    const skipped = states.filter((s) => s === 'skip').length
    return { why: rows, rendered, skipped, untouched: CH4_NODES.length - rendered - skipped, domOps: r.domOps }
  }
  const summary = (d: Ch4Data) => `${d.rendered} rendered · ${d.skipped} skipped · ${d.untouched} untouched`
  const code = ch4Code(p)
  const dimLines = ch4DimLines(p.ctx)

  const steps: ReturnType<Scenario<Ch4Params, Ch4Data>> = []
  const push = (s: Omit<(typeof steps)[number], 'code' | 'dimLines' | 'domOps' | 'preview'>) =>
    steps.push({ ...s, code, dimLines, domOps: [], preview: { values: {} } })

  const idle = data([], [])
  push({
    phase: 'trigger',
    activeLine: 0,
    tree: tree(() => false, false),
    treeNote: summary(idle),
    log: [],
    data: idle,
    caption: `Nothing has rendered yet. Press play to call setState in ${name}, or click any node to move the update.`,
  })

  const log1 = [{ text: `${r.queued} → queue update on ${name}`, tone: 'trigger' as const }]
  push({
    phase: 'trigger',
    activeLine: CH4_SIDEBAR_LINE,
    tree: tree(() => false, true),
    treeNote: summary(idle),
    log: log1,
    data: idle,
    caption: `${name} called setState. React queues the update on ${name} and schedules a render that starts at the root.`,
  })

  const self = r.why.filter((w) => w.id === p.trigger)
  const selfData = data(self, ['render'])
  const log2 = [...log1, { text: `call ${name}() → its own state changed`, tone: 'render' as const }]
  push({
    phase: 'render',
    activeLine: CH4_SIDEBAR_LINE,
    tree: tree((id) => id === p.trigger, true),
    treeNote: summary(selfData),
    log: log2,
    data: selfData,
    caption: `Everything above ${name} has no work, so React walks past it without calling it. ${name} itself is called again.`,
  })

  const all = data(r.why, Object.values(r.states))
  const renderedCount = count(r.states, 'render')
  const log3 = [...log2, { text: `${renderedCount} rendered · ${count(r.states, 'skip')} skipped`, tone: 'render' as const }]
  push({
    phase: 'render',
    activeLine: CH4_SIDEBAR_LINE,
    tree: tree(() => true, true),
    treeNote: summary(all),
    log: log3,
    data: all,
    caption: `${name} called setState, so ${name} renders again, and so does everything below it, unless memo can show nothing changed. Nothing above it renders. Click another node to move the update.`,
  })

  push({
    phase: 'commit',
    activeLine: CH4_SIDEBAR_LINE,
    tree: tree(() => true, true),
    treeNote: summary(all),
    log: [...log3, { text: `${r.domOps} DOM op${r.domOps === 1 ? '' : 's'}`, tone: 'commit' as const }],
    data: all,
    caption:
      r.domOps === 0
        ? `${renderedCount} component${renderedCount === 1 ? '' : 's'} rendered, but every one returned the same elements as last time, so the commit makes 0 DOM writes. A render is not a DOM update.`
        : `The commit wrote ${r.domOps} change${r.domOps === 1 ? '' : 's'} to the DOM; everything else that rendered returned the same elements as before.`,
  })
  return steps
}
