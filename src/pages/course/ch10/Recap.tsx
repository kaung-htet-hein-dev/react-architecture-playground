import { pad2 } from '../../../app/chapters'
import { MYTHS } from '../../../content/myths'
import { LOOP_MAP, SUMMARIES } from '../../../content/summaries'
import { alpha, C, PHASE_LABEL } from '../../../sim/colors'

/** The four phase cards, each with chips linking to the chapters that explain it. */
export function LoopMap() {
  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
        {LOOP_MAP.map(({ phase, desc, chips }) => (
          <div
            key={phase}
            className="flex flex-col gap-3.5 rounded-panel p-[18px]"
            style={{ background: alpha(C[phase], 8), border: `1px solid ${alpha(C[phase], 35)}` }}
          >
            <div className="flex flex-col gap-1.5">
              <span className="flex items-center gap-2 font-mono text-xs leading-none font-semibold tracking-[0.08em] uppercase" style={{ color: C[phase] }}>
                <span className="size-2 rounded-[2px]" style={{ background: C[phase] }} aria-hidden />
                {PHASE_LABEL[phase]}
              </span>
              <span className="text-sm leading-normal text-text-code">{desc}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {chips.map((c) => (
                <a
                  key={`${c.n}-${c.label}`}
                  href={`#ch${c.n}`}
                  className="flex h-7 items-center gap-1.5 rounded-control bg-bg px-2.5 text-[12.5px] text-text-strong hover:bg-panel-hi max-md:h-11"
                  style={{ border: `1px solid ${alpha(C[phase], 40)}` }}
                >
                  <span className="font-mono text-[11px] font-medium text-text-label">{pad2(c.n)}</span>
                  {c.label}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2.5 font-mono text-xs font-medium text-text-label">
        <span className="h-px flex-1 bg-border" aria-hidden />
        after commit, the next trigger starts the loop again
        <span className="h-px flex-1 bg-border" aria-hidden />
      </div>
    </>
  )
}

/** Myth (struck through) and fact pairs. */
export function Myths() {
  return (
    <div className="flex flex-col gap-[18px]">
      <h3 className="h3">Common myths</h3>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] gap-px overflow-hidden rounded-panel border border-divider bg-divider">
        {MYTHS.map(({ myth, fact }) => (
          <div key={myth} className="flex flex-col gap-2 bg-raised px-[18px] py-4">
            <span className="flex gap-2.5 text-[15px] leading-[1.45] text-text-secondary">
              <span className="flex-none font-mono text-[10.5px] leading-[21px] font-medium tracking-[0.06em] uppercase" style={{ color: C.error }}>
                Myth
              </span>
              <s className="decoration-text-gutter">{myth}</s>
            </span>
            <span className="flex gap-2.5 text-[15px] leading-normal text-text-strong">
              <span className="w-[34px] flex-none font-mono text-[10.5px] leading-[22px] font-medium tracking-[0.06em] uppercase" style={{ color: C.commit }}>
                Fact
              </span>
              <span>{fact}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** "Each chapter in one sentence": 9 linked cards. */
export function Summaries() {
  return (
    <div className="flex flex-col gap-[18px]">
      <h3 className="h3">Each chapter in one sentence</h3>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-3">
        {SUMMARIES.map((s) => (
          <a
            key={s.n}
            href={`#ch${s.n}`}
            className="flex flex-col gap-3 rounded-panel border border-border bg-panel px-[18px] py-4 text-text-strong hover:bg-panel-hi"
          >
            <span className="flex items-center gap-2 font-mono text-xs font-medium text-text-label">
              <span className="size-[7px] rounded-full" style={{ background: C[s.phase] }} aria-hidden />
              {pad2(s.n)}
            </span>
            <span className="text-[15px] leading-normal text-pretty text-text-strong">{s.text}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
