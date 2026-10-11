import type { ReactNode } from 'react'
import { CodePane } from '../../../components/code/CodePane'
import { alpha, C } from '../../../sim/colors'
import { CH5_CODE, CH5_KEY_LINE, keyOf, type Ch5Stage, type Item, type KeyBy, type KeyTag, type SideResult } from '../../../sim/scenarios/ch5-keys'

export interface KeyListProps {
  keyBy: KeyBy
  /** Items the real list renders right now (before the commit step: the old array). */
  items: readonly Item[]
  result: SideResult
  stage: Ch5Stage
  /** Input text captured when the action was pressed, by key (shown on removed rows). */
  snapshot: Readonly<Record<string, string>>
  /** Registers each row's real <input> by key. */
  registerInput: (keyBy: KeyBy, key: string, el: HTMLInputElement | null) => void
  activeLine: number
}

const ROW = 'grid grid-cols-[62px_70px_minmax(0,1fr)_20px] items-center gap-2.5'

const TAG_COLOR: Record<KeyTag, string> = { text: C.commit, move: C.commit, create: C.commit, remove: C.error, keep: C.faint }

const keyText = (keyBy: KeyBy, key: string) => (keyBy === 'index' ? `key ${key}` : key)

function KeyBadge({ children, removed }: { children: ReactNode; removed?: boolean }) {
  return removed ? (
    <span className="rounded-tag border border-dashed px-1.5 py-[3px] text-center font-mono text-[11px] font-medium line-through" style={{ color: C.error, borderColor: C.error }}>
      {children}
    </span>
  ) : (
    <span className="truncate rounded-tag px-1.5 py-1 text-center font-mono text-[11px] font-medium" style={{ color: C.reconcile, background: alpha(C.reconcile, 12) }}>
      {children}
    </span>
  )
}

/**
 * One list of the comparison: real `<Row>`s rendered with `key={index}` or `key={item.id}`,
 * each with an uncontrolled `<input>` that keeps its own text in the DOM. After the commit
 * step, removed rows stay as struck-through ghosts and each row shows ✓ or ✕.
 */
export function KeyList({ keyBy, items, result, stage, snapshot, registerInput, activeLine }: KeyListProps) {
  const committed = stage === 'committed'
  const reconciled = committed || stage === 'reconciled'
  const wrong = committed && result.wrong.length > 0
  const ops = committed ? result.ops.length : 0

  const rows: { key: string; node: ReactNode }[] = items.map((it, i) => {
    const k = keyOf(keyBy, it, i)
    const bad = committed && result.wrong.includes(k)
    const isNew = result.created.includes(k)
    return {
      key: k,
      node: (
        <li key={k} className={ROW}>
          <KeyBadge>{keyText(keyBy, k)}</KeyBadge>
          <span className="truncate text-sm font-medium text-text-heading">{it.label}</span>
          <input
            ref={(el) => {
              registerInput(keyBy, k, el)
              return () => registerInput(keyBy, k, null)
            }}
            aria-label={`Note for ${it.label} (${keyText(keyBy, k)})`}
            placeholder="type a note"
            className="h-[30px] min-w-0 rounded-control border bg-bg px-2.5 text-[13.5px] text-text-strong placeholder:text-text-faint"
            style={{ borderColor: bad ? alpha(C.error, 80) : C.borderStrong }}
          />
          <span className="font-mono text-[13px] font-semibold" style={{ color: bad ? C.error : C.commit }} role={committed && !isNew ? 'img' : undefined} aria-label={committed && !isNew ? (bad ? 'wrong text' : 'correct') : undefined}>
            {committed && !isNew ? (bad ? '✕' : '✓') : ''}
          </span>
        </li>
      ),
    }
  })
  if (committed) {
    for (const r of [...result.removed].sort((a, b) => a.index - b.index)) {
      rows.splice(Math.min(r.index, rows.length), 0, {
        key: `ghost-${r.key}`,
        node: (
          <li key={`ghost-${r.key}`} className={`${ROW} opacity-70`} aria-label={`${r.label} removed`}>
            <KeyBadge removed>{keyText(keyBy, r.key)}</KeyBadge>
            <span className="truncate text-sm line-through" style={{ color: C.error }}>
              {r.label}
            </span>
            <span className="flex h-[30px] items-center rounded-control border border-dashed px-2.5 text-[13.5px] text-text-label line-through" style={{ borderColor: alpha(C.error, 60) }}>
              {snapshot[r.key] ?? ''}
            </span>
            <span />
          </li>
        ),
      })
    }
  }

  return (
    <section className="panel flex flex-col" style={{ borderColor: wrong ? alpha(C.error, 45) : undefined }} aria-label={`key={${keyBy === 'index' ? 'index' : 'item.id'}}`}>
      <div className="flex items-center justify-between gap-2.5 border-b border-divider px-4 py-3.5">
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[15px] font-semibold text-text-heading">{keyBy === 'index' ? 'key={index}' : 'key={item.id}'}</span>
          <StatusLine keyBy={keyBy} committed={committed} wrong={wrong} />
        </div>
        <div className="flex flex-col items-end gap-[3px]" title={committed ? result.ops.map((o) => o.text).join('\n') : undefined}>
          <span className="font-mono text-2xl leading-none font-semibold text-text-heading">{ops}</span>
          <span className="font-mono text-xs leading-none font-medium text-text-label">DOM op{ops === 1 ? '' : 's'}</span>
        </div>
      </div>
      <ul className="m-0 flex list-none flex-col gap-1.5 px-4 py-3.5">{rows.map((r) => r.node)}</ul>
      <div className="flex flex-col border-t border-divider py-2">
        {reconciled ? (
          result.log.map((l) => (
            <div key={l.key} className="grid grid-cols-[52px_minmax(0,1fr)_auto] gap-2.5 px-4 py-[5px] font-mono text-xs leading-[1.45]">
              <span className="truncate text-text-secondary">{keyText(keyBy, l.key)}</span>
              <span className="text-text-prose">{l.text}</span>
              <span style={{ color: TAG_COLOR[l.tag] }}>{l.tag}</span>
            </div>
          ))
        ) : (
          <p className="m-0 px-4 py-[5px] font-mono text-xs leading-[1.45] text-text-label">React shows how it matched each key here.</p>
        )}
      </div>
      <div className="mt-auto border-t border-divider bg-raised">
        <CodePane
          code={CH5_CODE[keyBy]}
          activeLine={activeLine}
          errorLine={wrong ? CH5_KEY_LINE : 0}
          phase="reconcile"
          size="sm"
          label={keyBy === 'index' ? 'List with index keys' : 'List with id keys'}
        />
      </div>
    </section>
  )
}

function StatusLine({ keyBy, committed, wrong }: { keyBy: KeyBy; committed: boolean; wrong: boolean }) {
  const [color, text] = !committed
    ? [C.label, keyBy === 'index' ? 'matches rows by position' : 'matches rows by item id']
    : wrong
      ? [C.error, 'typed text is on the wrong rows']
      : [C.commit, 'each note stayed with its item']
  return (
    <span className="flex items-center gap-1.5 font-mono text-[11px] leading-none font-medium tracking-[0.04em]" style={{ color }}>
      <span className="size-1.5 rounded-full" style={{ background: color }} aria-hidden />
      {text}
    </span>
  )
}
