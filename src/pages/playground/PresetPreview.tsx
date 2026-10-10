import type { ReactNode } from 'react'
import { LivePreview, PreviewButton, PreviewValue } from '../../components/LivePreview'
import { alpha, C } from '../../sim/colors'
import type { PgStep } from '../../sim/scenarios/playground'

export interface PresetPreviewProps {
  presetId: string
  step: PgStep
  /** Index 0: the clickable control gets the amber "click me" ring and starts the trace. */
  idle: boolean
  /** Click on the preview's control. */
  onTrigger: () => void
}

const str = (v: unknown) => (v == null ? '' : String(v))
const arr = (v: unknown): readonly string[] => (Array.isArray(v) ? v : [])

/** Amber ring while idle (click me), green ring while the value's DOM write is the current step. */
function ringFor(idle: boolean, written: boolean) {
  if (idle) return alpha(C.trigger, 60)
  if (written) return alpha(C.commit, 70)
  return undefined
}

function Btn({ children, ring, onClick, label }: { children: ReactNode; ring?: string; onClick: () => void; label: string }) {
  return (
    <PreviewButton onClick={onClick} ring={ring} aria-label={label} className="rounded-button px-[18px] py-2.5 text-[15px]">
      {children}
    </PreviewButton>
  )
}

/** A light "input" that holds text the DOM keeps (not React state). */
function FakeInput({ children, wrong }: { children: ReactNode; wrong?: boolean }) {
  return (
    <span
      className="inline-flex h-6 min-w-[86px] items-center rounded-[5px] border bg-white px-2 text-[12.5px]"
      style={{ borderColor: wrong ? C.previewBad : C.previewDot, color: C.previewTab }}
    >
      {children}
    </span>
  )
}

