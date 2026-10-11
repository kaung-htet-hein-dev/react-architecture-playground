import type { ReactNode } from 'react'

export interface PanelHeaderProps {
  /** Mono label on the left. */
  label: ReactNode
  /** Meta on the right (e.g. phase label, "1 DOM op"). */
  meta?: ReactNode
  /** Color for the meta text (phase color while a step is active). */
  metaColor?: string
  /** 40 (panel) · 36 (sub-section) · 34 (log) · 30 (compact) */
  height?: 40 | 36 | 34 | 30
  /** Draw a top border too (headers in the middle of a panel). */
  borderTop?: boolean
  className?: string
}

/** 40px panel header: mono label left, meta right, divider below. */
export function PanelHeader({ label, meta, metaColor, height = 40, borderTop, className = '' }: PanelHeaderProps) {
  return (
    <div
      className={`panel-header flex-none ${borderTop ? 'border-t border-t-divider' : ''} ${className}`}
      style={{ height, fontSize: height === 30 ? 12 : undefined, padding: height === 30 ? '0 12px' : undefined }}
    >
      <span className="min-w-0 truncate">{label}</span>
      {meta != null && meta !== '' && (
        <span className="flex-none" style={{ color: metaColor }}>
          {meta}
        </span>
      )}
    </div>
  )
}
