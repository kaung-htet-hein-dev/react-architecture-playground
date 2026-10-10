import { alpha, C } from '../../../sim/colors'
import type { Ch6Data } from '../../../sim/scenarios/ch6-hooks'
import type { ConsoleLine } from '../../../sim/types'

/** Browser console with React's hook-order warning (Previous/Next table) and the error. */
export function HookConsole({ lines, warning }: { lines: readonly ConsoleLine[]; warning?: Ch6Data['warning'] }) {
  const warn = lines.find((l) => l.level === 'warn')
  const error = lines.find((l) => l.level === 'error')
  return (
    <div className="overflow-hidden rounded-panel border border-border bg-raised font-mono text-[12.5px] leading-[1.6]" role="log" aria-label="Console">
      <div className="panel-header" style={{ height: 36 }}>
        <span>Console</span>
        <span>
          {lines.length} message{lines.length === 1 ? '' : 's'}
        </span>
      </div>
      {lines.length === 0 && <div className="px-3.5 py-2.5 text-text-faint">No messages yet.</div>}
      {warn && (
        <div className="border-b border-divider px-3.5 py-2.5" style={{ background: alpha(C.trigger, 7), color: C.warnInk }}>
          {warn.text}
          {warning && (
            <span className="mt-1.5 grid grid-cols-[28px_200px_1fr] text-text-node max-md:grid-cols-[24px_1fr_1fr]">
              <span />
              <span className="text-text-label">Previous render</span>
              <span className="text-text-label">Next render</span>
              {warning.previous.map((p, i) => {
                const n = warning.next[i]
                return (
                  <span key={i} className="contents">
                    <span>{i + 1}.</span>
                    <span>{p}</span>
                    <span style={{ color: n === p ? undefined : C.error }}>{n}</span>
                  </span>
                )
              })}
            </span>
          )}
        </div>
      )}
      {error && (
        <div className="px-3.5 py-2.5" style={{ background: alpha(C.error, 8), color: C.previewErrorInk }}>
          {error.text}
        </div>
      )}
    </div>
  )
}
