import type { NodeState, Phase, SimStatus, Tone } from './types'

const v = (name: string) => `var(--color-${name})`

/**
 * Runtime palette for inline styles. Every entry points at a token in src/styles/tokens.css,
 * so there are no color values in TypeScript. Use `alpha()` for translucent variants.
 */
export const C = {
  trigger: v('trigger'),
  render: v('render'),
  reconcile: v('reconcile'),
  commit: v('commit'),
  error: v('error'),
  paint: v('paint'),
  onPhase: v('on-phase'),
  accent: v('accent'),
  logo: v('logo'),
  accentInk: v('accent-ink'),
  link: v('link'),

  bg: v('bg'),
  raised: v('raised'),
  panel: v('panel'),
  panelHi: v('panel-hi'),
  control: v('control'),
  controlHover: v('control-hover'),
  divider: v('divider'),
  border: v('border'),
  borderStrong: v('border-strong'),
  track: v('track'),
  trackSoft: v('track-soft'),
  paintBlock: v('paint-block'),

  nodeIdleBg: v('node-idle-bg'),
  nodeIdleBd: v('node-idle-bd'),
  nodeIdleFg: v('node-idle-fg'),
  nodeSkipBd: v('node-skip-bd'),
  nodeSkipFg: v('node-skip-fg'),
  nodePendingEdge: v('node-pending-edge'),
  renderInk: v('render-ink'),
  reconcileInk: v('reconcile-ink'),
  commitInk: v('commit-ink'),

  preview: v('preview'),
  previewChrome: v('preview-chrome'),
  previewDot: v('preview-dot'),
  previewInk: v('preview-ink'),
  previewUrl: v('preview-url'),
  previewTab: v('preview-tab'),
  previewErrorBg: v('preview-error-bg'),
  previewErrorInk: v('preview-error-ink'),
  previewOk: v('preview-ok'),
  previewBad: v('preview-bad'),
  warnInk: v('warn-ink'),
  previewAlert: v('preview-alert'),
  previewMuted: v('preview-muted'),
  previewSub: v('preview-sub'),
  previewDash: v('preview-dash'),
  previewLabel: v('preview-label'),
  previewSkeleton: v('preview-skeleton'),

  heading: v('text-heading'),
  strong: v('text-strong'),
  node: v('text-node'),
  code: v('text-code'),
  prose: v('text-prose'),
  secondary: v('text-secondary'),
  muted: v('text-muted'),
  label: v('text-label'),
  faint: v('text-faint'),
  gutter: v('text-gutter'),
  dotOff: v('dot-off'),

  synKeyword: v('syn-keyword'),
  synString: v('syn-string'),
  synTag: v('syn-tag'),
  synComponent: v('syn-component'),
  synApi: v('syn-api'),
  synPunct: v('syn-punct'),
  synComment: v('syn-comment'),
  synDefault: v('syn-default'),
} as const

/**
 * `color` at `percent` opacity. Mixing with transparent in OKLCH keeps lightness, chroma and
 * hue, so `alpha(C.render, 14)` equals `oklch(78% 0.12 240 / 0.14)`.
 */
export const alpha = (color: string, percent: number) =>
  `color-mix(in oklch, ${color} ${percent}%, transparent)`

/** Solid color for a phase, paint or error. */
export const toneColor = (tone: Tone): string => C[tone]

/** Display label for a phase. */
export const PHASE_LABEL: Record<Phase, string> = {
  trigger: 'Trigger',
  render: 'Render',
  reconcile: 'Reconcile',
  commit: 'Commit',
}

/** Focus/selection ring: `0 0 0 2px bg, 0 0 0 3.5px color`. */
export const ring = (color: string) => `0 0 0 2px ${C.bg}, 0 0 0 3.5px ${color}`

export interface NodeStyle {
  bg: string
  bd: string
  fg: string
  strike: boolean
  /** Edge into the node */
  edge: string
  dashed: boolean
  /** Order-badge fill */
  dot: string
}

const solidNode = (c: string, fg: string, fill = 16): NodeStyle => ({
  bg: alpha(c, fill),
  bd: `1px solid ${c}`,
  fg,
  strike: false,
  edge: alpha(c, 75),
  dashed: false,
  dot: c,
})

/** Tree-node styles per state (README "Node states", ported from design/Tree.dc.html). */
export const NODE_STYLE: Record<NodeState, NodeStyle> = {
  idle: { bg: C.nodeIdleBg, bd: `1px solid ${C.nodeIdleBd}`, fg: C.nodeIdleFg, strike: false, edge: C.nodeIdleBd, dashed: false, dot: C.label },
  render: solidNode(C.render, C.renderInk),
  reconcile: solidNode(C.reconcile, C.reconcileInk),
  dom: solidNode(C.commit, C.commitInk),
  error: solidNode(C.error, '#ffffff', 20),
  skip: { bg: C.bg, bd: `1px dashed ${C.nodeSkipBd}`, fg: C.nodeSkipFg, strike: false, edge: C.nodeIdleBd, dashed: true, dot: C.faint },
  removed: { bg: alpha(C.error, 6), bd: `1px dashed ${C.error}`, fg: C.error, strike: true, edge: alpha(C.error, 50), dashed: true, dot: C.error },
  pending: { bg: 'transparent', bd: `1px dashed ${C.nodeIdleBd}`, fg: C.faint, strike: false, edge: C.nodePendingEdge, dashed: true, dot: C.faint },
}

export interface ChipStyle {
  label: string
  fg: string
  bg: string
}

/** Status chip for SimControls (README "SimControls" states). `step` is 1-based. */
export function statusChip(status: SimStatus, phaseColor: string, step: number, total: number): ChipStyle {
  switch (status) {
    case 'idle':
      return { label: 'Ready', fg: C.secondary, bg: C.control }
    case 'running':
      return { label: `Running · ${step}/${total}`, fg: phaseColor, bg: alpha(phaseColor, 12) }
    case 'paused':
      return { label: `Paused · ${step}/${total}`, fg: C.node, bg: C.control }
    case 'error':
      return { label: `Error · step ${step}`, fg: C.error, bg: alpha(C.error, 12) }
    case 'complete':
      return { label: `Complete · ${total}/${total}`, fg: C.strong, bg: C.control }
  }
}
