import { CHAPTERS } from '../../app/chapters'
import { ChapterHeader } from '../../components/ChapterHeader'
import { GoDeeper } from '../../components/GoDeeper'
import { CodePane } from '../../components/code/CodePane'
import { SimControls } from '../../components/SimControls'
import { Takeaway } from '../../components/Takeaway'
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
        n={8}
        why="Rendering a big list can take longer than one frame (about 16 ms on a 60 Hz screen). While React is busy, the browser can't respond, so typing feels stuck."
        what={
          <>
            Wrap the slow update in <b className="term">startTransition</b> to make it a <b className="term">transition</b> (an update marked as not urgent).
            React renders a transition in small pieces and checks for urgent work between them. You never see half an update: only a finished render is
            committed.
          </>
        }
        analogy={{
          body: 'Think of a cook working on a big order who stops whenever someone asks for a glass of water. Water never waits. If the big order changes halfway, the cook starts it again with the new order instead of finishing the old one.',
          breaks: 'there is still only one cook. React does not render two things at the same time; it switches between them on one thread.',
        }}
        steps={[
          'You type a letter. Updating the input is urgent, so React does it first.',
          'The list update is a transition, so React starts rendering it in small pieces.',
          'You type another letter before the list is done.',
          'React drops the unfinished list render, updates the input, then renders the list again with the newest value.',
        ]}
        ask={{
          q: 'Does this make the list render faster?',
          a: 'No. The list takes as long as before. React only lets your key presses go first, so typing never waits for it.',
        }}
        how={'Press Play. Both inputs get "react" typed into them. Compare the tracks under each: the left one blocks the keys, the right one does not.'}
      />

      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(440px,1fr))] gap-5">
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
                <div className="border-t border-divider bg-panel px-3.5 pt-2.5 font-mono text-xs leading-none font-medium text-text-label">
                  Or, when you only receive the value · useDeferredValue
                </div>
                <CodePane code={CH8_DEFER_CODE} activeLine={1} phase="render" size="sm" label="useDeferredValue" />
              </>
            }
          />
        </div>
        <TrackLegend />
        <SimControls {...simControlProps(sim)} />

        <GoDeeper hint="Lanes, Suspense, batching, and a real slow list to type into">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] gap-5">
            <LaneCard data={LANES} />
            <SuspenseCard />
            <BatchingCard legacy={BATCH.legacy} modern={BATCH.modern} />
          </div>
          <RealListDemo />
        </GoDeeper>
      </div>
      <Takeaway n={8} />
    </ChapterSection>
  )
}
