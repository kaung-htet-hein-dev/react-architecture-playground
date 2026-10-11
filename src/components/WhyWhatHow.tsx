import type { ReactNode } from 'react'

export interface WhyWhatHowProps {
  why: ReactNode
  what: ReactNode
  how: ReactNode
}

/**
 * The intro every chapter opens with, read top to bottom in why → what → how order, with the
 * label in a left gutter and the prose at reading width. Pass prose; wrap defined terms in
 * `<b className="term">`.
 */
export function WhyWhatHow({ why, what, how }: WhyWhatHowProps) {
  const rows: [string, ReactNode][] = [
    ['Why', why],
    ['What', what],
    ['How', how],
  ]
  return (
    <div className="flex max-w-copy flex-col gap-7">
      {rows.map(([label, body]) => (
        <div key={label} className="grid grid-cols-[64px_minmax(0,1fr)] gap-x-6 max-md:grid-cols-[48px_minmax(0,1fr)] max-md:gap-x-4">
          <span className="pt-[7px] text-sm leading-none font-semibold text-text-faint">{label}</span>
          <p className="prose-body">{body}</p>
        </div>
      ))}
    </div>
  )
}
