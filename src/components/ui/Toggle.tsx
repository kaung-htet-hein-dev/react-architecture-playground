import { C } from '../../sim/colors'

export interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  /** Mono label, e.g. `memo(Sidebar)` */
  label: string
  /** Optional 12px description under the label. */
  description?: string
  disabled?: boolean
  className?: string
}

/**
 * Switch button: 28×16 track with a 12px knob. On: render-blue track, dark knob at left 14.
 * Off: dark track, grey knob at left 2. At least 44px tall on mobile.
 */
export function Toggle({ checked, onChange, label, description, disabled, className = '' }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2.5 rounded-button border border-border bg-raised py-2 pr-3 pl-2.5 text-left transition-colors hover:border-border-strong disabled:opacity-50 max-md:min-h-11 ${className}`}
    >
      <span
        aria-hidden
        className="relative h-4 w-7 flex-none rounded-full transition-colors duration-150"
        style={{ background: checked ? C.render : C.track }}
      >
        <span
          className="absolute top-0.5 size-3 rounded-full transition-[left,background-color] duration-150"
          style={{ left: checked ? 14 : 2, background: checked ? C.bg : C.label }}
        />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span
          className="font-mono text-[12.5px] font-medium"
          style={{ color: checked ? C.heading : C.secondary }}
        >
          {label}
        </span>
        {description && <span className="text-xs leading-snug text-text-label">{description}</span>}
      </span>
    </button>
  )
}
