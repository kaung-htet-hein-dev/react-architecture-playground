import { createContext, useContext, useEffect } from 'react'
import type { Phase } from '../sim/types'

/**
 * Chapter 1's loop indicator follows the hero simulation's current phase (R-G4). The Course
 * page provides the setter; the chapter 1 simulation reports its phases with
 * `useReportHeroPhases`.
 */
export const HeroPhaseContext = createContext<(phases: readonly Phase[]) => void>(() => {})

/** Report the hero simulation's current phases to the top bar. */
export function useReportHeroPhases(phases: readonly Phase[]) {
  const set = useContext(HeroPhaseContext)
  const key = phases.join(',')
  useEffect(() => {
    set(key ? (key.split(',') as Phase[]) : [])
  }, [set, key])
}
