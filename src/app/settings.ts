import { createContext, useContext } from 'react'

export interface Settings {
  /** The OS asks for reduced motion (prefers-reduced-motion: reduce). */
  reducedMotion: boolean
}

export const SettingsContext = createContext<Settings | null>(null)

export function useSettings(): Settings {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider')
  return ctx
}
