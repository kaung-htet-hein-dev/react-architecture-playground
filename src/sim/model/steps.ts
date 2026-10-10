import type { DomOp, LogEntry, Step } from '../types'

/** Fields that carry over from the previous step unless a step sets them. */
const CARRY = ['code', 'tree', 'wipTree', 'rootCurrent', 'queue', 'hooks', 'effects', 'console', 'preview', 'timeline', 'treeNote', 'data'] as const

export type StepInput<D> = Omit<Partial<Step<D>>, 'log' | 'domOps'> &
  Pick<Step<D>, 'phase' | 'caption'> & {
    /** Rows appended to the cumulative log. */
    log?: LogEntry | readonly LogEntry[]
    /** DOM ops appended to the cumulative list. */
    domOps?: readonly DomOp[]
  }

/**
 * Builds a trace of full snapshots. `log` and `domOps` accumulate; code, tree, preview, queue,
 * hooks, effects, console, timeline, treeNote and data carry over from the previous step until
 * a step sets them. activeLine, errorLine, notes, dimLines, loopPhases and status never carry.
 *
 * ```ts
 * const b = stepBuilder<null>({ phase: 'trigger', activeLine: 0, caption: 'Nothing yet.', tree, preview })
 * b.step({ phase: 'render', activeLine: 2, caption: 'React calls Counter.', log: { text: 'call Counter()', tone: 'render' } })
 * return b.build()
 * ```
 */
export function stepBuilder<D = unknown>(idle: StepInput<D> & Pick<Step<D>, 'tree' | 'preview'>) {
  const steps: Step<D>[] = []
  let log: LogEntry[] = []
  let domOps: DomOp[] = []

  const push = (input: StepInput<D>) => {
    const prev = steps[steps.length - 1]
    const { log: rows, domOps: ops, ...rest } = input
    if (rows) log = [...log, ...(Array.isArray(rows) ? rows : [rows as LogEntry])]
    if (ops) domOps = [...domOps, ...ops]
    const carried: Partial<Step<D>> = {}
    if (prev) for (const k of CARRY) if (prev[k] !== undefined) (carried as Record<string, unknown>)[k] = prev[k]
    const step = { activeLine: 0, ...carried, ...rest, log, domOps } as Step<D>
    steps.push(step)
    return step
  }

  push(idle)
  return {
    /** Append one step. */
    step: push,
    /** The last step pushed. */
    get last(): Step<D> {
      return steps[steps.length - 1]
    },
    get length() {
      return steps.length
    },
    build: (): Step<D>[] => steps,
  }
}
