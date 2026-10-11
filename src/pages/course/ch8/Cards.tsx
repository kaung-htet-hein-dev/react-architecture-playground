import { Suspense, use, useState, type ReactNode } from 'react'
import { CodePane } from '../../../components/code/CodePane'
import { alpha, C } from '../../../sim/colors'
import { CH8_BATCH_CODE, CH8_SUSPENSE_CODE, type LaneCard as LaneCardData } from '../../../sim/scenarios/ch8-concurrent'
import { Track } from './Track'

function Card({ title, children, body }: { title: string; children: ReactNode; body: ReactNode }) {
  return (
    <div className="panel flex flex-col">
      <div className="flex flex-col gap-1.5 px-4 pt-4 pb-3">
        <span className="text-base font-semibold text-text-heading">{title}</span>
        <p className="m-0 text-sm leading-[1.55] text-text-prose">{body}</p>
      </div>
      {children}
    </div>
  )
}

const laneLabel = 'font-mono text-xs leading-none font-medium'

/** "An urgent update interrupts": SyncLane vs TransitionLane, from the model. */
export function LaneCard({ data }: { data: LaneCardData }) {
  return (
    <Card
      title="An urgent update interrupts"
      body={
        <>
          React gives each update a <b className="term">lane</b>, which is its priority. A key press gets a faster lane than a transition, so it goes first.
        </>
      }
    >
      <div className="flex flex-col gap-2.5 px-4 pt-2 pb-[18px]">
        <span className={laneLabel} style={{ color: C.trigger }}>
          SyncLane · input
        </span>
        <Track blocks={data.sync} span={100} label="SyncLane: one keystroke and its urgent render" />
        <span className={laneLabel} style={{ color: C.render }}>
          TransitionLane · list
        </span>
        <Track
          blocks={data.lane}
          span={100}
          label={`TransitionLane: ${data.thrownAway} chunks thrown away, then ${data.restarted} chunks and a commit`}
        />
        <span className="font-mono text-xs text-text-label">chunk {data.thrownAway} is thrown away, then the list restarts</span>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ Suspense (real) */

interface Comment {
  id: number
  text: string
}

/** A pretend fetch: resolves after a delay, no network. */
function loadComments(ms: number): Promise<Comment[]> {
  return new Promise((resolve) =>
    setTimeout(
      () =>
        resolve([
          { id: 1, text: 'Which step saved the most time?' },
          { id: 2, text: 'We moved our cache too. Same result.' },
        ]),
      ms,
    ),
  )
}

function Comments({ commentsPromise }: { commentsPromise: Promise<Comment[]> }) {
  const comments = use(commentsPromise)
  return (
    <ul className="m-0 mt-1 flex list-none flex-col gap-1.5 p-0 text-[12.5px] leading-normal" style={{ color: C.previewSub }}>
      {comments.map((c) => (
        <li key={c.id} className="rounded-control px-2.5 py-1.5" style={{ background: C.previewChrome }}>
          {c.text}
        </li>
      ))}
    </ul>
  )
}

function CommentsSkeleton() {
  return (
    <div className="mt-1 flex flex-col gap-1.5 rounded-control p-2.5" style={{ border: `1.5px dashed ${C.previewDash}` }} role="status" aria-label="Loading comments">
      <span className="font-mono text-xs font-medium" style={{ color: C.previewLabel }}>
        fallback · loading comments
      </span>
      <span className="h-2 w-4/5 rounded" style={{ background: C.previewSkeleton }} />
      <span className="h-2 w-[62%] rounded" style={{ background: C.previewSkeleton }} />
    </div>
  )
}

/**
 * "Suspense shows a fallback". This one is real React: Comments reads a promise with use(), so
 * it suspends and the nearest Suspense shows CommentsSkeleton until the promise resolves.
 */
export function SuspenseCard() {
  const [commentsPromise, setCommentsPromise] = useState(() => loadComments(2400))
  return (
    <Card
      title="Suspense shows a fallback"
      body={
        <>
          <b className="term">Suspense</b> wraps part of the page. While something inside it waits for data or code, React shows a fallback (like a loading
          box) in that spot and keeps the rest of the page working.
        </>
      }
    >
      <div className="mx-4 flex flex-col gap-2 rounded-button bg-preview p-3.5 text-preview-ink">
        <span className="text-[15px] font-semibold">How we cut build times in half</span>
        <span className="text-[12.5px] leading-normal" style={{ color: C.previewSub }}>
          Last quarter our CI took 14 minutes. Here's what changed.
        </span>
        <Suspense fallback={<CommentsSkeleton />}>
          <Comments commentsPromise={commentsPromise} />
        </Suspense>
      </div>
      <div className="flex justify-end px-4 pt-2">
        <button type="button" className="btn-control h-7 text-xs" onClick={() => setCommentsPromise(loadComments(2400))}>
          Load comments again
        </button>
      </div>
      <div className="mt-auto border-t border-divider bg-raised pt-3">
        <CodePane code={CH8_SUSPENSE_CODE} activeLine={2} phase="render" size="sm" label="Suspense" />
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ batching */

/** "Automatic batching": renders for three setState calls in a timeout, from the model. */
export function BatchingCard({ legacy, modern }: { legacy: number; modern: number }) {
  const bar = { background: alpha(C.render, 22), border: `1px solid ${alpha(C.render, 70)}` }
  return (
    <Card
      title="Automatic batching"
      body={
        <>
          <b className="term">Batching</b> means several setState calls lead to just one render. Since React 18 this happens everywhere, even inside setTimeout
          and promises.
        </>
      }
    >
      <div className="flex flex-col gap-2.5 px-4 pt-1 pb-4">
        <div className="grid grid-cols-[96px_1fr] items-center gap-2.5">
          <span className="font-mono text-[11.5px] font-medium text-text-label">React 17</span>
          <div className="flex gap-1" role="img" aria-label={`${legacy} renders`}>
            {Array.from({ length: legacy }, (_, i) => (
              <span key={i} className="h-[22px] flex-1 rounded-tag" style={bar} />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-[96px_1fr] items-center gap-2.5">
          <span className="font-mono text-[11.5px] font-medium text-text-strong">React 18+</span>
          <div className="flex gap-1">
            {Array.from({ length: modern }, (_, i) => (
              <span
                key={i}
                className="flex h-[22px] items-center rounded-tag px-2 font-mono text-[10.5px] font-semibold"
                style={{ width: `${(100 / legacy) * modern}%`, background: C.render, color: C.onPhase }}
              >
                {modern} render{modern === 1 ? '' : 's'}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-auto border-t border-divider bg-raised">
        <CodePane code={CH8_BATCH_CODE} phase="render" size="sm" label="Batching" />
      </div>
    </Card>
  )
}
