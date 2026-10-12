import type { ReactNode } from 'react'

export interface WhyWhatHowProps {
  /** The problem the chapter solves, in the reader's own experience. */
  why: ReactNode
  /** The one idea that explains it. */
  what: ReactNode
  /** What to do with the demo below. */
  how: ReactNode
}

/**
 * The intro every chapter opens with, read top to bottom as problem → idea → try it, with the
 * label in a left gutter and the prose at reading width. Pass short prose; wrap defined terms
 * in `<b className="term">`.
 */
export function WhyWhatHow({ why, what, how }: WhyWhatHowProps) {
  const rows: [string, ReactNode][] = [
    ['The problem', why],
    ['The idea', what],
    ['Try it', how],
  ]
  return (
    <div className="flex max-w-copy flex-col gap-7">
      {rows.map(([label, body]) => (
        <div key={label} className="grid grid-cols-[112px_minmax(0,1fr)] gap-x-6 max-md:grid-cols-1 max-md:gap-y-2">
          <span className="pt-[7px] text-sm leading-none font-semibold text-text-faint">{label}</span>
          <p className="prose-body">{body}</p>
        </div>
      ))}
    </div>
  )
}
