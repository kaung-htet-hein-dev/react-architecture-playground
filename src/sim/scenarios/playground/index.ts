import { conditionalHook } from './conditional-hook'
import { counterClick } from './counter-click'
import { keys } from './keys'
import { layoutVsPassive } from './layout-vs-passive'
import { memoObjectProp } from './memo-object-prop'
import { setStateInEffect } from './setstate-in-effect'
import { staleClosure } from './stale-closure'
import { threeSetState } from './three-setstate'
import { useOptimisticPreset } from './use-optimistic'
import { useTransitionPreset } from './use-transition'
import type { PresetDef } from './shared'

export * from './shared'

/** The ten Playground presets, in the order of REQUIREMENTS R-P8. */
export const PRESETS: readonly PresetDef[] = [
  counterClick,
  threeSetState,
  setStateInEffect,
  keys,
  memoObjectProp,
  layoutVsPassive,
  staleClosure,
  useTransitionPreset,
  useOptimisticPreset,
  conditionalHook,
]

/** The preset the Playground opens with (the one design/Playground.dc.html specifies). */
export const DEFAULT_PRESET = threeSetState.id

export const presetById = (id: string | null | undefined): PresetDef | undefined => PRESETS.find((p) => p.id === id)
