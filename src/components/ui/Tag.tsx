import type { ReactNode } from 'react'
import { alpha, C, toneColor } from '../../sim/colors'
import type { Tone } from '../../sim/types'

export interface TagProps {
  children: ReactNode
  /** Color. `muted` is the grey used for SKIPPED. */
  tone?: Tone | 'muted'
  /**
   * tint: 12% fill, no border (lane tags) · outline: solid border + 16% fill (RENDERED) ·
   * dashed: dashed border, no fill (SKIPPED)
   */
  variant?: 'tint' | 'outline' | 'dashed'
  className?: string
  title?: string
}

/** Mono 10px uppercase-ready tag, radius 4. */
export function Tag({ children, tone = 'muted', variant = 'outline', className = '', title }: TagProps) {
  const c = tone === 'muted' ? C.nodeSkipFg : toneColor(tone)
  const style =
    variant === 'tint'
      ? { background: alpha(c, 12), color: c, padding: '3px 6px' }
      : variant === 'dashed'
        ? { border: `1px dashed ${c}`, color: c, padding: '4px 7px' }
        : { border: `1px solid ${c}`, background: alpha(c, 16), color: c, padding: '4px 7px' }
  return (
    <span
      title={title}
      className={`inline-flex flex-none items-center rounded-tag font-mono text-[10px] leading-none font-medium tracking-[0.04em] whitespace-nowrap ${className}`}
      style={style}
    >
      {children}
    </span>
  )
}
