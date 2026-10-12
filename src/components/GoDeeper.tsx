import type { ReactNode } from 'react'

/**
 * Optional extras at the end of a chapter, closed by default so the main path stays short.
 * A native `<details>`, so it works with the keyboard and without JavaScript state.
 */
export function GoDeeper({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <details className="group rounded-panel border border-border bg-panel">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 px-4 py-3 text-[15px] font-semibold text-text-heading hover:bg-panel-hi [&::-webkit-details-marker]:hidden">
        <span className="font-mono text-text-label transition-transform group-open:rotate-90" aria-hidden>
          ›
        </span>
        Go deeper
        <span className="text-sm font-normal text-text-label">{hint ?? 'Optional. Skip it on a first read.'}</span>
      </summary>
      <div className="flex flex-col gap-5 border-t border-divider p-4">{children}</div>
    </details>
  )
}
