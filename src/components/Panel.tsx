import type { ReactNode } from 'react'
import { PanelHeader, type PanelHeaderProps } from './PanelHeader'

export interface PanelProps {
  /** Header label; omit for a headerless panel. */
  title?: ReactNode
  meta?: ReactNode
  metaColor?: string
  headerHeight?: PanelHeaderProps['height']
  children?: ReactNode
  className?: string
  /** Section element and accessible name, for panels that are landmarks. */
  as?: 'div' | 'section'
  ariaLabel?: string
  id?: string
}

/** Panel surface: `--panel` fill, 1px border, radius 10, optional 40px header. */
export function Panel({ title, meta, metaColor, headerHeight, children, className = '', as: El = 'div', ariaLabel, id }: PanelProps) {
  return (
    <El id={id} role={El === 'div' && ariaLabel ? 'group' : undefined} aria-label={ariaLabel} className={`panel flex min-w-0 flex-col ${className}`}>
      {title != null && <PanelHeader label={title} meta={meta} metaColor={metaColor} height={headerHeight} />}
      {children}
    </El>
  )
}
