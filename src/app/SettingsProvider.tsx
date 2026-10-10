import { useEffect, useState, type ReactNode } from 'react'
import { MotionConfig } from 'motion/react'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { readStore, STORE_KEYS, writeStore } from '../lib/storage'
import { SettingsContext } from './settings'

/**
 * App-wide settings. Reduced motion is on when the OS asks for it or the user turns on the
 * in-app toggle (saved in localStorage). It is mirrored to `<html data-reduced-motion>`, which
 * global.css uses to switch off every transition and smooth scrolling.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const systemReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [reducedMotionToggle, setReducedMotionToggle] = useState(
    () => readStore(STORE_KEYS.reducedMotion) === 'true',
  )
  const reducedMotion = systemReducedMotion || reducedMotionToggle

  useEffect(() => {
    writeStore(STORE_KEYS.reducedMotion, String(reducedMotionToggle))
  }, [reducedMotionToggle])

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(reducedMotion)
  }, [reducedMotion])

  const value = { reducedMotion, systemReducedMotion, reducedMotionToggle, setReducedMotionToggle }

  return (
    <SettingsContext.Provider value={value}>
      <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'}>{children}</MotionConfig>
    </SettingsContext.Provider>
  )
}
