import { useState } from 'react'
import { CHAPTERS } from '../../app/chapters'
import { ChapterHeader } from '../../components/ChapterHeader'
import { CodePane } from '../../components/code/CodePane'
import { Panel } from '../../components/Panel'
import { SimControls } from '../../components/SimControls'
import { ComponentTree } from '../../components/tree/ComponentTree'
import { Tag } from '../../components/ui/Tag'
import { Toggle } from '../../components/ui/Toggle'
import { Takeaway } from '../../components/Takeaway'
import { WhyWhatHow } from '../../components/WhyWhatHow'
import { simControlProps } from '../../sim/playback'
import { CH4_DEFAULTS, CH4_NODES, ch4Code, ch4Rerender, type Ch4NodeId, type Ch4Params } from '../../sim/scenarios/ch4-rerender'
import { useSimulation } from '../../sim/useSimulation'
import { ChapterSection } from './ChapterSection'

const info = CHAPTERS[3]

const isNode = (id: string): id is Ch4NodeId => (CH4_NODES as readonly string[]).includes(id)

/**
 * Chapter 4 · Why a component re-renders. Click a node to call setState there; the toggles change
 * the app. The fiber model decides who renders, and everything updates live (R-S5): the trace
 * keeps its step when params change, and it opens on the finished wave.
 */
export function Chapter4() {
  const [params, setParams] = useState<Ch4Params>(CH4_DEFAULTS)
  const sim = useSimulation(ch4Rerender, params, { live: true, initialIndex: 4 })
  const { step } = sim
  const why = step.data?.why ?? []
  const set = (patch: Partial<Ch4Params>) => setParams((p) => ({ ...p, ...patch }))

  return (
    <ChapterSection n={4}>
      <ChapterHeader n={info.n} title={info.title} phases={info.phases} />
      <WhyWhatHow
        why={'"Why did this re-render?" is the most common React speed question. The answer is almost always one of three rules.'}
        what={
          <>
            A component re-renders when <b className="term">1.</b> its own state changes, <b className="term">2.</b> its parent re-renders, or{' '}
            <b className="term">3.</b> a <b className="term">context</b> it reads changes. Wrapping it in <b className="term">memo</b> skips rule 2, but only
            if every prop is the same as last time. A new object, like <code>{'{ gap: 8 }'}</code>, is never "the same", even if it looks equal.
          </>
        }
        how="Click any box to call setState there. Renders flow down the tree, never up. Then turn on the switches one at a time and click again."
      />
      <div className="flex flex-col gap-5">
        <Panel title="Component tree · click a node to set state there" meta={step.treeNote}>
          <div className="flex flex-wrap gap-2 border-b border-divider px-3.5 py-3">
            <Toggle checked={params.memo} onChange={(memo) => set({ memo })} label="memo(Sidebar)" description="Skip Sidebar when its props are the same" />
            <Toggle checked={params.newObj} onChange={(newObj) => set({ newObj })} label="New object prop" description="Pass style={{ gap: 8 }} to Sidebar" />
            <Toggle checked={params.ctx} onChange={(ctx) => set({ ctx })} label="Avatar reads context" description="useContext(ThemeContext)" />
          </div>
          <div className="px-3 pt-[26px] pb-[18px]">
            <ComponentTree
              nodes={step.tree}
              colWidth={100}
              onNodeClick={(id) => isNode(id) && set({ trigger: id })}
              label="Component tree: click a node to call setState there"
            />
          </div>
        </Panel>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(380px,1fr))] gap-5">
          <Panel title="Code · Main.jsx" meta="updates live with toggles">
            <CodePane code={step.code ?? ch4Code(params)} activeLine={step.activeLine} phase="render" dimLines={step.dimLines} size="sm" label="Main.jsx" />
          </Panel>
          <Panel title="Why each one rendered" meta="render order">
            {why.length === 0 ? (
              <p className="m-0 px-3.5 pt-2.5 pb-4 text-[13.5px] leading-normal text-text-label">
                Nothing has rendered yet. Step forward to see each component that renders, and why.
              </p>
            ) : (
              <ol className="m-0 list-none p-0" aria-label="Why each one rendered">
                {why.map((w) => (
                  <li key={w.id} className="grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 border-b border-row-divider px-3.5 py-[9px]">
                    <span className="font-mono text-xs font-medium text-text-strong">{w.label}</span>
                    <span className="text-[13.5px] leading-[1.4] text-text-prose">{w.why}</span>
                    {w.state === 'rendered' ? (
                      <Tag tone="render" className="">
                        rendered
                      </Tag>
                    ) : (
                      <Tag tone="muted" variant="dashed" className="">
                        skipped
                      </Tag>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
        <SimControls {...simControlProps(sim)} />
      </div>
      <Takeaway n={4} />
    </ChapterSection>
  )
}
