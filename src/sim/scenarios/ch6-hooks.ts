import {
  component,
  createRoot,
  eventsOf,
  h,
  hookTypes,
  stepBuilder,
  useEffect,
  useState,
  type Fiber,
  type Hook,
  type Root,
  type SetState,
} from '../model'
import type { ConsoleLine, HookType, Scenario } from '../types'

/**
 * Chapter 6 · Fiber and hooks. Profile calls a useEffect inside `if (isAdmin)`. Render 1
 * (isAdmin true) fills three hook slots; render 2 (false) skips the effect, so
 * useState('dark') reads slot 1, which holds the effect. Copy from design `codes().c6`.
 */
export const CH6_CODE =
  "function Profile({ isAdmin }) {\n  const [name, setName] = useState('Ada');\n  if (isAdmin) {\n    useEffect(() => logAccess(), []);\n  }\n  const [theme, setTheme] = useState('dark');\n  return <Card name={name} theme={theme} />;\n}"

export const CH6_FIX = 'useEffect(() => {\n  if (isAdmin) logAccess();\n}, [isAdmin]);'

/**
 * The error React reports after the hook-order warning, as the design shows it. The model
 * (like React 19) actually stops at the first mismatched read with "Should have a queue…",
 * kept in `data.modelError`.
 */
export const CH6_ERROR = 'Rendered fewer hooks than expected. This may be caused by an accidental early return statement.'

/** One hook call in the source, in call order. */
interface CallSite {
  text: string
  type: HookType
  line: number
  /** Only called when isAdmin is true. */
  conditional?: boolean
}

const CALLS: readonly CallSite[] = [
  { text: "useState('Ada')", type: 'useState', line: 2 },
  { text: 'useEffect(…, [])', type: 'useEffect', line: 4, conditional: true },
  { text: "useState('dark')", type: 'useState', line: 6 },
]

export type SlotStatus = 'pending' | 'active' | 'ok' | 'error' | 'unread'

/** One column of the call → slot diagram. */
export interface SlotRead {
  /** The hook call, or null for "no call". */
  call: string | null
  /** What the slot holds, e.g. `slot 0 · state 'Ada'`. */
  slot: string
  status: SlotStatus
}

export interface Ch6Data {
  props: string
  /** memoizedState chain, e.g. `→ slot 0 → slot 1 → slot 2` */
  chain: string
  render1: SlotRead[]
  render2: SlotRead[]
  /** Which render the code pane shows. */
  render: 1 | 2
  /** React's hook-order table: Previous render / Next render per position. */
  warning?: { previous: string[]; next: string[] }
  error?: string
  modelError?: string
}

/** `slot 1 · effect, deps []` from the hook the model stored. */
function describeSlot(h: Hook, i: number): string {
  if (h.kind === 'useEffect' || h.kind === 'useLayoutEffect') {
    const e = h.memoizedState as { deps: unknown[] | null }
    return `slot ${i} · effect, deps ${e.deps ? `[${e.deps.join(', ')}]` : 'none'}`
  }
  const v = h.memoizedState
  return `slot ${i} · state ${typeof v === 'string' ? `'${v}'` : String(v)}`
}

function hookList(f: Fiber | null): Hook[] {
  const out: Hook[] = []
  for (let k = f?.memoizedState ?? null; k; k = k.next) out.push(k)
  return out
}

const IDLE_CAPTION = "Two renders of Profile are ready. Press step to watch each hook call take its slot, in order, on Profile's fiber."

export interface Ch6Params {
  /** Kept for symmetry with other scenarios; the trace has no variants. */
  variant?: 'conditional'
}

