import { FrameTimeline } from '../../components/FrameTimeline'
import { SimControls } from '../../components/SimControls'
import { C } from '../../sim/colors'
import { simControlProps } from '../../sim/playback'
import type { PgData } from '../../sim/scenarios/playground'
import type { ConsoleLine, SimulationApi } from '../../sim/types'

const consoleColor = (c: ConsoleLine) => (c.tone === 'info' ? C.label : C[c.tone])

/** Bottom bar: SimControls + mentor sentence, the six-frame timeline and the console. */
export function BottomBar({ sim }: { sim: SimulationApi<PgData> }) {
  const { step } = sim
  const lines = step.console ?? []
  const timeline = step.timeline ?? { playhead: 0, blocks: [] }
  return (
    <div className="flex flex-col gap-3 border-t border-divider bg-raised px-4 pt-3 pb-4">
      <SimControls {...simControlProps(sim)} />
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(300px,420px)] gap-3">
        <div className="overflow-hidden rounded-panel border border-border bg-panel">
          <div className="panel-header" style={{ height: 30, fontSize: 12, padding: '0 12px' }}>
            <span>Browser frames</span>
            <span>16.7 ms each</span>
          </div>
          <FrameTimeline variant="frames" blocks={timeline.blocks} playhead={timeline.playhead} label="Browser frames: six 16.7 ms frames with the work done in each" />
        </div>
        <div className="flex flex-col overflow-hidden rounded-panel border border-border bg-panel">
          <div className="panel-header" style={{ height: 30, fontSize: 12, padding: '0 12px' }}>
            <span>Console</span>
            <span>
              {lines.length} line{lines.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="flex h-[62px] flex-col-reverse overflow-auto py-1.5" role="log" aria-label="Console" tabIndex={0}>
            <div className="flex flex-col">
              {lines.map((c, i) => (
                <div key={i} className="flex gap-2.5 px-3 py-px font-mono text-[11.5px] leading-normal">
                  <span className="w-[76px] flex-none" style={{ color: consoleColor(c) }}>
                    {c.tag}
                  </span>
                  <span className="truncate whitespace-pre text-text-node" title={c.text}>
                    {c.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
