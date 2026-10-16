import { CHAPTERS } from '../../app/chapters'
import { ChapterHeader } from '../../components/ChapterHeader'
import { GoDeeper } from '../../components/GoDeeper'
import { Takeaway } from '../../components/Takeaway'
import { WhyWhatHow } from '../../components/WhyWhatHow'
import { CH9_CODE } from '../../content/codeSamples'
import { BeforeNowCard } from './ch9/BeforeNowCard'
import { ServerComponentsCard } from './ch9/ServerComponentsCard'
import { ChapterSection } from './ChapterSection'

const info = CHAPTERS[8]

/**
 * Chapter 9 · Newer React features. Four Before/Now cards and a wide Server Components card; each card's
 * version label is editable and saved to localStorage.
 */
export function Chapter9() {
  return (
    <ChapterSection n={9}>
      <ChapterHeader n={info.n} title={info.title} eyebrow={info.eyebrow} />
      <WhyWhatHow
        n={9}
        why="Much of the React code you learned is extra work around React: loading flags, undo when a request fails, fetching in effects, memo everywhere."
        what="The loop from chapter 1 does not change. React 19 takes over more of the work around it, one feature per card below."
        ask={{
          q: 'Do I have to rewrite my old code?',
          a: 'No. The old way still works. These features are shorter ways to do the same jobs, so you can use them in new code first.',
        }}
        how="Each card shows the old way, then the new way. Look for the code that disappeared."
      />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(460px,100%),1fr))] gap-5">
        <BeforeNowCard title="Actions and form state" versionId="actions" before={CH9_CODE.actionsBefore} now={CH9_CODE.actionsNow} nowActive={1} nowPhase="commit">
          An <b className="term">Action</b> is an async function you give to a form or a transition. useActionState tracks if it is still running and what it
          returned, so you don't write those flags yourself.
        </BeforeNowCard>
        <BeforeNowCard
          title="Optimistic updates"
          versionId="optimistic"
          before={CH9_CODE.optimisticBefore}
          now={CH9_CODE.optimisticNow}
          nowActive={5}
          nowPhase="commit"
        >
          useOptimistic shows the result you expect while the request is still running. When the Action finishes, React removes that guess and shows the real
          state, so if the request fails, the screen goes back on its own.
        </BeforeNowCard>
        <BeforeNowCard title="The use API" versionId="use" before={CH9_CODE.useBefore} now={CH9_CODE.useNow} nowActive={3} nowPhase="render">
          use reads a promise or a context during render. If the promise isn't ready yet, the component waits and the nearest Suspense shows its fallback
          (like a spinner). Unlike hooks, use can be called inside if statements and loops.
        </BeforeNowCard>
        <BeforeNowCard
          title="The React Compiler"
          versionId="compiler"
          beforeLabel="Before · the memo code you no longer write"
          before={CH9_CODE.compilerBefore}
          now={CH9_CODE.compilerNow}
        >
          The compiler adds memoization (caching) when you build your app, so components skip the same work memo, useMemo and useCallback used to skip. You
          write the plain code; chapter 4 explains what the compiler does for you.
        </BeforeNowCard>
      </div>

      <GoDeeper hint="Server Components: rendering on the server">
        <ServerComponentsCard />
      </GoDeeper>
      <Takeaway n={9} />
    </ChapterSection>
  )
}
