import { alpha, C } from '../sim/colors'
import { PHASES, type Phase } from '../sim/types'

export interface LoopIndicatorProps {
  /** Phases to light. */
  lit: readonly Phase[]
  className?: string
}

/**
 * Four phase pills (26px, mono 10.5 uppercase, 6px dot). Lit: phase text and dot, 12% fill,
 * 45% border. Unlit: faint text, dark dot, border. Pills switch instantly, with no colour
 * transition: a cross-fade showed the old and new phase lit together (e.g. Render + Reconcile
 * for a moment when ch5 became current), which R-G4 rules out.
 */
export function LoopIndicator({ lit, className = '' }: LoopIndicatorProps) {
  const label = lit.length ? `Current phase: ${lit.join(', ')}` : 'No phase active'
  return (
    <div className={`flex flex-none gap-1 ${className}`} role="status" aria-label={label}>
      {PHASES.map((k) => {
        const on = lit.includes(k)
        return (
          <span
            key={k}
            aria-hidden
            className="flex h-[26px] items-center gap-1.5 rounded-control border px-2.5 font-mono text-[10.5px] leading-none font-medium tracking-[0.07em] uppercase"
            style={{
              borderColor: on ? alpha(C[k], 45) : C.border,
              background: on ? alpha(C[k], 12) : 'transparent',
              color: on ? C[k] : C.faint,
            }}
          >
            <span className="size-1.5 rounded-full" style={{ background: on ? C[k] : C.dotOff }} />
            {k}
          </span>
        )
      })}
    </div>
  )
}
