import {
  component,
  createRoot,
  domOpsOf,
  eventsOf,
  h,
  stepBuilder,
  useEffect,
  useLayoutEffect,
  useState,
  type ModelEvent,
  type SetState,
} from '../model'
import type { Scenario } from '../types'

/**
 * Chapter 7 · Commit and effects. Profile has a layout effect with `[]` and a passive
 * subscription effect whose dependency array the reader picks (or types). Every result comes
 * from running the fiber model; copy from design `ch7()`.
 */

/** A dependency of the subscription effect. */
export type DepName = 'count' | 'user'
/** null = no array. */
export type Deps = readonly DepName[] | null
export type UpdateKind = 'mount' | 'count' | 'user'

export interface Ch7Params {
  deps: Deps
  upd: UpdateKind
}

export const DEPS_OPTIONS: readonly { id: string; label: string; deps: Deps }[] = [
  { id: 'none', label: 'no array', deps: null },
  { id: '[]', label: '[]', deps: [] },
  { id: '[count]', label: '[count]', deps: ['count'] },
  { id: '[count, user]', label: '[count, user]', deps: ['count', 'user'] },
]

export const UPDATE_OPTIONS: readonly { value: UpdateKind; label: string }[] = [
  { value: 'mount', label: 'Mount' },
  { value: 'count', label: 'count changes' },
  { value: 'user', label: 'user changes' },
]

/** `['count', 'user']` → `[count, user]`, null → `/* no array *\/`. */
export const depsSource = (deps: Deps) => (deps === null ? '/* no array */' : `[${deps.join(', ')}]`)

export const sameDeps = (a: Deps, b: Deps) => (a === null || b === null ? a === b : a.length === b.length && a.every((d, i) => d === b[i]))

/**
 * Parse what the reader typed into the editable deps: `[count, user]`, `[]`, `[user]`, or an
 * empty value / `no array` for no array. Returns undefined when it isn't one of those.
 */
export function parseDeps(text: string): Deps | undefined {
  const t = text.trim()
  if (t === '' || /^(\/\*\s*)?no array(\s*\*\/)?$/i.test(t)) return null
  const m = /^\[\s*(.*?)\s*\]$/.exec(t)
  if (!m) return undefined
  if (m[1] === '') return []
  const names = m[1].split(',').map((s) => s.trim())
  if (!names.every((n): n is DepName => n === 'count' || n === 'user')) return undefined
  if (new Set(names).size !== names.length) return undefined
  return names
}

/**
 * The code pane source, with the deps as an editable ⟦param⟧. `typed` shows what the reader
 * is typing in place of the canonical text (it may not parse yet).
 */
export function ch7Code(deps: Deps, typed?: string): string {
  const src = (typed ?? depsSource(deps)).replace(/[⟦⟧]/g, '')
  return (
    'function Profile({ user }) {\n  const [count, setCount] = useState(0);\n\n  useLayoutEffect(() => {\n    measureHeader();\n  }, []);\n\n  useEffect(() => {\n    const id = subscribe(user.id, count);\n    return () => unsubscribe(id);\n  }' +
    (deps === null ? '⟦' + src + '⟧' : ', ⟦' + src + '⟧') +
    ');\n\n  return <h2>{user.name} <span>{count}</span></h2>;\n}'
  )
}

/** What happened in one update, read from the model's events. */
export interface Ch7Run {
  /** Profile was called. */
  rendered: boolean
  domOps: number
  layoutRan: boolean
  /** The subscription effect ran its body after paint. */
  passiveRan: boolean
  /** The previous subscription was cleaned up first. */
  passiveCleanup: boolean
  /** Event types in order, for checking React's ordering. */
  order: ModelEvent['type'][]
}

interface User {
  id: number
  name: string
}

/** Mount Profile, then apply `upd`, and report what the model did for that update. */
export function runCh7(deps: Deps, upd: UpdateKind): Ch7Run & { events: ModelEvent[] } {
  let setCount: SetState<number> = () => {}
  let setUser: SetState<User> = () => {}
  const Profile = component('Profile', (p: { user: User }) => {
    const [count, set] = useState(0, 'count')
    setCount = set
    useLayoutEffect(() => undefined, [], 'measureHeader')
    const values: Record<DepName, unknown> = { count, user: p.user }
    // Model hook, not React's: the deps are the scenario's parameter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => () => undefined, deps === null ? null : deps.map((d) => values[d]), 'subscribe')
    return h('h2', { $id: 'h2' }, p.user.name, ' ', h('span', { $id: 'span' }, count))
  })
  const App = component('App', () => {
    const [user, set] = useState<User>({ id: 1, name: 'Ada' }, 'user')
    setUser = set
    return h(Profile, { $id: 'profile', user })
  })
  const root = createRoot(h(App, { $id: 'app' }))
  let events: ModelEvent[]
  if (upd === 'mount') events = root.mount()
  else {
    root.mount()
    events = [...root.act(() => (upd === 'count' ? setCount(1) : setUser({ id: 2, name: 'Grace' }))), ...root.flush()]
  }
  const fx = eventsOf(events, 'effect').filter((e) => e.fiberId === 'profile')
  const passive = fx.filter((e) => e.tag === 'passive')
  return {
    events,
    rendered: eventsOf(events, 'render').some((e) => e.fiberId === 'profile'),
    domOps: domOpsOf(events).length,
    layoutRan: fx.some((e) => e.tag === 'layout' && e.action === 'run'),
    passiveRan: passive.some((e) => e.action === 'run'),
    passiveCleanup: passive.some((e) => e.action === 'cleanup'),
    order: events.map((e) => e.type),
  }
}

