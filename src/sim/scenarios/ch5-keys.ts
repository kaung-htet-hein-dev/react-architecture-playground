import { component, createRoot, domOpsOf, eventsOf, h, useState, type SetState } from '../model'
import type { DomOp, LogEntry, Scenario } from '../types'

/**
 * Chapter 5 · Reconciliation and keys. The same list update runs on two lists, one keyed by
 * index and one by id. Each Row is `<li>{label}<input /></li>`, and the input keeps its own
 * text in the DOM, so whichever Row React reuses keeps the text. The model decides the
 * matching (keyed reconciliation) and the DOM writes; the chapter applies the same update to
 * real React lists with real uncontrolled inputs.
 */
export interface Item {
  id: string
  label: string
}

export type Ch5Action = 'add' | 'remove' | 'shuffle'
export type KeyBy = 'index' | 'id'

export interface Ch5Params {
  before: readonly Item[]
  after: readonly Item[]
  action: Ch5Action
  /** Bumped on every button press so the same update can run twice. */
  run?: number
}

export const CH5_ITEMS: readonly Item[] = [
  { id: 'milk', label: 'Milk' },
  { id: 'bread', label: 'Bread' },
  { id: 'eggs', label: 'Eggs' },
]

/** The notes we typed before the chapter starts (uncontrolled inputs' defaultValue). */
export const CH5_NOTES: Readonly<Record<string, string>> = { milk: '2 litres', bread: 'sourdough', eggs: 'a dozen' }

/** Labels "Add item" picks from, in order. */
export const CH5_POOL = ['Butter', 'Apples', 'Cheese', 'Rice', 'Tea'] as const

export const ACTION_LABEL: Record<Ch5Action, string> = { add: 'Add item', remove: 'Remove first', shuffle: 'Shuffle' }

export type KeyTag = 'text' | 'keep' | 'remove' | 'move' | 'create'

/** One row of a side's reconcile log. */
export interface KeyLogRow {
  key: string
  text: string
  tag: KeyTag
}

export interface SideResult {
  keyBy: KeyBy
  /** DOM writes the commit made on this list. */
  ops: DomOp[]
  log: KeyLogRow[]
  /** Keys whose Row kept its input while its label changed: typed text is now on the wrong row. */
  wrong: string[]
  /** Keys that were removed, with their old label and position. */
  removed: { key: string; label: string; index: number }[]
  /** Keys that were created. */
  created: string[]
}

export type Ch5Stage = 'before' | 'queued' | 'reconciled' | 'committed'

export interface Ch5Data {
  stage: Ch5Stage
  index: SideResult
  id: SideResult
}

export const keyOf = (keyBy: KeyBy, item: Item, i: number) => (keyBy === 'index' ? String(i) : item.id)

/** Run `before → after` on one list on the fiber model. */
export function runSide(before: readonly Item[], after: readonly Item[], keyBy: KeyBy): SideResult {
  let setItems: SetState<readonly Item[]> = () => {}
  const Row = component<{ label: string }>('Row', ({ label }) => h('li', null, label, h('input', null)))
  const List = component('List', () => {
    const [items, set] = useState<readonly Item[]>(before, 'items')
    setItems = set
    return h('ul', null, items.map((it, i) => h(Row, { key: keyOf(keyBy, it, i), label: it.label })))
  })
  const root = createRoot(h(List, { $id: 'list' }))
  root.mount()
  root.event('update', () => setItems(after))
  const rendered = root.render().events
  const ops = domOpsOf(root.commit())
  root.flush()

  const oldLabel = new Map(before.map((it, i) => [keyOf(keyBy, it, i), it.label]))
  const newLabel = new Map(after.map((it, i) => [keyOf(keyBy, it, i), it.label]))
  const rec = eventsOf(rendered, 'reconcile').filter((e) => e.name === 'Row' && e.key != null)
  const actionOf = new Map(rec.map((e) => [e.key as string, e.action]))
  const keyOfOp = (o: DomOp) => /Row\[([^\]]+)\]/.exec(o.nodeId ?? '')?.[1]
  const moved = new Set(ops.filter((o) => o.kind === 'move').map(keyOfOp))

  const log: KeyLogRow[] = []
  const wrong: string[] = []
  const removed: SideResult['removed'] = []
  const created: string[] = []
  before.forEach((it, i) => {
    const k = keyOf(keyBy, it, i)
    if (actionOf.get(k) === 'delete' || !newLabel.has(k)) {
      log.push({ key: k, text: 'not in the new list', tag: 'remove' })
      removed.push({ key: k, label: it.label, index: i })
    } else if (newLabel.get(k) !== it.label) {
      log.push({ key: k, text: `label ${it.label} → ${newLabel.get(k)}, keep input`, tag: 'text' })
      wrong.push(k)
    } else if (moved.has(k) || actionOf.get(k) === 'move') {
      log.push({ key: k, text: 'moved, same props', tag: 'move' })
    } else log.push({ key: k, text: 'matched, same props', tag: 'keep' })
  })
  after.forEach((it, i) => {
    const k = keyOf(keyBy, it, i)
    if (oldLabel.has(k)) return
    log.push({ key: k, text: 'new item, new input', tag: 'create' })
    created.push(k)
  })
  return { keyBy, ops, log, wrong, removed, created }
}

