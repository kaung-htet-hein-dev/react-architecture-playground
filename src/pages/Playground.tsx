import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { CodePane } from '../components/code/CodePane'
import { BrandMark } from '../components/ui/BrandMark'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { readStore, STORE_KEYS, writeStore } from '../lib/storage'
import { alpha, C } from '../sim/colors'
import { cleanParam, DEFAULT_PRESET, fillParams, paramDefaults, presetById, PRESETS, type PgData, type PresetDef } from '../sim/scenarios/playground'
import { type SimulationApi } from '../sim/types'
import { useSimulation } from '../sim/useSimulation'
import { BottomBar } from './playground/BottomBar'
import { PresetPicker } from './playground/PresetPicker'
import { PresetPreview } from './playground/PresetPreview'
import { QueuesPane } from './playground/QueuesPane'
import { TreesPane } from './playground/TreesPane'

const toStep = (v: string | null) => {
  const n = Number.parseInt(v ?? '', 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** `?preset=&step=` wins; then the last preset and step saved in localStorage; then the default. */
function initialSelection(search: URLSearchParams): { preset: PresetDef; step: number } {
  const fromUrl = presetById(search.get('preset'))
  if (fromUrl) return { preset: fromUrl, step: toStep(search.get('step')) }
  const stored = presetById(readStore(STORE_KEYS.playgroundPreset))
  if (stored) return { preset: stored, step: toStep(readStore(STORE_KEYS.playgroundStep)) }
  return { preset: presetById(DEFAULT_PRESET)!, step: 0 }
}

const HOST_TAGS = /^(button|p|div|ul|li|input|small|svg|span|img|nav|header)$/

/**
 * ← → step and Space play/pause, ignored while focus is in an input. Space is also left alone
 * on buttons, links and other controls, where it activates the focused control.
 */
function useKeyboard(sim: SimulationApi<PgData>) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const onControl = !!t?.closest('button, a[href], select, summary, [role="button"], [role="slider"], [tabindex]')
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        sim.stepForward()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        sim.stepBack()
      } else if (e.key === ' ' && !onControl) {
        e.preventDefault()
        if (sim.status === 'running') sim.pause()
        else sim.play()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
}

/**
 * Full-screen Playground (`/playground`, REQUIREMENTS §7): preset + code + live preview on the
 * left, the current and work-in-progress fiber trees in the center, queues on the right, and
 * the controls, frame timeline and console at the bottom. Every pane renders `steps[index]`.
 */
export default function Playground() {
  const [search, setSearch] = useSearchParams()
  const [init] = useState(() => initialSelection(search))
  const [sel, setSel] = useState(() => ({ id: init.preset.id, params: paramDefaults(init.preset.code) }))
  const [picked, setPicked] = useState<{ preset: string; node: string } | null>(null)
  const preset = presetById(sel.id) ?? PRESETS[0]
  const sim = useSimulation(preset.scenario, sel.params, { initialIndex: init.step })
  const { step, index, status } = sim
  const data = step.data!
  useKeyboard(sim)
  const reduced = useReducedMotion()
  const codeBox = useRef<HTMLDivElement>(null)

  // Keep the highlighted line in view as the trace moves through the code.
  const hotLine = step.errorLine || step.activeLine
  useEffect(() => {
    if (!hotLine) return
    const row = codeBox.current?.querySelector('[aria-current="step"]')
    row?.scrollIntoView?.({ block: 'nearest' })
  }, [hotLine, sel.id])

  // Mirror the preset and step to the URL (linkable) and to localStorage (restored next visit).
  useEffect(() => {
    writeStore(STORE_KEYS.playgroundPreset, sel.id)
    writeStore(STORE_KEYS.playgroundStep, String(index))
    if (search.get('preset') !== sel.id || search.get('step') !== String(index)) {
      setSearch({ preset: sel.id, step: String(index) }, { replace: true })
    }
  }, [sel.id, index, search, setSearch])

  const choosePreset = (id: string) => {
    const p = presetById(id)
    if (!p || p.id === sel.id) return
    setSel({ id: p.id, params: paramDefaults(p.code) })
    setPicked(null)
  }
  const setParam = (i: number, v: string) => setSel((s) => ({ ...s, params: s.params.map((p, j) => (j === i ? cleanParam(v) : p)) }))
  const onTrigger = () => {
    if (index === 0) sim.stepForward()
  }

  // Hook-slot panel: the node picked in either tree, else the preset's focus component.
  const allNodes = [...data.panes[0].tree, ...data.panes[1].tree]
  const pickedId = picked?.preset === sel.id && allNodes.some((n) => n.id === picked.node) ? picked.node : null
  const ownerId = pickedId ?? data.focus
  const ownerNode = allNodes.find((n) => n.id === ownerId)
  const ownerLabel = ownerNode?.label ?? data.focus
  const hookOwner = { label: ownerLabel, slots: data.hooks[ownerId] ?? null, host: HOST_TAGS.test(ownerLabel) }

  const phaseKey = step.phase === 'paint' ? 'commit' : step.phase
  const phLabel = status === 'idle' ? 'ready' : status === 'error' ? `step ${index} · error` : `step ${index} · ${step.phase}`
  const phColor = status === 'idle' ? C.label : status === 'error' ? C.error : C[phaseKey]

  return (
    <div className="grid h-screen grid-rows-[52px_minmax(0,1fr)_auto] overflow-hidden bg-bg text-text-strong">
      <header className="flex items-center gap-[18px] border-b border-divider bg-raised px-4">
        <Link to="/" className="flex flex-none items-center gap-2.5 text-text-heading hover:text-text-heading">
          <BrandMark />
          <span className="text-sm font-semibold">React Internal</span>
        </Link>
        <span className="h-5 w-px flex-none bg-border" aria-hidden />
        <h1 className="m-0 text-sm font-medium text-text-node">Playground</h1>
        <span className="flex-1" />
        {reduced && (
          <span className="flex-none rounded-control border border-border-strong px-[9px] py-[7px] font-mono text-[11px] leading-none font-medium text-text-secondary">
            Reduced motion
          </span>
        )}
        {/* The shortcut hint drops out below 1180px so the header never overflows at 1024. */}
        <span className="font-mono text-[11.5px] whitespace-nowrap text-text-faint max-[1180px]:hidden">← → step · space play</span>
        <Link
          to="/"
          className="flex h-[30px] flex-none items-center rounded-[7px] border border-border-strong px-3 text-[13px] font-medium whitespace-nowrap text-text-strong hover:bg-control hover:text-text-strong"
        >
          Back to the guide
        </Link>
      </header>

      <main className="grid min-h-0 grid-cols-[minmax(360px,440px)_minmax(0,1fr)_minmax(300px,360px)]">
        <div className="flex min-h-0 flex-col border-r border-divider">
          <PresetPicker presets={PRESETS} value={sel.id} onChange={choosePreset} />
          <div className="flex h-[34px] flex-none items-center justify-between px-3.5 font-mono text-xs leading-none font-medium text-text-label">
            <span>{preset.file} · read-only</span>
            <span style={{ color: phColor }}>{phLabel}</span>
          </div>
          <div ref={codeBox} className="min-h-0 flex-1 overflow-auto">
            <CodePane
              code={fillParams(preset.code, sel.params)}
              activeLine={step.activeLine}
              errorLine={step.errorLine}
              phase={step.phase}
              notes={step.notes}
              dimLines={step.dimLines}
              size="sm"
              onParamChange={setParam}
              label={preset.file}
            />
          </div>
          {preset.paramNote && (
            <div className="flex flex-none items-center gap-2 border-t border-divider px-3.5 py-2 text-[12.5px] text-text-secondary">
              <span className="h-3 w-3.5 flex-none rounded-[3px]" style={{ outline: `1px dashed ${C.trigger}`, background: alpha(C.trigger, 12) }} aria-hidden />
              {preset.paramNote}
            </div>
          )}
          <div className="flex flex-none flex-col gap-2 border-t border-divider px-3.5 pt-3 pb-3.5">
            <div className="flex justify-between font-mono text-xs leading-none font-medium text-text-label">
              <span>Live preview</span>
              <span>{preset.previewHint}</span>
            </div>
            <PresetPreview presetId={preset.id} step={step} idle={index === 0} onTrigger={onTrigger} />
          </div>
        </div>

        <TreesPane data={data} colWidth={preset.colWidth} selected={pickedId} onSelect={(node) => setPicked({ preset: sel.id, node })} />

        <QueuesPane step={step} hookOwner={hookOwner} />
      </main>

      <BottomBar sim={sim} />
    </div>
  )
}
