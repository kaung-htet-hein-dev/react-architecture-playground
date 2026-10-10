import { CHAPTERS } from '../../app/chapters'
import { ChapterHeader } from '../../components/ChapterHeader'
import { CodePane } from '../../components/code/CodePane'
import { Panel } from '../../components/Panel'
import { SimControls } from '../../components/SimControls'
import { WhyWhatHow } from '../../components/WhyWhatHow'
import { C } from '../../sim/colors'
import { simControlProps } from '../../sim/playback'
import { CH6_CODE, CH6_FIX, ch6Hooks } from '../../sim/scenarios/ch6-hooks'
import { useSimulation } from '../../sim/useSimulation'
import { ChapterSection } from './ChapterSection'
import { HookConsole } from './ch6/HookConsole'
import { FiberFields, HookSlotRow } from './ch6/HookSlots'

const info = CHAPTERS[5]
const PARAMS = {}

/** Chapter 6 · Fiber and hooks: two renders of Profile, hook calls matched to slots by position. */
export function Chapter6() {
  const sim = useSimulation(ch6Hooks, PARAMS)
  const { step } = sim
  const d = step.data!
  const second = d.render === 2
  const failed = step.status === 'error'

  return (
    <ChapterSection n={6}>
      <ChapterHeader n={info.n} title={info.title} phases={info.phases} />
      <WhyWhatHow
        why="useState has no name or ID, yet every render it hands back the right value. Knowing how it does that turns the rules of hooks from a list to memorize into something obvious."
        what={
          <>
            For every component instance React keeps a <b className="term">fiber</b>: an object holding its type, props, place in the tree and a list of{' '}
            <b className="term">hook slots</b>. Each hook call takes the next slot. React matches calls to slots purely by position: first call, first slot.
          </>
        }
        how="Step through two renders of Profile. In the first, isAdmin is true and three hooks run. In the second it's false, the useEffect inside the if is skipped, and the hook after it reads the wrong slot."
      />

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(380px,1fr))] gap-3">
          <Panel
            title="Code · Profile.jsx"
            meta={second ? 'render 2 · isAdmin = false' : 'render 1 · isAdmin = true'}
            metaColor={failed ? C.error : second ? C.secondary : C.render}
          >
            <CodePane
              code={step.code ?? CH6_CODE}
              activeLine={step.activeLine}
              errorLine={step.errorLine}
              phase={step.phase}
              notes={step.notes}
              dimLines={step.dimLines}
              label="Profile.jsx"
            />
            <div className="mt-auto flex flex-col gap-1 border-t border-divider px-3.5 pt-3 pb-1">
              <span className="font-mono text-[10.5px] leading-none font-medium tracking-[0.08em] uppercase" style={{ color: C.commit }}>
                The fix · put the condition inside the hook
              </span>
            </div>
            <div className="bg-raised">
              <CodePane code={CH6_FIX} size="sm" label="The fix" />
            </div>
          </Panel>

          <Panel title="Profile fiber" meta="hook slots by position">
            <FiberFields props={d.props} chain={d.chain} />
            <div className="flex flex-col gap-2.5 px-4 py-3.5">
              <HookSlotRow title="Render 1 · isAdmin = true" titleColor={C.label} reads={d.render1} />
              <div className="mt-2">
                <HookSlotRow title="Render 2 · isAdmin = false" titleColor={failed ? C.error : C.label} reads={d.render2} />
              </div>
            </div>
          </Panel>
        </div>

        <HookConsole lines={step.console ?? []} warning={d.warning} />
        <SimControls {...simControlProps(sim)} />
      </div>
    </ChapterSection>
  )
}
