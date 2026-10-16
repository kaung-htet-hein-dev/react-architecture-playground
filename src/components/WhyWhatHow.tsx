import type { ReactNode } from 'react'
import { SUMMARIES } from '../content/summaries'

export interface WhyWhatHowProps {
  /** Chapter number: its summary is the "In one sentence" row, the same words the Remember box uses. */
  n: number
  /** The problem the chapter solves, in the reader's own experience. */
  why: ReactNode
  /** The idea in more detail. Define each new word inline and wrap it in `<b className="term">`. */
  what: ReactNode
  /** An everyday picture of the idea, and where it stops matching React. */
  analogy?: { body: ReactNode; breaks?: ReactNode }
  /** Anything that happens in order, one short step each. */
  steps?: readonly ReactNode[]
  /** Gutter label for `steps` when they are not in time order (default "Step by step"). */
  stepsLabel?: string
  /** The question a reader would ask next, answered right away. */
  ask?: { q: ReactNode; a: ReactNode }
  /** What to do with the demo below. */
  how: ReactNode
}

/** A numbered list of short steps, styled to sit inside prose. */
export function Steps({ items }: { items: readonly ReactNode[] }) {
  return (
    <ol className="prose-body m-0 flex list-decimal flex-col gap-1.5 pl-5 marker:font-mono marker:text-sm marker:text-text-label">
      {items.map((s, i) => (
        <li key={i} className="pl-1">
          {s}
        </li>
      ))}
    </ol>
  )
}

/**
 * The intro every chapter opens with, read top to bottom (see TEACHING.md): the problem, the
 * idea in one sentence, the idea in detail, a picture to hold on to, the steps in order, the
 * obvious question, then what to try. Labels sit in a left gutter and the prose at reading width.
 */
export function WhyWhatHow({ n, why, what, analogy, steps, stepsLabel = 'Step by step', ask, how }: WhyWhatHowProps) {
  const sentence = SUMMARIES.find((s) => s.n === n)?.text
  const rows: [string, ReactNode][] = [['The problem', <p className="prose-body">{why}</p>]]
  if (sentence) rows.push(['In one sentence', <p className="m-0 text-[19px] leading-[1.5] font-semibold text-pretty text-text-heading">{sentence}</p>])
  rows.push(['The idea', <p className="prose-body">{what}</p>])
  if (analogy)
    rows.push([
      'Think of it like this',
      <div className="flex flex-col gap-3">
        <p className="prose-body">{analogy.body}</p>
        {analogy.breaks && (
          <p className="prose-body text-text-secondary">
            <b className="font-semibold">Where the picture breaks:</b> {analogy.breaks}
          </p>
        )}
      </div>,
    ])
  if (steps) rows.push([stepsLabel, <Steps items={steps} />])
  if (ask)
    rows.push([
      'You might wonder',
      <div className="flex flex-col gap-2">
        <p className="prose-body font-semibold text-text-strong">{ask.q}</p>
        <p className="prose-body">{ask.a}</p>
      </div>,
    ])
  rows.push(['Try it', <p className="prose-body">{how}</p>])

  return (
    <div className="flex max-w-copy flex-col gap-7">
      {rows.map(([label, body]) => (
        <div key={label} className="grid grid-cols-[112px_minmax(0,1fr)] gap-x-6 max-md:grid-cols-1 max-md:gap-y-2">
          <span className="pt-[7px] text-sm leading-[1.3] font-semibold text-text-faint">{label}</span>
          {body}
        </div>
      ))}
    </div>
  )
}
