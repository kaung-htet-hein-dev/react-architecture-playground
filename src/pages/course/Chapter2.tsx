import { useState, type ReactNode } from 'react'
import { CHAPTERS } from '../../app/chapters'
import { ChapterHeader } from '../../components/ChapterHeader'
import { CodePane } from '../../components/code/CodePane'
import { GoDeeper } from '../../components/GoDeeper'
import { Takeaway } from '../../components/Takeaway'
import { WhyWhatHow } from '../../components/WhyWhatHow'
import { OTHERS, OTHERS_KICKER, REACT, VANILLA, type ApproachCopy, type OtherId } from '../../content/ch2'
import { C } from '../../sim/colors'
import { ch2Approaches, type ApproachResult } from '../../sim/scenarios/ch2-todo'
import { ChapterSection } from './ChapterSection'

const info = CHAPTERS[1]

/** Each approach adds the same item on its own runtime; the counts come from those runs. */
const RESULTS = ch2Approaches()

const TAB_IDS = Object.keys(OTHERS) as OtherId[]

function OpsCount({ result }: { result: ApproachResult }) {
  const n = result.ops.length
  return (
    <div className="flex flex-none flex-col items-end gap-[3px]" title={result.ops.map((o) => o.text).join('\n')}>
      <span className="font-mono text-2xl leading-none font-semibold text-text-heading">{n}</span>
      <span className="font-mono text-xs leading-none font-medium text-text-label">DOM ops</span>
    </div>
  )
}

function ApproachColumn({ copy, kicker, result, tabs }: { copy: ApproachCopy; kicker: string; result: ApproachResult; tabs?: ReactNode }) {
  return (
    <article className="panel flex flex-col" aria-label={copy.name}>
      <div className="flex items-start justify-between gap-3 border-b border-divider px-4 pt-4 pb-3.5">
        <div className="flex min-w-0 flex-col gap-[5px]">
          <span className="font-mono text-xs leading-none font-medium text-text-label">{kicker}</span>
          <h3 className="m-0 text-[17px] font-semibold text-text-heading">{copy.name}</h3>
          <span className="text-[13.5px] leading-[1.45] text-text-secondary">{copy.model}</span>
        </div>
        <OpsCount result={result} />
      </div>
      {tabs}
      <div className="min-h-[230px] flex-1 border-b border-divider bg-raised">
        <CodePane code={copy.code} activeLine={copy.active} phase="render" size="sm" label={copy.name} />
      </div>
      <div className="flex flex-col gap-3.5 px-4 pt-3.5 pb-4">
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-xs leading-none font-medium" style={{ color: C.render }}>
            What runs when you add an item
          </span>
          <p className="m-0 text-sm leading-[1.55] text-text-code">{copy.runs}</p>
        </div>
        <dl className="m-0 grid grid-cols-[64px_minmax(0,1fr)] gap-x-3 gap-y-2 text-[13.5px] leading-normal">
          <dt className="font-mono text-xs leading-5 font-medium text-text-label">Gives</dt>
          <dd className="m-0 text-text-prose">{copy.plus}</dd>
          <dt className="font-mono text-xs leading-5 font-medium text-text-label">Costs</dt>
          <dd className="m-0 text-text-prose">{copy.minus}</dd>
        </dl>
      </div>
    </article>
  )
}

/**
 * Chapter 2 · Why React exists. The same to-do app by hand and in React, with other frameworks
 * in Go deeper; each DOM-ops count is the number of writes that approach made when it added an
 * item (src/sim/scenarios/ch2-todo.ts).
 */
export function Chapter2() {
  const [tab, setTab] = useState<OtherId>('vue')
  const other = OTHERS[tab]

  const tabs = (
    <div role="group" aria-label="Other approaches" className="flex flex-wrap gap-0.5 border-b border-divider px-2 py-1.5">
      {TAB_IDS.map((id) => {
        const on = id === tab
        return (
          <button
            key={id}
            type="button"
            aria-pressed={on}
            onClick={() => setTab(id)}
            className="h-7 rounded-control px-[11px] text-[12.5px] font-medium transition-colors hover:text-text-heading"
            style={{ background: on ? C.border : 'transparent', color: on ? C.heading : C.label }}
          >
            {OTHERS[id].name}
          </button>
        )
      })}
    </div>
  )

  return (
    <ChapterSection n={2}>
      <ChapterHeader n={info.n} title={info.title} phases={info.phases} />
      <WhyWhatHow
        why="The screen must always match your data. By hand, that is easy for one counter and hard for a whole app: forget one spot and the screen shows old data."
        what={
          <>
            With plain JavaScript, <i>you</i> change the page. With React, you describe the page for the current data and <i>React</i> works out the changes.
            Both end up making the same 4 <b className="term">DOM operations</b> (direct changes to the page).
          </>
        }
        how="Read both versions of the same to-do app. Look at who has to know about the 4 changes: your code, or React."
      />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(330px,1fr))] items-stretch gap-5">
        <ApproachColumn copy={VANILLA} kicker={VANILLA.kicker ?? ''} result={RESULTS.vanilla} />
        <ApproachColumn copy={REACT} kicker={REACT.kicker ?? ''} result={RESULTS.react} />
      </div>
      <GoDeeper hint="How Vue, Svelte, Solid and Angular do the same job">
        <div className="max-w-[560px]">
          <ApproachColumn copy={other} kicker={OTHERS_KICKER} result={RESULTS.fineGrained} tabs={tabs} />
        </div>
      </GoDeeper>
      <Takeaway n={2} />
    </ChapterSection>
  )
}
