import { createContext, useContext } from 'react'

export interface Settings {
  /** Effective reduced motion: the OS setting OR the in-app toggle. */
  reducedMotion: boolean
  /** The OS asks for reduced motion (prefers-reduced-motion: reduce). */
  systemReducedMotion: boolean
  /** The in-app toggle, saved in localStorage. */
  reducedMotionToggle: boolean
  setReducedMotionToggle: (on: boolean) => void
}

export const SettingsContext = createContext<Settings | null>(null)

export function useSettings(): Settings {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider')
  return ctx
}
