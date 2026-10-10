import { useState } from 'react'
import { Link } from 'react-router'
import { CHAPTERS } from '../../app/chapters'
import { useReportHeroPhases } from '../../app/heroPhase'
import { ChapterHeader } from '../../components/ChapterHeader'
import { CodePane } from '../../components/code/CodePane'
import { DomLog } from '../../components/DomLog'
import { FrameTimeline } from '../../components/FrameTimeline'
import { LivePreview, PreviewButton, PreviewValue } from '../../components/LivePreview'
import { Panel } from '../../components/Panel'
import { SimControls } from '../../components/SimControls'
import { ComponentTree, TreeLegend } from '../../components/tree/ComponentTree'
import { Toggle } from '../../components/ui/Toggle'
import { Workbench } from '../../components/Workbench'
import { WhyWhatHow } from '../../components/WhyWhatHow'
import { C, PHASE_LABEL } from '../../sim/colors'
import { simControlProps } from '../../sim/playback'
import { CH1_CODE, ch1Counter, type Ch1Params } from '../../sim/scenarios/ch1-counter'
import { isPhase, PHASES, type Phase, type SimStatus, type Step } from '../../sim/types'
import { useSimulation } from '../../sim/useSimulation'
import { ChapterSection } from './ChapterSection'

const info = CHAPTERS[0]

/** The 4-cell loop strip under the hero: one definition per phase. */
const LOOP: Record<Phase, string> = {
  trigger: 'Something asks for new state: a click handler, a timer, a server response calling setState.',
  render: 'React calls your component functions to get a fresh description of the UI.',
  reconcile: 'React compares the new description with the previous one and lists the differences.',
  commit: 'React applies only those differences to the DOM, runs effects, and the browser paints.',
}

function LoopStrip() {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-px overflow-hidden rounded-card border border-divider bg-divider">
      {PHASES.map((p, i) => (
        <div key={p} className="flex flex-col gap-2.5 bg-raised px-[22px] pt-5 pb-[22px]">
          <span className="flex items-center gap-2 font-mono text-[11px] leading-none font-medium tracking-[0.08em] uppercase" style={{ color: C[p] }}>
            <span className="size-2 rounded-[2px]" style={{ background: C[p] }} aria-hidden />
            {i + 1} · {PHASE_LABEL[p]}
          </span>
          <p className="m-0 text-[15px] leading-normal text-text-prose">{LOOP[p]}</p>
        </div>
      ))}
    </div>
  )
}

function Hero() {
  return (
    <div className="flex max-w-[880px] flex-col gap-6">
      <span className="font-mono text-xs leading-none font-medium tracking-[0.08em] text-text-label uppercase">
        A guide to how React works, for people who already use it
      </span>
      <h1 className="display">Render, Commit, Repeat</h1>
      <p className="lede max-w-[690px]">
        You already write useState, map over lists with keys, and reach for useEffect. We'll slow React down until you can see what it does with each of
        those: which functions run, what gets compared, and which DOM nodes actually change.
      </p>
      <div className="flex flex-wrap gap-2.5">
        <a href="#ch1-bench" className="btn-primary">
          Follow one click
        </a>
        <Link to="/playground" className="btn-secondary">
          Open the Playground
        </Link>
      </div>
    </div>
  )
}

/** Code-pane meta: `waiting`, the phase, `done`, or `render · loop` in red. */
function phaseMeta(status: SimStatus, step: Step): { label: string; color: string } {
  if (status === 'idle') return { label: 'waiting', color: C.label }
  if (status === 'error') return { label: 'render · loop', color: C.error }
  if (status === 'complete') return { label: 'done', color: C.secondary }
  const p = step.phase === 'paint' ? 'commit' : step.phase
  return { label: step.phase, color: C[p] }
}

const opsLabel = (n: number) => `${n} DOM op${n === 1 ? '' : 's'}`

/**
 * Hero + chapter 1 · One click, slowed down. The Counter trace drives every pane; the loop
 * indicator follows the current step's phase.
 */
export function Chapter1() {
  const [variant, setVariant] = useState<Ch1Params['variant']>('ok')
  const sim = useSimulation(ch1Counter, { variant })
  const { step, steps, status } = sim
  const final = steps[steps.length - 1]
  const meta = phaseMeta(status, step)
  const lit = step.loopPhases ?? (isPhase(step.phase) ? [step.phase] : [])
  useReportHeroPhases(lit)

  const onPreviewClick = () => {
    if (status === 'idle' || status === 'complete') sim.play()
  }

  return (
    <ChapterSection n={1} hero>
      <Hero />
      <LoopStrip />

      <div className="flex flex-col gap-8 pt-6">
        <ChapterHeader n={1} title={info.title} eyebrow={info.eyebrow} />
        <WhyWhatHow
          why="You've written this counter a hundred times. It works, so you've never had to ask what happens between the click and the new number. That gap is where most React bugs and performance questions live."
          what={
            <>
              One click goes through the four phases above. A <b className="term">component tree</b> is how React sees your app: each component, and each HTML
              tag it returns, is a node with a parent and children.
            </>
          }
          how="Press step. Each press moves one step forward. The highlighted line, the tree and the log always show the same moment, in the same phase color."
        />

        <Workbench
          id="ch1-bench"
          code={{
            title: 'Code · Counter.jsx',
            meta: meta.label,
            metaColor: meta.color,
            body: (
              <CodePane
                code={step.code ?? CH1_CODE}
                activeLine={step.activeLine}
                errorLine={step.errorLine}
                phase={step.phase}
                notes={step.notes}
                label="Counter.jsx"
              />
            ),
          }}
          tree={{
            title: 'Component tree',
            meta: step.treeNote,
            body: <ComponentTree nodes={step.tree} colWidth={96} />,
            footer: <TreeLegend />,
          }}
          preview={{
            title: 'Live preview',
            meta: opsLabel(step.domOps.length),
            body: (
              <LivePreview error={step.preview.error}>
                <PreviewButton onClick={onPreviewClick} aria-label="+1 (starts the simulation)">
                  +1
                </PreviewButton>
                <span className="text-[19px] font-medium">
                  Count: <PreviewValue highlight={step.preview.highlight?.includes('count')}>{String(step.preview.values.count)}</PreviewValue>
                </span>
              </LivePreview>
            ),
            footer: <DomLog header entries={final.log} current={step.log.length} />,
          }}
          controls={
            <div className="flex flex-col gap-3">
              <Toggle
                checked={variant === 'error'}
                onChange={(on) => setVariant(on ? 'error' : 'ok')}
                label="onClick={setCount(count + 1)}"
                description="Forget the arrow function and see what breaks"
                className="self-start"
              />
              <SimControls {...simControlProps(sim)} />
            </div>
          }
          after={
            <Panel title="From event to pixel · one frame" meta="≈16.7 ms at 60 Hz · not to scale">
              <FrameTimeline blocks={step.timeline?.blocks ?? []} playhead={step.timeline?.playhead ?? 0} label="One frame: event, render, diff, commit, idle, paint" />
            </Panel>
          }
        />
      </div>
    </ChapterSection>
  )
}
