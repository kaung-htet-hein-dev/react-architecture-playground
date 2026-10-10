import type { ReactNode } from 'react'

export interface WhyWhatHowProps {
  why: ReactNode
  what: ReactNode
  how: ReactNode
}

/**
 * The three intro columns every chapter opens with, always in why → what → how order.
 * Pass prose; wrap defined terms in `<b className="term">`.
 */
export function WhyWhatHow({ why, what, how }: WhyWhatHowProps) {
  const cols: [string, ReactNode][] = [
    ['Why', why],
    ['What', what],
    ['How', how],
  ]
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-x-10 gap-y-6">
      {cols.map(([label, body]) => (
        <div key={label} className="flex flex-col gap-2">
          <span className="label">{label}</span>
          <p className="prose-body">{body}</p>
        </div>
      ))}
    </div>
  )
}
