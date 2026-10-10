import { alpha, C, toneColor } from '../sim/colors'
import type { LogEntry } from '../sim/types'

export interface DomLogProps {
  /**
   * Rows to show. Pass the step's cumulative log, or the full final log together with
   * `current` to show upcoming rows dimmed.
   */
  entries: readonly LogEntry[]
  /** Rows done so far (1-based current row). Defaults to `entries.length`. */
  current?: number
  /** Shown when nothing has happened yet (`current` is 0). */
  placeholder?: string
  /** The 34px "Log · step · phase" header. */
  header?: boolean
  className?: string
}

const DEFAULT_PLACEHOLDER = 'Nothing yet. Every step React takes, and every DOM write it makes, will be listed here.'

/**
 * Ordered log of steps and DOM writes (README "Log rows"): `18px | 1fr | auto` grid in mono 12.
 * The current row gets a 10% phase tint, future rows 35% opacity, error rows red on red tint.
 */
export function DomLog({ entries, current = entries.length, placeholder = DEFAULT_PLACEHOLDER, header, className = '' }: DomLogProps) {
  return (
    <div className={className}>
      {header && (
        <div className="flex h-[34px] items-center justify-between border-t border-divider px-3.5 font-mono text-[11px] leading-none font-medium tracking-[0.06em] text-text-label uppercase">
          <span>Log</span>
          <span>step · phase</span>
        </div>
      )}
      {current === 0 ? (
        <p className="m-0 px-3.5 pt-2.5 pb-4 text-[13.5px] leading-normal text-text-label">{placeholder}</p>
      ) : (
        <ol className="m-0 flex list-none flex-col p-0 pb-2" aria-label="Log">
          {entries.map((r, i) => {
            const isErr = r.tone === 'error'
            const isCur = i === current - 1
            const future = i >= current
            const c = toneColor(r.tone)
            return (
              <li
                key={r.id ?? i}
                aria-current={isCur ? 'step' : undefined}
                className="grid grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-2.5 px-3.5 py-[5px] font-mono text-xs leading-[1.45] transition-[background-color,opacity] duration-150"
                style={{
                  background: isErr ? alpha(C.error, 10) : isCur ? alpha(c, 10) : 'transparent',
                  opacity: future ? 0.35 : 1,
                }}
              >
                <span className="text-text-faint">{i + 1}</span>
                <span className="truncate" style={{ color: isErr ? C.error : isCur ? C.heading : C.prose }} title={r.text}>
                  {r.text}
                </span>
                <span className="text-[10px] tracking-[0.07em] uppercase" style={{ color: c }}>
                  {r.tag ?? r.tone}
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
