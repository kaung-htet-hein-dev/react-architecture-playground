/**
 * Shared simulation types (REQUIREMENTS §5 R-S1). A scenario is a pure function
 * `(params) => Step[]`; every Step is a full snapshot of one moment, and the UI only renders
 * `steps[index]`. Components in src/components consume these shapes directly.
 */

/* ------------------------------------------------------------------ phases and tones */

/** The four React phases. Each has a fixed color (see src/sim/colors.ts). */
export type Phase = 'trigger' | 'render' | 'reconcile' | 'commit'

export const PHASES: readonly Phase[] = ['trigger', 'render', 'reconcile', 'commit']

/** A step can also be the browser painting, which is not a React phase. */
export type StepPhase = Phase | 'paint'

/**
 * Anything that picks a color: a phase, paint, or error. Error is not a phase; it marks
 * broken rules and wrong results.
 */
export type Tone = StepPhase | 'error'

export const isPhase = (v: unknown): v is Phase =>
  v === 'trigger' || v === 'render' || v === 'reconcile' || v === 'commit'

/* ------------------------------------------------------------------ component tree */

/**
 * Visual state of a tree node (README "Node states"):
 * idle, render (re-rendering), reconcile (compared), dom (DOM changed), skip (bailed out),
 * removed, error, pending (not created yet).
 */
export type NodeState =
  | 'idle'
  | 'render'
  | 'reconcile'
  | 'dom'
  | 'skip'
  | 'removed'
  | 'error'
  | 'pending'

export interface TreeNode {
  id: string
  label: string
  /** Parent id. Nodes without a (known) parent are roots. Children keep array order. */
  parent?: string
  state?: NodeState
  /** Small badge on the top-right corner: `memo`, `useContext`, `setState`, `count 2`. */
  tag?: string
  /** setState was called here: amber ring. Wins over `selected`. */
  trigger?: boolean
  /** Selected by the user (Playground hook panel): light ring. */
  selected?: boolean
  /** Render order, shown as a numbered badge when `showOrder` (reduced motion). */
  order?: number
  /** React key, for list scenarios. Not drawn by the tree. */
  key?: string
  /** Free-form hover text. */
  title?: string
}

/* ------------------------------------------------------------------ log and DOM */

/** One row of the step log (DomLog). The log on a Step is cumulative. */
export interface LogEntry {
  text: string
  /** Picks the row's tag color. `error` rows get red text on a red tint. */
  tone: Tone
  /** Tag text on the right; defaults to `tone`. */
  tag?: string
  /** Stable id, when a scenario needs to address a row. */
  id?: string
}

export type DomOpKind =
  | 'createElement'
  | 'createText'
  | 'insert'
  | 'append'
  | 'move'
  | 'remove'
  | 'setText'
  | 'setAttribute'
  | 'removeAttribute'
  | 'setProperty'
  | 'setStyle'
  | 'addListener'
  | 'removeListener'
  | 'setTitle'

/** One write to the real DOM, emitted by the commit phase. */
export interface DomOp {
  kind: DomOpKind
  /** Human-readable target, e.g. `p`, `li[key=2]`, `text` */
  target: string
  /** What the log shows, e.g. `p.firstChild.nodeValue = "1"` */
  text: string
  /** New value, when the op sets one. */
  value?: string
  /** Previous value, when known. */
  prev?: string
  /** Tree node the op touched. */
  nodeId?: string
  /** React key of the touched element, for list scenarios. */
  key?: string
}

/* ------------------------------------------------------------------ queues and hooks */

/** React lanes used in this guide, from highest to lowest priority. */
export type Lane =
  | 'SyncLane'
  | 'InputContinuousLane'
  | 'DefaultLane'
  | 'TransitionLane'
  | 'RetryLane'
  | 'IdleLane'

export type UpdateStatus = 'waiting' | 'processing' | 'applied' | 'cleared' | 'skipped' | 'interrupted'

/** A queued state update (Playground "Update queue"). */
export interface Update {
  id: string
  /** Component whose queue holds the update. */
  component: string
  /** Source text, e.g. `setCount(0 + 1)` or `setCount(c => c + 1)` */
  text: string
  lane: Lane
  status: UpdateStatus
  /** e.g. `→ 1`, `applied → 2`, `applied · cleared` */
  result?: string
  /** `value` replaces the state; `updater` is a function of the previous state. */
  kind?: 'value' | 'updater'
  /** Highlighted as the update that just happened. */
  active?: boolean
}

export type HookType =
  | 'useState'
  | 'useReducer'
  | 'useEffect'
  | 'useLayoutEffect'
  | 'useInsertionEffect'
  | 'useMemo'
  | 'useCallback'
  | 'useRef'
  | 'useContext'
  | 'useTransition'
  | 'useDeferredValue'
  | 'useOptimistic'
  | 'useActionState'
  | 'useId'
  | 'use'

/** One entry in a fiber's memoizedState hook list, in call order. */
export interface HookSlot {
  /** 0-based position in the hook list. */
  index: number
  type: HookType
  component: string
  /** Display value, e.g. `0 → 2 · this render`, `deps [0] → [2] · changed` */
  value: string
  /**
   * idle: nothing happening · active: being read this step · changed: value changed ·
   * error: read by the wrong hook call · unread: never reached this render
   */
  status?: 'idle' | 'active' | 'changed' | 'error' | 'unread'
  /** Which call read this slot this render, when it differs from `type` (ch6 mismatch). */
  readBy?: string
}