/** Does the useEffect run? One cell of the matrix, from the model. */
export const effectRuns = (deps: Deps, upd: UpdateKind) => runCh7(deps, upd).passiveRan

/** The full "Does the useEffect run?" matrix: rows follow DEPS_OPTIONS, columns UPDATE_OPTIONS. */
export const effectMatrix = (): boolean[][] => DEPS_OPTIONS.map((d) => UPDATE_OPTIONS.map((u) => effectRuns(d.deps, u.value)))

export type BlockId = 'render' | 'commit' | 'layout' | 'paint' | 'passive'

/** One block of the 5-block timeline. */
export interface EffectBlock {
  id: BlockId
  name: string
  text: string
  /** It did something in this update (else dashed and grey). */
  on: boolean
  /** Reached by the current step. */
  reached: boolean
}

export interface Ch7Data {
  blocks: EffectBlock[]
  runs: boolean
}

/** Chapter 7 trace: idle + 5 steps, one per timeline block. Live: params update in place. */
export const ch7Effects: Scenario<Ch7Params, Ch7Data> = ({ deps, upd }) => {
  const run = runCh7(deps, upd)
  const r = run.passiveRan
  const mount = upd === 'mount'
  const ops = domOpsOf(run.events)
  const allBlocks = (reachedCount: number): EffectBlock[] => {
    const defs: Omit<EffectBlock, 'reached'>[] = [
      { id: 'render', name: 'Render', text: 'Profile() runs', on: run.rendered },
      { id: 'commit', name: 'Commit · DOM', text: mount ? 'insert <h2>, <span>' : upd === 'count' ? 'span.nodeValue = "1"' : 'update <h2> text', on: run.domOps > 0 },
      { id: 'layout', name: 'Layout effects', text: run.layoutRan ? 'measureHeader()' : 'skipped · deps [] unchanged', on: run.layoutRan },
      { id: 'paint', name: 'Paint', text: 'browser paints', on: true },
      {
        id: 'passive',
        name: 'Passive effects',
        text: r ? (run.passiveCleanup ? 'unsubscribe(#1), then subscribe()' : 'subscribe(user.id, count)') : 'skipped · deps unchanged',
        on: r,
      },
    ]
    return defs.map((b, i) => ({ ...b, reached: i < reachedCount }))
  }
  const finalCaption = r
    ? mount
      ? 'First render: every effect runs once after commit. The layout effect runs before paint; the subscription waits until after.'
      : 'The browser just drew the screen. React compared the dependency array with last render, found a change, and ran the old cleanup before the new effect.'
    : 'The browser just drew the screen. Every value in the dependency array is the same as last render, so React skips the effect and its cleanup.'

  const code = ch7Code(deps)
  const b = stepBuilder<Ch7Data>({
    phase: 'commit',
    caption: 'Pick a dependency array and an update, then press step to follow it through one frame.',
    code,
    tree: [],
    preview: { values: {} },
    data: { blocks: allBlocks(0), runs: r },
  })
  const steps: { phase: 'render' | 'commit' | 'paint'; line: number; caption: string }[] = [
    { phase: 'render', line: 1, caption: mount ? 'React calls Profile for the first time and gets back the <h2> it should show.' : `React calls Profile again because ${upd === 'count' ? 'its count state' : 'its user prop'} changed.` },
    { phase: 'commit', line: 13, caption: mount ? 'Commit: React adds the <h2> and <span> to the DOM at once. The user can\'t see them yet.' : `Commit: React makes the ${ops.length === 1 ? 'one change' : 'changes'} to the DOM at once. The user can't see it yet.` },
    {
      phase: 'commit',
      line: run.layoutRan ? 5 : 6,
      caption: run.layoutRan ? 'Layout effects run right after the DOM changes and before the screen is drawn, so measureHeader sees the new layout without a flicker.' : 'The layout effect has [] deps, which match last render, so React skips it.',
    },
    { phase: 'paint', line: 0, caption: 'The browser draws the screen. This is the first moment the user sees the update.' },
    { phase: 'commit', line: r ? 9 : 11, caption: finalCaption },
  ]
  steps.forEach((s, i) =>
    b.step({
      phase: s.phase,
      activeLine: s.line,
      caption: s.caption,
      domOps: i === 1 ? ops : undefined,
      data: { blocks: allBlocks(i + 1), runs: r },
    }),
  )
  return b.build()
}
