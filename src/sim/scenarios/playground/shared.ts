import { flagNames, hookSlots, laneName, stepBuilder, type Fiber, type ModelUpdate, type Root, type StepInput } from '../../model'
import type { BlockKind, ConsoleLine, Scenario, Step, Timeline, Tone, TreeNode, Update, UpdateStatus } from '../../types'

/**
 * Playground presets (REQUIREMENTS §7 R-P8). Each preset is a scenario `(params) => Step[]`
 * built on the fiber model, where `params` are the values of the editable `⟦params⟧` in its
 * code, in source order. Everything the Playground panels show that has no slot on `Step`
 * lives in `Step.data` (PgData).
 */

/** One `key: value` row under a fiber tree (design "fiber fields"). */
export interface PgField {
  k: string
  v: string
  /** Value color; `label` is the muted first row. Default: node text. */
  tone?: Tone | 'label'
}

/** One hook slot in the "Hook slots" panel. */
export interface PgHook {
  n: number
  type: string
  val: string
  /** Value color. */
  tone?: Tone
  /** Border in the tone color: this slot is the one being read or run this step. */
  hot?: boolean
}

/**
 * The two fiber buffers. `current` is what root.current points at; `wip` is being built;
 * `alternate` is the previous tree, kept for the next render; `empty` has not been created.
 */
export type PaneRole = 'current' | 'wip' | 'alternate' | 'empty'

export interface PgPane {
  role: PaneRole
  tree: TreeNode[]
  fields: PgField[]
}

export interface PgData {
  /** Left and right tree panes. root.current points at the one whose role is `current`. */
  panes: [PgPane, PgPane]
  /** Show "⇄ swapped on commit" under the pointer. */
  swapBanner: boolean
  /** Hook slots per component node id (missing = no hooks). */
  hooks: Record<string, PgHook[]>
  /** Component whose hook slots show until the user picks a node. */
  focus: string
  /** "Update queue · <queueOf>" */
  queueOf: string
  /** Effect-queue header meta; default "runs after paint". */
  effectNote?: string
}

export type PgStep = Step<PgData>

export interface PresetDef {
  id: string
  label: string
  /** Code-pane file name, e.g. Counter.jsx */
  file: string
  /** Source with editable values written ⟦value⟧. */
  code: string
  /** Note under the code; null when the preset has no editable values. */
  paramNote: string | null
  /** Hint above the live preview, e.g. "click the button". */
  previewHint: string
  /** Tree column width that fits both panes in the center column. */
  colWidth: number
  scenario: Scenario<string[], PgData>
}

/* ------------------------------------------------------------------ params */

const PARAM_RE = /⟦([^⟧]*)⟧/g

/** Default values of a template's ⟦params⟧, in source order. */
export const paramDefaults = (code: string): string[] => [...code.matchAll(PARAM_RE)].map((m) => m[1])

/** The template with each ⟦param⟧ replaced by `params[i]` (missing ones keep the default). */
export function fillParams(code: string, params: readonly string[]): string {
  let i = 0
  return code.replace(PARAM_RE, (_, d: string) => `⟦${params[i++] ?? d}⟧`)
}

/** Strip characters that would break the ⟦…⟧ markers. */
export const cleanParam = (v: string) => v.replace(/[⟦⟧\n]/g, '')

/** An integer param, clamped; anything that isn't a number falls back. */
export function intParam(v: string | undefined, fallback: number, min = -999, max = 999): number {
  const n = Number(String(v ?? '').trim())
  if (v == null || String(v).trim() === '' || !Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.trunc(n)))
}

/** `true`/`false` param; anything else falls back. */
export function boolParam(v: string | undefined, fallback: boolean): boolean {
  const s = String(v ?? '').trim()
  if (s === 'true') return true
  if (s === 'false') return false
  return fallback
}

/** A string param written inside quotes, trimmed and bounded. */
export const textParam = (v: string | undefined, fallback: string, max = 24) => {
  const s = String(v ?? '').trim().slice(0, max)
  return s === '' ? fallback : s
}

/* ------------------------------------------------------------------ timeline */

/** Six 16.7ms frames: each is 100/6 % of the track. */
export const FRAME = 100 / 6

export interface TLBlock {
  start: number
  width: number
  kind: BlockKind
  title: string
  /** From this playhead on, the block is drawn as something else (e.g. work thrown away). */
  after?: { playhead: number; kind: BlockKind; title: string }
}

