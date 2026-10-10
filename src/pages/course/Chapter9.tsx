import { CHAPTERS } from '../../app/chapters'
import { ChapterHeader } from '../../components/ChapterHeader'
import { WhyWhatHow } from '../../components/WhyWhatHow'
import { CH9_CODE } from '../../content/codeSamples'
import { BeforeNowCard } from './ch9/BeforeNowCard'
import { ServerComponentsCard } from './ch9/ServerComponentsCard'
import { ChapterSection } from './ChapterSection'

const info = CHAPTERS[8]

/**
 * Chapter 9 · Modern React. Four Before/Now cards and a wide Server Components card; each card's
 * version label is editable and saved to localStorage.
 */
export function Chapter9() {
  return (
    <ChapterSection n={9}>
      <ChapterHeader n={info.n} title={info.title} eyebrow={info.eyebrow} />
      <WhyWhatHow
        why="A lot of the React you've learned is code you wrote around React: pending flags, rollback logic, fetch-in-effect, memo everywhere. Recent versions absorb much of it."
        what="Each card shows one pattern the old way and the new way. The loop underneath is the same: the new APIs just let React handle the triggering, waiting and memoizing for you."
        how="Read the before, then the after, and look for what disappeared. The version label on each card is editable, so you can keep it accurate as React moves."
      />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(460px,100%),1fr))] gap-3">
        <BeforeNowCard title="Actions and form state" versionId="actions" before={CH9_CODE.actionsBefore} now={CH9_CODE.actionsNow} nowActive={1} nowPhase="commit">
          An <b className="term">Action</b> is an async function you hand to a form or a transition. useActionState tracks its pending state and result, so you
          stop writing those flags yourself.
        </BeforeNowCard>
        <BeforeNowCard
          title="Optimistic updates"
          versionId="optimistic"
          before={CH9_CODE.optimisticBefore}
          now={CH9_CODE.optimisticNow}
          nowActive={5}
          nowPhase="commit"
        >
          useOptimistic shows the expected result while the request is in flight. When the Action finishes, React drops the optimistic value and shows the
          real state, so a failure rolls back on its own.
        </BeforeNowCard>
        <BeforeNowCard title="The use API" versionId="use" before={CH9_CODE.useBefore} now={CH9_CODE.useNow} nowActive={3} nowPhase="render">
          use reads a promise or a context during render. If the promise isn't ready, the component suspends and the nearest Suspense shows its fallback.
          Unlike hooks, use can be called inside if statements and loops.
        </BeforeNowCard>
        <BeforeNowCard
          title="The React Compiler"
          versionId="compiler"
          beforeLabel="Before · the memo code you no longer write"
          before={CH9_CODE.compilerBefore}
          now={CH9_CODE.compilerNow}
        >
          The compiler adds memoization at build time, so components skip work that memo, useMemo and useCallback used to skip. You write the plain version;
          chapter 4 still explains what it's doing for you.
        </BeforeNowCard>
      </div>

      <ServerComponentsCard />
    </ChapterSection>
  )
}