const list = (items: readonly Item[]) => (items.length ? items.map((i) => i.label).join(' · ') : 'empty')

const ERROR_CAPTION: Partial<Record<Ch5Action, string>> = {
  remove:
    'With index keys, React thinks you removed the last row and renamed the other two. Each Row kept its old DOM input, so the text you typed now sits next to the wrong label. Use a stable id from your data as the key.',
  shuffle:
    'With index keys, React matched rows by position, so every input stayed where it was and only the labels changed. The text you typed no longer belongs to its item. With ids, React moved the rows, inputs and all.',
}

function commitCaption(action: Ch5Action, index: SideResult, id: SideResult): string {
  if (index.wrong.length) {
    return (
      ERROR_CAPTION[action] ??
      'With index keys, React kept each input by position while the labels changed, so typed text moved to the wrong rows. Use a stable id from your data as the key.'
    )
  }
  if (action === 'add')
    return `Adding to the end is where index keys look fine: the old keys still point at the same items, so both lists create one row (${index.ops.length} and ${id.ops.length} DOM ops). Remove or reorder rows to see them disagree.`
  return `Both lists matched every row to the same item, so every note stayed with its row.`
}

/**
 * Trace for one list update on both lists: idle → setItems queued → reconcile (per-key
 * matching) → commit (DOM writes; error when the index list put typed text on the wrong row).
 */
export const ch5Keys: Scenario<Ch5Params, Ch5Data> = ({ before, after, action }) => {
  const index = runSide(before, after, 'index')
  const id = runSide(before, after, 'id')
  const name = ACTION_LABEL[action]
  const base = { tree: [], preview: { values: { before: list(before), after: list(after) } } }
  const log: LogEntry[] = []
  const at = (stage: Ch5Stage): Ch5Data => ({ stage, index, id })

  const steps: ReturnType<typeof ch5Keys> = []
  steps.push({
    ...base,
    phase: 'trigger',
    activeLine: 0,
    log: [],
    domOps: [],
    data: at('before'),
    caption: `Each row has a note typed into its input. Press play to run ${name} on both lists, or pick another action.`,
  })
  log.push({ text: `${name} → setItems([${after.map((i) => i.label).join(', ')}])`, tone: 'trigger' })
  steps.push({
    ...base,
    phase: 'trigger',
    activeLine: 2,
    log: [...log],
    domOps: [],
    data: at('queued'),
    caption: `${name} called setItems on both lists with the same new array. Nothing on screen has changed yet; the update is queued.`,
  })
  log.push({ text: `match by key: ${index.log.length} keys by index, ${id.log.length} by id`, tone: 'reconcile' })
  steps.push({
    ...base,
    phase: 'reconcile',
    activeLine: 2,
    log: [...log],
    domOps: [],
    data: at('reconciled'),
    caption:
      'Both lists rendered the same new rows. React matches each one to an old Row with the same key: by position on the left, by item on the right. A match keeps its Row, and its input.',
  })
  log.push({ text: `commit: ${index.ops.length} DOM ops by index, ${id.ops.length} by id`, tone: index.wrong.length ? 'error' : 'commit' })
  steps.push({
    ...base,
    phase: 'commit',
    activeLine: 2,
    ...(index.wrong.length ? { status: 'error' as const, errorLine: 2 } : {}),
    log: [...log],
    domOps: [...index.ops, ...id.ops],
    data: at('committed'),
    caption: commitCaption(action, index, id),
  })
  return steps
}

/** A different order of `items` (rotates when a random shuffle comes back unchanged). */
export function shuffled(items: readonly Item[], random: () => number = Math.random): Item[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  if (out.every((it, i) => it === items[i]) && out.length > 1) return [...items.slice(1), items[0]]
  return out
}

/** The next item "Add item" appends, or null when the pool is used up. */
export function nextItem(items: readonly Item[], used: readonly string[] = []): Item | null {
  const taken = new Set([...items.map((i) => i.id), ...used])
  const label = CH5_POOL.find((l) => !taken.has(l.toLowerCase()))
  return label ? { id: label.toLowerCase(), label } : null
}

/** The two list sources (design `codes()`): line 2 holds the key. */
export const CH5_CODE: Record<KeyBy, string> = {
  index: '{items.map((item, index) => (\n  <Row key={index} label={item.label} />\n))}',
  id: '{items.map(item => (\n  <Row key={item.id} label={item.label} />\n))}',
}
export const CH5_KEY_LINE = 2
