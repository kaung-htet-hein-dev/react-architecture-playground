import { useStoredState } from '../../hooks/useStoredState'
import { STORE_KEYS } from '../../lib/storage'

export interface VersionChipProps {
  /** Unique id; the value is saved in localStorage under `rcr-version-<id>`. */
  id: string
  defaultValue?: string
  /** Small label before the input. */
  label?: string
}

/** Editable "SINCE React 19" chip (chapter 9): dashed border, 24px, saved to localStorage. */
export function VersionChip({ id, defaultValue = 'React 19', label = 'SINCE' }: VersionChipProps) {
  const [value, setValue] = useStoredState(STORE_KEYS.version(id), defaultValue)
  return (
    <label className="inline-flex h-6 flex-none items-center gap-1.5 rounded-[5px] border border-dashed border-node-skip-bd pr-1.5 pl-2 focus-within:border-text-label focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-text-strong max-md:h-11">
      <span className="font-mono text-[9.5px] font-medium tracking-[0.06em] text-text-label">{label}</span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label={`${label.toLowerCase()} version`}
        spellCheck={false}
        className="w-[66px] border-0 bg-transparent p-0 font-mono text-[11.5px] font-medium text-text-heading outline-none"
        style={{ width: `${Math.max(4, value.length + 1)}ch` }}
      />
    </label>
  )
}