/** Blocks right of the playhead are faded: they haven't happened yet. */
export const timelineAt = (blocks: readonly TLBlock[], playhead: number): Timeline => ({
  playhead,
  blocks: blocks.map((b) => {
    const late = b.after && playhead >= b.after.playhead ? b.after : null
    return { start: b.start, width: b.width, kind: late?.kind ?? b.kind, title: late?.title ?? b.title, dim: b.start > playhead }
  }),
})

/* ------------------------------------------------------------------ panes, fields, hooks */

export const field = (k: string, v: string, tone?: PgField['tone']): PgField => ({ k, v, ...(tone ? { tone } : {}) })

export const pane = (role: PaneRole, tree: TreeNode[], fields: PgField[]): PgPane => ({ role, tree, fields })

/** Hook slots of a fiber as panel rows. */
export const hookRows = (f: Fiber | null): PgHook[] => hookSlots(f).map((s) => ({ n: s.index, type: s.type, val: s.value }))

/** Override some rows of a hook list by slot number. */
export const patchHooks = (rows: PgHook[], patch: Record<number, Partial<PgHook>>): PgHook[] =>
  rows.map((r) => (patch[r.n] ? { ...r, ...patch[r.n] } : r))

/** Fiber flags as text: `Update · Passive`, or an em dash. */
export const flagsText = (f: Fiber | null) => {
  const names = f ? flagNames(f.flags) : []
  return names.length ? names.join(' · ') : '—'
}

/** Apply per-node overrides to a TreeNode list. */
export const withNodes = (tree: readonly TreeNode[], nodes: Record<string, Partial<TreeNode>>): TreeNode[] =>
  tree.map((n) => (nodes[n.id] ? { ...n, ...nodes[n.id] } : { ...n }))

/** Every node in `state` (e.g. the old tree after a swap is drawn as skipped). */
export const allNodes = (tree: readonly TreeNode[], patch: Partial<TreeNode>): TreeNode[] => tree.map((n) => ({ ...n, ...patch }))

/* ------------------------------------------------------------------ queue */

/** A queue row for the panel from a model update. */
export function queueRow(u: ModelUpdate, status: UpdateStatus, result: string, active = false, text = u.text): Update {
  return {
    id: u.id,
    component: u.component,
    text,
    lane: u.revertLane ? 'SyncLane' : laneName(u.lane),
    status,
    result,
    kind: typeof u.action === 'function' ? 'updater' : 'value',
    ...(active ? { active } : {}),
  }
}

/** `0` → `"0"`, `'a'` → `'"a"'`, arrays as `[a, b]`. */
export function show(v: unknown): string {
  if (typeof v === 'string') return JSON.stringify(v)
  if (Array.isArray(v)) return `[${v.map(show).join(', ')}]`
  if (v === null) return 'null'
  return String(v)
}

/* ------------------------------------------------------------------ console */

export const line = (tag: string, text: string, tone: ConsoleLine['tone'], level?: ConsoleLine['level']): ConsoleLine => ({
  tag,
  text,
  tone,
  ...(level ? { level } : {}),
})

/* ------------------------------------------------------------------ builder */

export type PgInput = StepInput<PgData> & { playhead: number }

/**
 * stepBuilder for the Playground: every step gives its playhead, and the timeline fades the
 * blocks the playhead hasn't reached. The console accumulates: `say` appends lines.
 */
export function pgBuilder(blocks: readonly TLBlock[], idle: PgInput & Pick<PgStep, 'tree' | 'preview'>) {
  let consoleLines: ConsoleLine[] = idle.console ?? []
  const conv = ({ playhead, ...rest }: PgInput, say?: ConsoleLine | ConsoleLine[]) => {
    if (say) consoleLines = [...consoleLines, ...(Array.isArray(say) ? say : [say])]
    return { ...rest, console: consoleLines, timeline: timelineAt(blocks, playhead) }
  }
  const b = stepBuilder<PgData>({ loopPhases: [], ...conv(idle) } as StepInput<PgData> & Pick<PgStep, 'tree' | 'preview'>)
  return {
    step: (input: PgInput, say?: ConsoleLine | ConsoleLine[]) => b.step(conv(input, say)),
    get last() {
      return b.last
    },
    build: () => b.build(),
  }
}

/** Fiber in the committed or work-in-progress tree. */
export const fiberIn = (root: Root, id: string, tree: 'current' | 'wip' = 'current') => root.find(id, tree)