/** Chapter 6 trace: idle + 6 steps, ending in the hook-order error. */
export const ch6Hooks: Scenario<Ch6Params, Ch6Data> = () => {
  let setAdmin: SetState<boolean> = () => {}
  const Card = component('Card', () => h('div', null))
  const Profile = component('Profile', (p: { isAdmin: boolean }) => {
    const [name] = useState('Ada', 'name')
    if (p.isAdmin) useEffect(() => undefined, [], 'logAccess')
    const [theme] = useState('dark', 'theme')
    return h(Card, { $id: 'card', name, theme })
  })
  const App = component('App', () => {
    const [isAdmin, set] = useState(true, 'isAdmin')
    setAdmin = set
    return h(Profile, { $id: 'profile', isAdmin })
  })
  const root: Root = createRoot(h(App, { $id: 'app' }))
  root.mount()

  // Render 1: the committed fiber holds three hooks.
  const profile1 = root.find('profile')
  const hooks1 = hookList(profile1)
  const types1 = hookTypes(profile1)
  const calls1 = CALLS
  const slots1 = hooks1.map(describeSlot)

  // Render 2: isAdmin flips to false.
  root.act(() => setAdmin(false))
  const ev = root.flush()
  const warn = eventsOf(ev, 'hook-order-warning')[0]
  const err = eventsOf(ev, 'error')[0]
  const calls2 = CALLS.filter((c) => !c.conditional)
  const next = warn?.next ?? calls2.map((c) => c.type)
  const previous = warn?.previous ?? types1

  const props = (v: boolean) => `{ isAdmin: ${v} }`
  const chain = hooks1.map((_, i) => `→ slot ${i}`).join(' ')
  const pending = (n: number): SlotRead[] => Array.from({ length: n }, (_, i) => ({ call: calls1[i]?.text ?? null, slot: `slot ${i}`, status: 'pending' }))
  const r1 = (upto: number): SlotRead[] =>
    calls1.map((c, i) => (i < upto ? { call: c.text, slot: slots1[i], status: i === upto - 1 ? 'active' : 'ok' } : { call: c.text, slot: `slot ${i}`, status: 'pending' }))
  const r1done = r1(calls1.length).map((s) => ({ ...s, status: 'ok' as const }))

  /** Render 2: call i reads slot i; a type mismatch is the error. */
  const r2 = (upto: number): SlotRead[] =>
    hooks1.map((hk, i) => {
      const call = calls2[i]
      if (!call) return { call: null, slot: `slot ${i} · never read`, status: upto >= calls2.length ? 'unread' : 'pending' }
      if (i >= upto) return { call: call.text, slot: `slot ${i}`, status: 'pending' }
      const match = hk.kind === next[i]
      return match
        ? { call: call.text, slot: `${slots1[i]} ✓`, status: 'ok' }
        : { call: call.text, slot: `slot ${i} · holds an ${hk.kind === 'useEffect' ? 'effect' : hk.kind} ✕`, status: 'error' }
    })

  const consoleLines = (): ConsoleLine[] => [
    { tag: 'warn', text: `Warning: React has detected a change in the order of Hooks called by ${warn?.component ?? 'Profile'}.`, tone: 'trigger', level: 'warn' },
    { tag: 'error', text: `Error: ${CH6_ERROR}`, tone: 'error', level: 'error' },
  ]
  const width = Math.max(previous.length, next.length)
  const warning = {
    previous: Array.from({ length: width }, (_, i) => previous[i] ?? 'undefined'),
    next: Array.from({ length: width }, (_, i) => next[i] ?? 'undefined'),
  }

  const base: Ch6Data = { props: props(true), chain, render1: pending(3), render2: pending(3), render: 1 }
  const b = stepBuilder<Ch6Data>({ phase: 'render', caption: IDLE_CAPTION, tree: [], preview: { values: {} }, code: CH6_CODE, data: base, console: [] })

  b.step({
    phase: 'render',
    activeLine: 2,
    caption: "Render 1, isAdmin is true. The first hook call, useState('Ada'), takes slot 0 on Profile's fiber.",
    data: { ...base, render1: r1(1) },
  })
  b.step({
    phase: 'render',
    activeLine: 4,
    caption: 'The if is true, so useEffect runs and takes the next slot, slot 1. React stores the effect and its deps there.',
    data: { ...base, render1: r1(2) },
  })
  b.step({
    phase: 'render',
    activeLine: 6,
    caption: "useState('dark') takes slot 2. React now remembers three hooks for Profile, in this order.",
    data: { ...base, render1: r1(3) },
  })
  b.step({
    phase: 'trigger',
    activeLine: 1,
    caption: 'The parent re-renders Profile with isAdmin = false. React will go through the same three slots again, one per hook call.',
    data: { ...base, props: props(false), render1: r1done, render: 2 },
  })
  b.step({
    phase: 'render',
    activeLine: 2,
    caption: "Render 2: useState('Ada') reads slot 0, which holds a state hook. It matches, so name is still 'Ada'.",
    data: { ...base, props: props(false), render1: r1done, render2: r2(1), render: 2 },
  })
  b.step({
    phase: 'render',
    status: 'error',
    errorLine: 6,
    notes: { 6: '← reads slot 1' },
    dimLines: [3, 4, 5],
    caption:
      "Second render: the if was false, so useState('dark') took slot 1, which still holds last render's effect. React can't tell which hook you meant, so it stops with an error. Call hooks in the same order every render: never inside an if, a loop, or after an early return.",
    console: consoleLines(),
    data: { ...base, props: props(false), render1: r1done, render2: r2(2), render: 2, warning, error: CH6_ERROR, modelError: err?.message },
  })
  return b.build()
}
