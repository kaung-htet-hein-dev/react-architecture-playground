import type { CSSProperties } from 'react'
import { alpha, C } from '../../sim/colors'
import type { Phase, StepPhase } from '../../sim/types'
import { tokenizeLines, type Token, type TokenKind } from './tokenize'

export interface CodePaneProps {
  /** Source. Editable parameters are written `⟦value⟧`. */
  code: string
  /** 1-based line being executed; 0 = none. */
  activeLine?: number
  /** 1-based error line; wins over the active line. */
  errorLine?: number
  /** Phase color for the active line. `paint` uses commit. */
  phase?: StepPhase
  /** Inline notes keyed by 1-based line, e.g. `{ 7: '← text changes here' }` */
  notes?: Record<number, string>
  /** Lines that did not run (opacity 0.36). */
  dimLines?: readonly number[]
  /** md: 13/21, 42px gutter · sm: 12/20, 34px gutter */
  size?: 'md' | 'sm'
  /**
   * Makes ⟦params⟧ editable inputs. Called with the param index (0-based, in source order)
   * and the new value.
   */
  onParamChange?: (index: number, value: string) => void
  /** Accessible name, e.g. "Counter.jsx". */
  label?: string
  className?: string
}

const TOKEN_STYLE: Record<TokenKind, CSSProperties> = {
  comment: { color: C.synComment, fontStyle: 'italic' },
  param: {},
  string: { color: C.synString },
  arrow: { color: C.synPunct },
  tag: { color: C.synTag },
  number: { color: C.synString },
  keyword: { color: C.synKeyword },
  api: { color: C.synApi, fontWeight: 500 },
  component: { color: C.synComponent },
  ident: { color: C.synDefault },
  space: { color: C.synDefault },
  punct: { color: C.synPunct },
}

const PARAM_STYLE: CSSProperties = {
  color: C.trigger,
  background: alpha(C.trigger, 12),
  outline: `1px dashed ${C.trigger}`,
  outlineOffset: 1,
  borderRadius: 3,
}

const phaseColor = (p: StepPhase): string => C[p === 'paint' ? 'commit' : (p as Phase)]

function TokenSpan({ t, onParamChange }: { t: Token; onParamChange?: CodePaneProps['onParamChange'] }) {
  if (t.kind === 'param' && onParamChange && t.param != null) {
    const index = t.param
    return (
      <input
        value={t.s}
        onChange={(e) => onParamChange(index, e.target.value)}
        aria-label={`Editable value ${index + 1}`}
        spellCheck={false}
        // The dashed amber outline marks the value as editable; on keyboard focus the standard
        // 2px focus ring replaces it (an inline outline would always win over :focus-visible).
        className="m-0 border-0 p-0 align-baseline font-[inherit] outline-1 outline-offset-1 outline-trigger outline-dashed [line-height:inherit] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-strong focus-visible:outline-solid"
        style={{ ...PARAM_STYLE, outline: undefined, outlineOffset: undefined, width: `${Math.max(1, t.s.length)}ch`, fontSize: 'inherit' }}
      />
    )
  }
  return <span style={t.kind === 'param' ? PARAM_STYLE : TOKEN_STYLE[t.kind]}>{t.s}</span>
}

/**
 * Read-only highlighted code (README "CodePane", design/Code.dc.html). The active line gets a
 * 13% phase tint, a 2px inset bar and a phase-colored line number; it slides 160ms between
 * lines (instant in reduced motion). The error line uses red and wins over the active line.
 */
export function CodePane({
  code,
  activeLine = 0,
  errorLine = 0,
  phase = 'render',
  notes = {},
  dimLines = [],
  size = 'md',
  onParamChange,
  label,
  className = '',
}: CodePaneProps) {
  const fs = size === 'sm' ? 12 : 13
  const lh = fs + 8
  const gutter = size === 'sm' ? 34 : 42
  const pad = 10
  const lines = tokenizeLines(code)
  const err = errorLine > 0 && errorLine <= lines.length ? errorLine : 0
  const active = !err && activeLine > 0 && activeLine <= lines.length ? activeLine : 0
  const hot = err || active
  const hotColor = err ? C.error : phaseColor(phase)

  return (
    <div
      role="region"
      aria-label={label ? `Code: ${label}` : 'Code'}
      tabIndex={0}
      className={`overflow-x-auto font-mono focus-visible:outline-offset-[-2px] ${className}`}
      style={{ fontSize: fs, lineHeight: `${lh}px`, padding: `${pad}px 0`, color: C.code, fontVariantLigatures: 'none', tabSize: 2 }}
    >
      <div className="relative min-w-max">
        {/* One highlight bar that slides between lines */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 transition-[transform,background-color,box-shadow,opacity] duration-[160ms] ease-out"
          style={{
            height: lh,
            transform: `translateY(${((hot || 1) - 1) * lh}px)`,
            background: alpha(hotColor, 13),
            boxShadow: `inset 2px 0 0 ${hotColor}`,
            opacity: hot ? 1 : 0,
          }}
        />
        {lines.map((toks, i) => {
          const n = i + 1
          const isHot = n === hot
          const note = notes[n]
          return (
            <div
              key={i}
              className="relative flex items-baseline pr-4"
              style={{ minHeight: lh, opacity: dimLines.includes(n) ? 0.36 : 1 }}
              aria-current={isHot ? 'step' : undefined}
            >
              <span
                aria-hidden
                className="flex-none pr-3.5 text-right select-none"
                style={{ width: gutter, color: isHot ? hotColor : C.gutter }}
              >
                {n}
              </span>
              <span className="whitespace-pre">
                {toks.map((t, j) => (
                  <TokenSpan key={j} t={t} onParamChange={onParamChange} />
                ))}
              </span>
              {note && (
                <span className="ml-[18px] text-[11px] whitespace-nowrap" style={{ color: n === err ? C.error : phaseColor(phase) }}>
                  {note}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
