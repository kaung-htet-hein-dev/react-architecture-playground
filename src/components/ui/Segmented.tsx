import { alpha, C } from '../../sim/colors'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

export interface SegmentedProps<T extends string> {
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Accessible name for the group. */
  label: string
  /** Editable parameter (e.g. the dependency-array picker): amber 50% border. */
  editable?: boolean
  className?: string
}

/**
 * Segmented control: 2px padding, page-colored well, radius 8. Items are 28px tall
 * (44px on mobile); the selected one is raised with heading text.
 */
export function Segmented<T extends string>({ options, value, onChange, label, editable, className = '' }: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`inline-flex flex-wrap rounded-button border bg-bg p-0.5 ${className}`}
      style={{ borderColor: editable ? alpha(C.trigger, 50) : C.border }}
    >
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className="flex h-7 items-center rounded-control px-2.5 font-mono text-xs font-medium transition-colors max-md:h-11 max-md:px-3.5"
            style={{ background: on ? C.border : 'transparent', color: on ? C.heading : C.label }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
