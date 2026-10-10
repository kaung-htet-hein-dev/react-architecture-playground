import { alpha, C } from '../../../sim/colors'
import { DEPS_OPTIONS, sameDeps, UPDATE_OPTIONS, type Deps, type UpdateKind } from '../../../sim/scenarios/ch7-effects'

export interface EffectMatrixProps {
  /** matrix[row][col]: rows follow DEPS_OPTIONS, columns UPDATE_OPTIONS. */
  matrix: readonly (readonly boolean[])[]
  deps: Deps
  upd: UpdateKind
  onSelect: (deps: Deps, upd?: UpdateKind) => void
}

const GRID = 'grid grid-cols-[120px_repeat(3,minmax(0,1fr))] gap-1 px-3.5'

/** "Does the useEffect run?": runs/skips for every deps × update; click a cell to select it. */
export function EffectMatrix({ matrix, deps, upd, onSelect }: EffectMatrixProps) {
  return (
    <div className="panel flex flex-col">
      <div className="panel-header">
        <span>Does the useEffect run?</span>
        <span>click a cell</span>
      </div>
      <div role="table" aria-label="Does the useEffect run?" className="flex flex-col">
        <div role="row" className={`${GRID} pt-3 pb-1.5`}>
          <span role="columnheader" />
          {UPDATE_OPTIONS.map((u) => (
            <span key={u.value} role="columnheader" className="text-center font-mono text-[11px] font-medium" style={{ color: u.value === upd ? C.heading : C.label }}>
              {u.label}
            </span>
          ))}
        </div>
        {DEPS_OPTIONS.map((d, r) => {
          const rowOn = sameDeps(d.deps, deps)
          return (
            <div key={d.id} role="row" className={`${GRID} py-[3px]`} style={{ background: rowOn ? C.panelHi : 'transparent' }}>
              <span role="rowheader" className="flex">
                <button
                  type="button"
                  aria-pressed={rowOn}
                  onClick={() => onSelect(d.deps)}
                  className="w-full border-0 bg-transparent p-0 text-left font-mono text-[12.5px] font-medium"
                  style={{ color: rowOn ? C.heading : C.secondary }}
                >
                  {d.label}
                </button>
              </span>
              {UPDATE_OPTIONS.map((u, c) => {
                const on = matrix[r]?.[c] ?? false
                const sel = rowOn && u.value === upd
                return (
                  <span key={u.value} role="cell" className="flex">
                    <button
                      type="button"
                      aria-pressed={sel}
                      onClick={() => onSelect(d.deps, u.value)}
                      className="h-[34px] w-full rounded-control font-mono text-xs font-medium"
                      style={{
                        color: on ? C.commit : C.faint,
                        background: sel ? alpha(C.commit, 16) : 'transparent',
                        border: `1px solid ${sel ? alpha(C.commit, 70) : 'transparent'}`,
                      }}
                    >
                      {on ? 'runs' : 'skips'}
                      <span className="sr-only">{`: ${d.label}, ${u.label}`}</span>
                    </button>
                  </span>
                )
              })}
            </div>
          )
        })}
      </div>
      <p className="m-0 mt-auto border-t border-divider p-3.5 text-[13.5px] leading-[1.55] text-text-secondary">
        In development with StrictMode, React runs every mount effect twice (effect, cleanup, effect) to help you catch a missing cleanup. Production runs it once.
      </p>
    </div>
  )
}
