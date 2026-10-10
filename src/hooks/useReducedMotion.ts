import { useSettings } from '../app/settings'

/**
 * True when motion should be reduced: `prefers-reduced-motion: reduce` matches OR the in-app
 * toggle is on. When true: no autoplay, no transitions, order badges on trees.
 */
export function useReducedMotion(): boolean {
  return useSettings().reducedMotion
}
