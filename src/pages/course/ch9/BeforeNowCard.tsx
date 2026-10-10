import type { ReactNode } from 'react'
import { CodePane } from '../../../components/code/CodePane'
import { VersionChip } from '../../../components/ui/VersionChip'
import { C } from '../../../sim/colors'
import type { Phase } from '../../../sim/types'

export interface BeforeNowCardProps {
  title: string
  /** VersionChip id (localStorage key suffix). */
  versionId: string
  children: ReactNode
  before: string
  /** Label over the Before code. Default "Before". */
  beforeLabel?: string
  now: string
  /** 1-based highlighted line in the Now code; 0 = none. */
  nowActive?: number
  nowPhase?: Phase
}

const SECTION = 'border-t border-divider px-3.5 pt-2 font-mono text-[10.5px] leading-none font-medium tracking-[0.06em] uppercase'

/** One chapter-9 card: title + editable version chip, description, the old code, then the new code. */
export function BeforeNowCard({ title, versionId, children, before, beforeLabel = 'Before', now, nowActive = 0, nowPhase = 'commit' }: BeforeNowCardProps) {
  return (
    <article className="flex flex-col overflow-hidden rounded-panel border border-border bg-panel" aria-label={title}>
      <div className="flex flex-col gap-2 px-4 pt-4 pb-3.5">
        <div className="flex items-center justify-between gap-2.5">
          <h3 className="m-0 text-[17px] font-semibold text-text-heading">{title}</h3>
          <VersionChip id={versionId} />
        </div>
        <p className="m-0 text-sm leading-[1.55] text-text-prose">{children}</p>
      </div>
      <div className={`${SECTION} text-text-label`}>{beforeLabel}</div>
      <div className="opacity-85">
        <CodePane code={before} size="sm" label={`${title}, before`} />
      </div>
      <div className={SECTION} style={{ color: C.commit }}>
        Now
      </div>
      <div className="flex-1 bg-raised">
        <CodePane code={now} size="sm" activeLine={nowActive} phase={nowPhase} label={`${title}, now`} />
      </div>
    </article>
  )
}
