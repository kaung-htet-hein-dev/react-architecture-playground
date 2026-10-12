import { useState } from 'react'
import { Link } from 'react-router'
import { CHAPTERS } from '../../app/chapters'
import { ChapterHeader } from '../../components/ChapterHeader'
import { CodePane } from '../../components/code/CodePane'
import { DomLog } from '../../components/DomLog'
import { FrameTimeline } from '../../components/FrameTimeline'
import { LivePreview, PreviewButton, PreviewValue } from '../../components/LivePreview'
import { GoDeeper } from '../../components/GoDeeper'
import { Panel } from '../../components/Panel'
import { SimControls } from '../../components/SimControls'
import { ComponentTree, TreeLegend } from '../../components/tree/ComponentTree'
import { Takeaway } from '../../components/Takeaway'
import { Toggle } from '../../components/ui/Toggle'
import { Workbench } from '../../components/Workbench'
import { WhyWhatHow } from '../../components/WhyWhatHow'
import { C, PHASE_LABEL } from '../../sim/colors'
import { simControlProps } from '../../sim/playback'
import { CH1_CODE, ch1Counter, type Ch1Params } from '../../sim/scenarios/ch1-counter'
import { PHASES, type Phase, type SimStatus, type Step } from '../../sim/types'
import { useSimulation } from '../../sim/useSimulation'
import { ChapterSection } from './ChapterSection'

const info = CHAPTERS[0]

/** The four loop cards under the hero: one definition per phase. */
const LOOP: Record<Phase, string> = {
  trigger: 'Something calls setState: a click, a timer, or data coming back from a server.',
  render: 'React calls your component functions. They return a new description of the UI.',
  reconcile: 'React compares the new description with the old one and finds what changed.',
  commit: 'React changes only those parts of the page, runs your effects, and the browser draws the result.',
}

function LoopStrip() {
  return (
    <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 p-0">
      {PHASES.map((p, i) => (
        <li key={p} className="flex flex-col gap-2 rounded-panel border border-border bg-raised p-5">
          <span className="font-mono text-xs leading-none text-text-faint">{String(i + 1).padStart(2, '0')}</span>
          <span className="flex items-center gap-2 text-[15px] leading-snug font-semibold" style={{ color: C[p] }}>
            <span className="size-2.5 rounded-[2px]" style={{ background: C[p] }} aria-hidden />
            {PHASE_LABEL[p]}
          </span>
          <p className="m-0 text-sm leading-[1.55] text-text-secondary">{LOOP[p]}</p>
        </li>
      ))}
    </ol>
  )
}

/**
 * Full-height intro band above chapter 1 (reactnative.dev course hero): eyebrow, title, lede,
 * the four loop cards, then the two calls to action.
 */
function Hero() {
  return (
    <section
      id="intro"
      aria-label="Introduction"
      className="flex min-h-[calc(100dvh-var(--spacing-topbar))] scroll-mt-topbar flex-col justify-center border-b border-divider px-12 py-16 max-lg:px-10 max-md:min-h-0 max-md:px-4 max-md:py-14"
    >
      <div className="mx-auto flex w-full max-w-content flex-col gap-12 max-md:gap-10">
        <div className="flex max-w-[860px] flex-col gap-5">
          <span className="eyebrow">A guide to how React works, for people who already use it</span>
          <h1 className="display">React Internal</h1>
          <p className="lede max-w-[760px]">
            You already use useState, keys and useEffect. Here we slow React down so you can watch what happens after a click, one step at a time.
          </p>
          <p className="prose-body max-w-[760px]">
            Every update goes through the same four steps below. Each chapter zooms into one of them. Chapters follow the same shape:{' '}
            <b className="term">the problem</b>, <b className="term">the idea</b>, a demo to <b className="term">try</b>, and one sentence to{' '}
            <b className="term">remember</b>. Extras sit in a closed "Go deeper" box you can skip.
          </p>
        </div>
        <LoopStrip />
        <div className="flex flex-wrap items-center gap-3">
          <a href="#ch1-bench" className="btn-primary">
            Follow one click
          </a>
          <Link to="/playground" className="btn-secondary">
            Open the Playground
          </Link>
        </div>
      </div>
    </section>
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

  const onPreviewClick = () => {
    if (status === 'idle' || status === 'complete') sim.play()
  }

  return (
    <>
      <Hero />
      <ChapterSection n={1}>
        <div className="flex flex-col gap-12">
          <ChapterHeader n={1} title={info.title} eyebrow={info.eyebrow} />
          <WhyWhatHow
            why="You have written this counter many times. But what happens between the click and the new number? Most React bugs live in that gap."
            what={
              <>
                One click goes through four steps: trigger, render, reconcile, commit. React sees your app as a <b className="term">component tree</b>: each
                component, and each HTML tag it returns, is one box.
              </>
            }
            how="Use the step-forward button under the demo. The code, the tree and the page all show the same moment, in the same color. Then flip the switch to see a classic bug."
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
              <div className="flex flex-col gap-4">
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
              <GoDeeper hint="How the four steps fit into one screen frame">
                <Panel title="From event to pixel · one frame" meta="≈16.7 ms at 60 Hz · not to scale">
                  <FrameTimeline
                    blocks={step.timeline?.blocks ?? []}
                    playhead={step.timeline?.playhead ?? 0}
                    label="One frame: event, render, compare, commit, idle, paint"
                  />
                </Panel>
              </GoDeeper>
            }
          />
          <Takeaway n={1} />
        </div>
      </ChapterSection>
    </>
  )
}
