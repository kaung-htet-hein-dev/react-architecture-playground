import { SUMMARIES } from '../content/summaries'
import { alpha, C } from '../sim/colors'

/**
 * The "Remember" box that closes a chapter: the one sentence to keep from it (the same text
 * the wrap-up lists under "Each chapter in one sentence").
 */
export function Takeaway({ n }: { n: number }) {
  const s = SUMMARIES.find((x) => x.n === n)
  if (!s) return null
  return (
    <aside
      aria-label="Remember"
      className="flex max-w-copy flex-col gap-2 rounded-panel px-5 py-4"
      style={{ background: alpha(C[s.phase], 8), border: `1px solid ${alpha(C[s.phase], 35)}` }}
    >
      <span className="font-mono text-xs leading-none font-semibold" style={{ color: C[s.phase] }}>
        Remember
      </span>
      <p className="m-0 text-[17px] leading-[1.55] text-pretty text-text-strong">{s.text}</p>
    </aside>
  )
}
