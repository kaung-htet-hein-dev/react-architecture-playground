import { Link } from 'react-router'
import { pad2, CHAPTER_COUNT } from '../app/chapters'
import { BrandMark } from './ui/BrandMark'

export interface TopBarProps {
  /** Show the "Reduced motion" chip. */
  reducedMotion: boolean
  /** Current chapter, for the chapters button shown below 1024px. */
  current: number
  /** Opens the chapter drawer (769–1023px, where the sidebar is hidden). */
  onOpenChapters: () => void
}

/**
 * Sticky 60px guide top bar: brand, reduced-motion chip, Playground button.
 * Hidden at ≤ 768px, where MobileBar replaces it.
 */
export function TopBar({ reducedMotion, current, onOpenChapters }: TopBarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-topbar items-center gap-[18px] border-b border-border bg-topbar px-5 backdrop-blur-[10px] max-md:hidden">
      <a href="#intro" className="flex flex-none items-center gap-2.5 text-text-heading hover:text-text-heading">
        <BrandMark />
        <span className="text-[17px] leading-none font-bold whitespace-nowrap max-[900px]:sr-only">React Internal</span>
      </a>
      <button
        type="button"
        onClick={onOpenChapters}
        className="flex h-[34px] flex-none items-center gap-1.5 rounded-button border border-border-strong px-3 font-mono text-xs text-text-secondary hover:bg-control lg:hidden"
        aria-label={`Chapters, ${current} of ${CHAPTER_COUNT}`}
      >
        {pad2(current)} / {CHAPTER_COUNT}
        <span aria-hidden>▾</span>
      </button>
      <span className="flex-1" />
      {reducedMotion && (
        <span className="flex-none rounded-control border border-border-strong px-[9px] py-[7px] font-mono text-[11px] leading-none font-medium text-text-secondary max-lg:hidden">
          Reduced motion
        </span>
      )}
      <Link
        to="/playground"
        className="flex h-[34px] flex-none items-center gap-2 rounded-button bg-accent px-3.5 text-[13px] leading-none font-medium text-accent-ink transition-colors hover:bg-accent-hover hover:text-accent-ink"
      >
        Playground<span className="font-mono font-medium">→</span>
      </Link>
    </header>
  )
}
