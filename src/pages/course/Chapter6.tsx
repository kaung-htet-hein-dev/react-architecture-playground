import { CHAPTERS } from '../../app/chapters'
import { ChapterHeader } from '../../components/ChapterHeader'
import { CodePane } from '../../components/code/CodePane'
import { Panel } from '../../components/Panel'
import { SimControls } from '../../components/SimControls'
import { Takeaway } from '../../components/Takeaway'
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
        n={6}
        why={'useState has no name or ID, yet it always gives back the right value. How? The answer explains the rule "don\'t call hooks inside an if".'}
        what={
          <>
            React keeps a <b className="term">fiber</b> (its own small object for one component on the page). Inside it is a numbered list of{' '}
            <b className="term">hook slots</b> (one storage place per hook call). React never sees your variable names. It only counts calls.
          </>
        }
        analogy={{
          body: 'Think of gym lockers handed out in the order people walk in. If everyone always arrives in the same order, each person gets their own locker every day. If one person skips a day, everyone behind them opens someone else\'s locker.',
          breaks: 'React notices some of these mix-ups, like a hook of the wrong kind in a slot, and warns you. A gym would not.',
        }}
        steps={[
          'React calls Profile.',
          'The first hook call reads slot 1, the second reads slot 2, and so on.',
          'On the next render, React counts again from slot 1.',
          'If an if skips one hook call, every hook after it reads the slot that belonged to the hook before it in line.',
        ]}
        ask={{
          q: 'Why not give each hook a name, like useState(\'count\')?',
          a: 'Names can clash. A custom hook could call useState twice, or two custom hooks could pick the same name. Call order needs no names, so any hook can call any other hook safely. The price is the rule: same hooks, same order, every render.',
        }}
        how="Step through two renders. In render 2, the useEffect inside the if is skipped, so every hook after it grabs the wrong slot."
      />

      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(380px,1fr))] gap-5">
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
              <span className="font-mono text-xs leading-none font-medium" style={{ color: C.commit }}>
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
      <Takeaway n={6} />
    </ChapterSection>
  )
}
