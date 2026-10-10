import { CHAPTERS } from '../../app/chapters'
import { ChapterHeader } from '../../components/ChapterHeader'
import { CodePane } from '../../components/code/CodePane'
import { SimControls } from '../../components/SimControls'
import { WhyWhatHow } from '../../components/WhyWhatHow'
import { simControlProps } from '../../sim/playback'
import {
  batchingRenders,
  CH8_BLOCK_CODE,
  CH8_DEFER_CODE,
  CH8_TRANS_CODE,
  ch8Concurrent,
  laneInterrupt,
  type Ch8Params,
} from '../../sim/scenarios/ch8-concurrent'
import { useSimulation } from '../../sim/useSimulation'
import { ChapterSection } from './ChapterSection'
import { BatchingCard, LaneCard, SuspenseCard } from './ch8/Cards'
import { RealListDemo } from './ch8/RealListDemo'
import { TrackLegend } from './ch8/Track'
import { TypingCard } from './ch8/TypingCard'

const info = CHAPTERS[7]
const PARAMS: Ch8Params = {}

/** The cards don't change with the step; compute them once from the model. */
const LANES = laneInterrupt()
const BATCH = { legacy: batchingRenders(17), modern: batchingRenders(18) }

/**
 * Chapter 8 · Concurrent rendering. One trace types "react" into a blocking input and a
 * useTransition input side by side; the cards cover lanes, Suspense and batching.
 */
export function Chapter8() {
  const sim = useSimulation(ch8Concurrent, PARAMS)
  const d = sim.step.data!

  return (
    <ChapterSection n={8}>
      <ChapterHeader n={info.n} title={info.title} phases={info.phases} />
      <WhyWhatHow
        why="Rendering a big list can take longer than one frame. While React works, the browser can't respond, so typing feels broken even though nothing is technically wrong."
        what={
          <>
            Since React 18 you can mark an update as a <b className="term">transition</b>: not urgent. React renders it in small chunks, checks for urgent work
            between chunks, and can throw a half-finished render away to handle a keystroke first. Nothing is committed until a render finishes, so you never see
            half an update.
          </>
        }
        how={'We typed "react" into both inputs. Under each, the main thread track shows what ran, and the frame strip shows which frames the browser had to drop.'}
      />

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(440px,1fr))] gap-3">
          <TypingCard
            title="Blocking · plain setState"
            mode="blocking"
            side={d.blocking}
            typed={d.typed}
            playhead={d.t}
            code={<CodePane code={CH8_BLOCK_CODE} activeLine={3} errorLine={3} size="sm" label="Blocking onChange" />}
          />
          <TypingCard
            title="useTransition"
            mode="transition"
            side={d.transition}
            typed={d.typed}
            playhead={d.t}
            code={
              <>
                <CodePane code={CH8_TRANS_CODE} activeLine={6} phase="render" size="sm" label="useTransition onChange" />
                <div className="border-t border-divider bg-panel px-3.5 pt-2.5 font-mono text-[10.5px] leading-none font-medium tracking-[0.06em] text-text-label uppercase">
                  Or, when you only receive the value · useDeferredValue
                </div>
                <CodePane code={CH8_DEFER_CODE} activeLine={1} phase="render" size="sm" label="useDeferredValue" />
              </>
            }
          />
        </div>
        <TrackLegend />
        <SimControls {...simControlProps(sim)} />

        <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] gap-3">
          <LaneCard data={LANES} />
          <SuspenseCard />
          <BatchingCard legacy={BATCH.legacy} modern={BATCH.modern} />
        </div>

        <RealListDemo />
      </div>
    </ChapterSection>
  )
}
