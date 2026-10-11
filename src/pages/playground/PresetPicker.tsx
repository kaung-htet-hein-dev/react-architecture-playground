import { useEffect, useRef, useState } from 'react'
import { C } from '../../sim/colors'
import type { PresetDef } from '../../sim/scenarios/playground'

export interface PresetPickerProps {
  presets: readonly PresetDef[]
  value: string
  onChange: (id: string) => void
}

/**
 * "PRESET" dropdown at the top of the left column: a disclosure button and a list of preset
 * buttons (the current one is focused on open). Escape or a click outside closes it; closing
 * from the keyboard or picking a preset puts focus back on the trigger.
 */
export function PresetPicker({ presets, value, onChange }: PresetPickerProps) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const current = presets.find((p) => p.id === value)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        trigger.current?.focus()
      }
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={root} className="relative border-b border-divider px-3 py-2.5">
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="preset-list"
        className="flex h-9 w-full items-center gap-2.5 rounded-[7px] border border-border-strong bg-well px-3 text-left text-[13px] font-medium text-text-heading hover:bg-control"
      >
        <span className="font-mono text-xs font-medium text-text-label">Preset</span>
        <span className="flex-1 truncate">{current?.label}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
          <polygon points="1,3 9,3 5,8" fill={C.label} />
        </svg>
      </button>
      {open && (
        <ul
          id="preset-list"
          aria-label="Presets"
          className="absolute top-[50px] right-3 left-3 z-10 m-0 list-none rounded-button border border-border-strong bg-panel-hi p-1 shadow-dropdown"
        >
          {presets.map((p, i) => {
            const on = p.id === value
            return (
              <li key={p.id}>
                <button
                  type="button"
                  autoFocus={on}
                  aria-current={on || undefined}
                  onClick={() => {
                    setOpen(false)
                    onChange(p.id)
                    trigger.current?.focus()
                  }}
                  className={`flex h-8 w-full items-center gap-2.5 rounded-[5px] border-0 px-2.5 text-left text-[13px] ${on ? 'bg-control-hover text-text-heading' : 'bg-transparent text-text-node hover:bg-control'}`}
                >
                  <span className="w-[18px] font-mono text-[11px] font-medium text-text-faint">{String(i + 1).padStart(2, '0')}</span>
                  {p.label}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