export type EffectKind = 'passive' | 'layout' | 'insertion'

export type EffectStatus = 'scheduled' | 'waiting' | 'cleanup' | 'running' | 'ran' | 'skipped'

/** One effect in the effect queue. Layout effects run before paint, passive after. */
export interface EffectEntry {
  id: string
  kind: EffectKind
  component: string
  /** e.g. `useEffect · document.title` */
  label: string
  /** Dependency array as written, e.g. `[count]`; undefined for "no array". */
  deps?: string
  status: EffectStatus
  /** e.g. `waiting for paint`, `ran after paint`, `deps unchanged` */
  detail?: string
}

/** One console line. `tag` is the bracketed source, e.g. `[render]`. */
export interface ConsoleLine {
  tag: string
  text: string
  tone: Tone | 'info'
  level?: 'log' | 'warn' | 'error'
}

/* ------------------------------------------------------------------ preview and timeline */

/**
 * What the light "live preview" shows at this step. Values are scenario-specific (count,
 * list items, input text); `highlight` names the value whose DOM write is the current step.
 */
export interface PreviewState {
  values: Record<string, string | number | boolean | readonly string[]>
  /** Keys in `values` that get the commit-green highlight this step. */
  highlight?: readonly string[]
  /** Browser tab title (document.title), when the scenario shows it. */
  tabTitle?: string
  /** Address bar text; LivePreview defaults to `localhost:5173`. */
  url?: string
  /** Uncaught error overlay instead of the app. */
  error?: { title: string; message: string }
}

/** Timeline block kinds beyond phase colors. */
export type BlockKind = Tone | 'idle' | 'gone' | 'urgent'

/**
 * A block on a FrameTimeline. Positions are percentages of the timeline width.
 * In the one-frame timeline, blocks without `width` take the remaining space.
 */
export interface Block {
  id?: string
  kind: BlockKind
  /** Left edge in % of the track (multi-frame timelines). */
  start?: number
  /** Width in % of the track. */
  width?: number
  label?: string
  /** Hover text. */
  title?: string
  /** Faded (not reached yet). */
  dim?: boolean
  /** Row index for multi-track timelines (0 = top). */
  row?: number
}

export interface Timeline {
  /** Playhead position in % of the track. */
  playhead: number
  blocks: Block[]
}

/* ------------------------------------------------------------------ steps */

/** A full snapshot of one simulation moment. `D` carries scenario-specific extras. */
export interface Step<D = unknown> {
  phase: StepPhase
  /** 1-based code line being executed; 0 = none. */
  activeLine: number
  errorLine?: number
  /** Inline notes keyed by 1-based line, e.g. `{ 7: '← text changes here' }` */
  notes?: Record<number, string>
  /** Lines that did not run, drawn at 36% opacity. */
  dimLines?: number[]
  /** Source to show, when the step changes it (e.g. ch1's error variant). */
  code?: string
  /** Node states at this moment (current tree in the Playground). */
  tree: TreeNode[]
  /** Work-in-progress tree (Playground only). */
  wipTree?: TreeNode[]
  /** Which tree `root.current` points at. Flips to `wip` on commit. */
  rootCurrent?: 'current' | 'wip'
  /** Cumulative log. */
  log: LogEntry[]
  /** Cumulative DOM writes. */
  domOps: DomOp[]
  queue?: Update[]
  hooks?: HookSlot[]
  effects?: EffectEntry[]
  console?: ConsoleLine[]
  preview: PreviewState
  timeline?: Timeline
  /** One sentence in mentor voice explaining the step that just happened. */
  caption: string
  /** Phases lit in the loop indicator; defaults to `[phase]` when phase is a Phase. */
  loopPhases?: Phase[]
  /** Short header meta for the tree panel, e.g. `1 rendered · 1 DOM change` */
  treeNote?: string
  status?: 'error'
  data?: D
}

/** A scenario is a pure function from params to a trace. Index 0 is the idle frame. */
export type Scenario<P, D = unknown> = (params: P) => Step<D>[]

/* ------------------------------------------------------------------ playback */

export type SimStatus = 'idle' | 'running' | 'paused' | 'error' | 'complete'

export type SimSpeed = 0.25 | 0.5 | 1 | 2

export const SPEEDS: readonly SimSpeed[] = [0.25, 0.5, 1, 2]

/** Autoplay interval per speed (R-S3). */
export const SPEED_MS: Record<SimSpeed, number> = { 0.25: 3200, 0.5: 1800, 1: 1100, 2: 550 }

export const speedLabel = (s: SimSpeed) => `${s}×`

/** What `useSimulation(scenario, params)` returns (R-S3). */
export interface SimulationApi<D = unknown> {
  step: Step<D>
  steps: Step<D>[]
  /** Index into `steps`; 0 is the idle frame. */
  index: number
  /** Number of steps after the idle frame (`steps.length - 1`). */
  total: number
  status: SimStatus
  speed: SimSpeed
  play: () => void
  pause: () => void
  stepForward: () => void
  stepBack: () => void
  reset: () => void
  seek: (index: number) => void
  setSpeed: (s: SimSpeed) => void
}
