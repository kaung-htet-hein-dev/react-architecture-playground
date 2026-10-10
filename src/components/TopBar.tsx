import { Link } from 'react-router'
import { pad2, CHAPTER_COUNT } from '../app/chapters'
import type { Phase } from '../sim/types'
import { LoopIndicator } from './LoopIndicator'
import { BrandMark } from './ui/BrandMark'

export interface TopBarProps {
  /** Phases lit in the loop indicator. */
  phases: readonly Phase[]
  /** Show the "Reduced motion" chip. */
  reducedMotion: boolean
  /** Current chapter, for the chapters button shown below 1024px. */
  current: number
  /** Opens the chapter drawer (769–1023px, where the sidebar is hidden). */
  onOpenChapters: () => void
}

/**
 * Sticky 56px guide top bar: brand, loop indicator, reduced-motion chip, Playground button.
 * Hidden at ≤ 768px, where MobileBar replaces it.
 */
export function TopBar({ phases, reducedMotion, current, onOpenChapters }: TopBarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-topbar items-center gap-5 border-b border-divider bg-topbar px-6 backdrop-blur-md max-md:hidden">
      <a href="#ch1" className="flex flex-none items-center gap-2.5 text-text-heading hover:text-text-heading">
        <BrandMark />
        <span className="text-sm font-semibold tracking-[-0.01em] whitespace-nowrap max-[900px]:sr-only">Render, Commit, Repeat</span>
      </a>
      <button
        type="button"
        onClick={onOpenChapters}
        className="flex h-8 flex-none items-center gap-1.5 rounded-control border border-border-strong px-2.5 font-mono text-[11.5px] font-medium text-text-secondary hover:bg-control lg:hidden"
        aria-label={`Chapters, ${current} of ${CHAPTER_COUNT}`}
      >
        {pad2(current)} / {CHAPTER_COUNT}
        <span aria-hidden>▾</span>
      </button>
      <span className="flex-1" />
      <LoopIndicator lit={phases} />
      {reducedMotion && (
        <span className="flex-none rounded-control border border-border-strong px-[9px] py-[7px] font-mono text-[11px] leading-none font-medium text-text-secondary max-lg:hidden">
          Reduced motion
        </span>
      )}
      <Link
        to="/playground"
        className="flex h-8 flex-none items-center gap-2 rounded-[7px] bg-accent px-3.5 text-[13px] font-semibold text-accent-ink hover:text-accent-ink hover:brightness-105"
      >
        Playground<span className="font-mono font-medium">→</span>
      </Link>
    </header>
  )
}
