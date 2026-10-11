import { useState } from 'react'
import { CHAPTERS } from '../../app/chapters'
import { ChapterHeader } from '../../components/ChapterHeader'
import { CodePane } from '../../components/code/CodePane'
import { Panel } from '../../components/Panel'
import { SimControls } from '../../components/SimControls'
import { Segmented } from '../../components/ui/Segmented'
import { WhyWhatHow } from '../../components/WhyWhatHow'
import { C } from '../../sim/colors'
import { simControlProps } from '../../sim/playback'
import {
  ch7Code,
  ch7Effects,
  DEPS_OPTIONS,
  effectMatrix,
  parseDeps,
  sameDeps,
  UPDATE_OPTIONS,
  type Deps,
  type UpdateKind,
} from '../../sim/scenarios/ch7-effects'
import { useSimulation } from '../../sim/useSimulation'
import { ChapterSection } from './ChapterSection'
import { EffectMatrix } from './ch7/EffectMatrix'
import { EffectTimeline } from './ch7/EffectTimeline'

const info = CHAPTERS[6]

/** Every combination, from the fiber model (the rows and columns never change). */
const MATRIX = effectMatrix()

const LAST_STEP = 5

/**
 * Chapter 7 · Commit and effects. The pickers, the matrix and the editable deps in the code
 * all drive one trace; it updates live and opens on its last step so the whole timeline shows.
 */
export function Chapter7() {
  const [deps, setDeps] = useState<Deps>(['count'])
  const [upd, setUpd] = useState<UpdateKind>('count')
  /** What the reader typed into the editable deps, until a picker replaces it. */
  const [typed, setTyped] = useState<string | null>(null)
  const sim = useSimulation(ch7Effects, { deps, upd }, { live: true, initialIndex: LAST_STEP })
  const { step } = sim
  const d = step.data!
  const invalid = typed !== null && parseDeps(typed) === undefined
  const preset = DEPS_OPTIONS.find((o) => sameDeps(o.deps, deps))

  const select = (nextDeps: Deps, nextUpd?: UpdateKind) => {
    setDeps(nextDeps)
    if (nextUpd) setUpd(nextUpd)
    setTyped(null)
  }
  const onType = (_: number, value: string) => {
    setTyped(value)
    const parsed = parseDeps(value)
    if (parsed !== undefined) setDeps(parsed)
  }

  return (
    <ChapterSection n={7}>
      <ChapterHeader n={info.n} title={info.title} phases={info.phases} />
      <WhyWhatHow
        why={'"It flickers", "it runs twice", "it uses an old value": most effect bugs happen because the effect runs at a different time than you expected.'}
        what={
          <>
            After render, React <b className="term">commits</b>: it makes all the DOM changes at once. <b className="term">Layout effects</b>{' '}
            (useLayoutEffect) run next, before the browser draws the screen, so you can measure things and fix them without a flicker.{' '}
            <b className="term">Passive effects</b> (useEffect) run after the screen is drawn. The dependency array decides if an effect runs: React compares
            each value with the one from last render, using Object.is.
          </>
        }
        how="Pick a dependency array and an update. The timeline shows what runs, from left to right. The table shows every choice at once."
      />

      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 rounded-panel border border-border bg-panel px-3.5 py-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-xs leading-none font-medium text-text-label">Dependency array</span>
            <Segmented
              label="Dependency array"
              editable
              options={DEPS_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
              value={preset?.id ?? 'custom'}
              onChange={(id) => select(DEPS_OPTIONS.find((o) => o.id === id)!.deps)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-xs leading-none font-medium text-text-label">Update</span>
            <Segmented label="Update" options={UPDATE_OPTIONS} value={upd} onChange={setUpd} className="[&_button]:font-sans" />
          </div>
        </div>

        <EffectTimeline blocks={d.blocks} />

        <div className="grid grid-cols-[repeat(auto-fit,minmax(380px,1fr))] gap-5">
          <Panel
            title="Code · Profile.jsx"
            meta={invalid ? 'use count, user or no array' : 'editable deps'}
            metaColor={invalid ? C.error : C.trigger}
          >
            <CodePane
              code={step.code && typed === null ? step.code : ch7Code(deps, typed ?? undefined)}
              activeLine={step.activeLine}
              phase={step.phase}
              size="sm"
              label="Profile.jsx"
              onParamChange={onType}
            />
          </Panel>
          <EffectMatrix matrix={MATRIX} deps={deps} upd={upd} onSelect={select} />
        </div>

        <SimControls {...simControlProps(sim)} />
      </div>
    </ChapterSection>
  )
}
