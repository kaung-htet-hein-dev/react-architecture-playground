import { useEffect, type ReactNode } from 'react'
import { MotionConfig } from 'motion/react'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { SettingsContext } from './settings'

/**
 * App-wide settings. Reduced motion follows the OS `prefers-reduced-motion` setting. It is
 * mirrored to `<html data-reduced-motion>`, which global.css uses to switch off every
 * transition and smooth scrolling.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(reducedMotion)
  }, [reducedMotion])

  return (
    <SettingsContext.Provider value={{ reducedMotion }}>
      <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'}>{children}</MotionConfig>
    </SettingsContext.Provider>
  )
}
