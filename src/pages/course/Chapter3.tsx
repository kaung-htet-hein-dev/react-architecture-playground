import { useState } from 'react'
import { CHAPTERS } from '../../app/chapters'
import { ChapterHeader } from '../../components/ChapterHeader'
import { CodePane } from '../../components/code/CodePane'
import { Panel } from '../../components/Panel'
import { WhyWhatHow } from '../../components/WhyWhatHow'
import { C } from '../../sim/colors'
import { CH3_COMPILED, CH3_COUNT_LINE, CH3_JSX, ch3Objects } from '../../sim/scenarios/ch3-elements'
import { ChapterSection } from './ChapterSection'

const info = CHAPTERS[2]

const stepBtn =
  'flex h-7 w-[30px] items-center justify-center rounded-control bg-control font-mono text-[15px] font-medium text-text-strong transition-colors hover:bg-control-hover max-md:h-11 max-md:w-11'

/**
 * Chapter 3 · UI as a function of state. A count stepper drives the third pane: Counter is
 * rendered with the model's jsx() and the returned element objects are printed live.
 */
export function Chapter3() {
  const [count, setCount] = useState(3)
  const objects = ch3Objects(count)

  return (
    <ChapterSection n={3}>
      <ChapterHeader n={info.n} title={info.title} phases={info.phases} />
      <WhyWhatHow
        why={'"It re-rendered" sounds expensive and vague. It gets much clearer once you see what a render actually produces: plain objects.'}
        what={
          <>
            JSX is shorthand for function calls. Each call returns a <b className="term">React element</b>: a small object with a type, props and children that
            describes one piece of UI. <b className="term">Rendering</b> means calling your component to get a tree of these objects. Nothing touches the DOM yet.
          </>
        }
        how={'Change count. The JSX stays the same; only the value inside the objects changes. Same input, same output: that\'s what "UI is a function of state" means.'}
      />
      <div className="flex flex-col gap-3">
        <div className="panel flex flex-wrap items-center gap-3.5 px-3.5 py-2.5">
          <span className="font-mono text-[11px] leading-none font-medium tracking-[0.06em] text-text-label uppercase">State</span>
          <div className="flex items-center gap-0.5 rounded-button border border-border bg-bg p-0.5" role="group" aria-label="count">
            <button type="button" className={stepBtn} onClick={() => setCount((c) => c - 1)} aria-label="Decrease count">
              −
            </button>
            <output className="min-w-24 text-center font-mono text-[13px] font-medium text-text-heading" aria-live="polite">
              count = <span style={{ color: C.render }}>{count}</span>
            </output>
            <button type="button" className={stepBtn} onClick={() => setCount((c) => c + 1)} aria-label="Increase count">
              +
            </button>
          </div>
          <span className="flex-1" />
          <span className="flex items-center gap-2 font-mono text-xs font-medium text-text-secondary">
            <span className="size-[7px] rounded-full bg-text-faint" aria-hidden />0 DOM operations · render only made objects
          </span>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-3">
          <Panel title="1 · What you write" meta="JSX">
            <CodePane code={CH3_JSX} activeLine={5} phase="render" size="sm" label="Counter.jsx" />
          </Panel>
          <Panel title="2 · What the compiler outputs" meta="JS">
            <CodePane code={CH3_COMPILED} activeLine={7} phase="render" size="sm" label="Counter.js (compiled)" />
          </Panel>
          <Panel title="3 · What render returns" meta="Objects">
            <CodePane code={objects} activeLine={CH3_COUNT_LINE} phase="render" size="sm" notes={{ [CH3_COUNT_LINE]: '← count' }} label="Element objects" />
          </Panel>
        </div>
      </div>
    </ChapterSection>
  )
}