function Body({ presetId, step, idle, onTrigger }: PresetPreviewProps) {
  const v = step.preview.values
  const hl = (k: string) => !!step.preview.highlight?.includes(k)
  switch (presetId) {
    case 'counter-click':
    case 'three-setstate':
      return (
        <Btn onClick={onTrigger} ring={ringFor(idle, hl('count'))} label={`Count: ${str(v.count)}${idle ? ' (starts the simulation)' : ''}`}>
          Count: {str(v.count)}
        </Btn>
      )
    case 'setstate-in-effect':
      return (
        <Btn onClick={onTrigger} ring={ringFor(idle, hl('count') || hl('doubled'))} label={`${str(v.count)} × 2 = ${str(v.doubled)}${idle ? ' (starts the simulation)' : ''}`}>
          {str(v.count)} × 2 ={' '}
          <span style={v.stale ? { color: C.error, textDecoration: `underline wavy ${C.error}` } : undefined} title={v.stale ? 'stale value' : undefined}>{str(v.doubled)}</span>
        </Btn>
      )
    case 'keys': {
      const labels = arr(v.labels)
      const typed = arr(v.typed)
      const ok = arr(v.ok)
      return (
        <div className="flex w-full flex-col gap-2">
          <div>
            <PreviewButton onClick={onTrigger} ring={ringFor(idle, false)} className="px-3 py-1.5 text-[13px]">
              Remove first
            </PreviewButton>
          </div>
          <ul className="m-0 flex list-none flex-col gap-1 p-0" style={{ boxShadow: hl('rows') ? `0 0 0 1px ${alpha(C.commit, 90)}` : 'none', borderRadius: 6 }}>
            {labels.map((l, i) => {
              const bad = ok[i] === '0'
              return (
                <li key={`${l}-${i}`} className="flex items-center gap-2 text-[13px]">
                  <span className="w-12 font-medium">{l}</span>
                  <FakeInput wrong={bad}>{typed[i]}</FakeInput>
                  <span aria-label={bad ? 'wrong row' : 'right row'} className="font-mono text-xs" style={{ color: bad ? C.previewBad : C.previewOk }}>
                    {bad ? '✕' : '✓'}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )
    }
    case 'memo-object-prop':
      return (
        <div className="flex items-center gap-4">
          <Btn onClick={onTrigger} ring={ringFor(idle, hl('clicks'))} label={`Clicks: ${str(v.clicks)}${idle ? ' (starts the simulation)' : ''}`}>
            Clicks: {str(v.clicks)}
          </Btn>
          <span className="flex h-12 w-20 items-end gap-1 rounded-md bg-preview-ink p-2" aria-label="Chart">
            {[40, 70, 55, 85].map((h) => (
              <span key={h} className="flex-1 rounded-[2px] bg-preview" style={{ height: `${h}%`, opacity: 0.8 }} />
            ))}
          </span>
        </div>
      )
    case 'layout-vs-passive': {
      const top = Number(v.top ?? 0)
      return (
        <div className="relative h-[74px] w-[220px]">
          <PreviewButton onClick={onTrigger} ring={ringFor(idle, false)} className="absolute top-0 left-0 px-3 py-1.5 text-[13px]">
            Show tip
          </PreviewButton>
          {v.open === true && (
            <span
              className="absolute left-[96px] rounded-[5px] px-2 py-1 text-xs font-medium"
              style={{ top: 2 + top * 0.95, background: C.previewTab, color: C.preview, boxShadow: hl('tip') ? `0 0 0 2px ${alpha(top ? C.commit : C.error, 80)}` : 'none' }}
            >
              Tip · top {top}
            </span>
          )}
        </div>
      )
    }
    case 'stale-closure':
      return (
        <div className="flex items-center gap-4">
          <span className="text-[19px] font-medium">
            Count: <PreviewValue highlight={hl('count')}>{str(v.count)}</PreviewValue>
          </span>
          <PreviewButton onClick={onTrigger} ring={ringFor(idle, false)} className="px-3 py-1.5 text-[13px]">
            Wait 1 s
          </PreviewButton>
          <span className="font-mono text-[11px] text-preview-url">t = {str(v.seconds)} s</span>
        </div>
      )
    case 'use-transition': {
      const rows = arr(v.rows)
      return (
        <div className="flex w-full flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTrigger}
              className="flex h-7 w-[132px] items-center rounded-[6px] border bg-white px-2 text-left text-[13px]"
              style={{ borderColor: hl('query') ? C.previewOk : C.previewDot, boxShadow: idle ? `0 0 0 3px ${alpha(C.trigger, 60)}` : 'none', color: C.previewInk }}
              aria-label={`Search input, shows "${str(v.query)}"${idle ? ' (type to start the simulation)' : ''}`}
            >
              {str(v.query)}
              <span className="ml-px inline-block h-4 w-px bg-preview-ink" aria-hidden />
            </button>
            {v.pending === true && <small className="text-[11px] text-preview-url">Updating…</small>}
          </div>
          <ul className="m-0 flex list-none flex-wrap gap-x-3 gap-y-0.5 p-0 font-mono text-xs text-preview-tab">
            {rows.map((r) => (
              <li key={r}>{r}</li>
            ))}
            <li className="text-preview-url">… 4,997 more</li>
          </ul>
        </div>
      )
    }
    case 'use-optimistic': {
      const shown = arr(v.shown)
      return (
        <div className="flex w-full flex-col gap-1.5">
          {shown.map((m) => (
            <p key={m} className="m-0 text-[13px]" style={{ color: m.endsWith('· sending') ? C.previewUrl : undefined, fontStyle: m.endsWith('· sending') ? 'italic' : undefined }}>
              {m}
            </p>
          ))}
          {str(v.error) && (
            <small className="text-xs font-medium" style={{ color: C.previewBad }}>
              {str(v.error)}
            </small>
          )}
          <div>
            <PreviewButton onClick={onTrigger} ring={ringFor(idle, false)} className="px-3 py-1.5 text-[13px]">
              Send
            </PreviewButton>
          </div>
        </div>
      )
    }
    case 'conditional-hook':
      return (
        <div className="flex items-center gap-4">
          <span className="rounded-md border border-preview-dot px-3 py-2 text-[13px]">
            {str(v.name)} · {str(v.theme)} {v.isAdmin === true && <span className="font-mono text-[10.5px] text-preview-url">admin</span>}
          </span>
          <PreviewButton onClick={onTrigger} ring={ringFor(idle, false)} className="px-3 py-1.5 text-[13px]">
            Switch user
          </PreviewButton>
        </div>
      )
    default:
      return null
  }
}

/** The light browser frame with the preset's rendered app. Its controls act as triggers. */
export function PresetPreview(props: PresetPreviewProps) {
  const { step } = props
  return (
    <LivePreview tabTitle={step.preview.tabTitle || undefined} error={step.preview.error} minHeight={86}>
      <div className="flex w-full justify-center">
        <Body {...props} />
      </div>
    </LivePreview>
  )
}
