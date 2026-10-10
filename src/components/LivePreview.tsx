import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { alpha, C } from '../sim/colors'

export interface LivePreviewProps {
  /** Address bar text (default `localhost:5173`). Ignored when `tabTitle` is set. */
  url?: string
  /** Show a browser tab with this title (document.title) instead of the address. */
  tabTitle?: string
  /** Uncaught error overlay instead of the app. */
  error?: { title: string; message: string }
  /** The rendered app. */
  children?: ReactNode
  /** Minimum body height (default 84). */
  minHeight?: number
  className?: string
}

/**
 * Light "browser" frame for the rendered app (README "Live preview"): radius 8, 26px chrome bar
 * with three dots and a mono URL, or a 28px bar with a tab title.
 */
export function LivePreview({ url = 'localhost:5173', tabTitle, error, children, minHeight = 84, className = '' }: LivePreviewProps) {
  return (
    <div className={`overflow-hidden rounded-button bg-preview text-preview-ink ${className}`} role="region" aria-label="Live preview">
      <div
        className="flex items-center gap-[5px] bg-preview-chrome px-2.5"
        style={{ height: tabTitle ? 28 : 26, gap: tabTitle ? 8 : 5 }}
        aria-hidden
      >
        {[0, 1, 2].slice(0, tabTitle ? 2 : 3).map((i) => (
          <span key={i} className="size-[7px] rounded-full bg-preview-dot" />
        ))}
        {tabTitle ? (
          <span className="ml-1.5 flex h-5 items-center rounded-t-[5px] bg-preview px-2.5 text-[11px] text-preview-tab">{tabTitle}</span>
        ) : (
          <span className="ml-2 font-mono text-[10.5px] text-preview-url">{url}</span>
        )}
      </div>
      {error ? (
        <div
          role="alert"
          className="flex flex-col justify-center gap-1.5 bg-preview-error-bg px-[18px] py-3 text-preview-error-ink"
          style={{ minHeight }}
        >
          <span className="font-mono text-xs font-semibold">{error.title}</span>
          <span className="font-mono text-xs leading-[1.45]">{error.message}</span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-4 px-[22px] py-3" style={{ minHeight }}>
          {children}
        </div>
      )}
    </div>
  )
}

/** A value in the preview; `highlight` marks it while its DOM write is the current step. */
export function PreviewValue({ children, highlight }: { children: ReactNode; highlight?: boolean }) {
  return (
    <span
      className="rounded-tag px-1 py-px transition-[background-color,box-shadow] duration-150"
      style={{
        background: highlight ? alpha(C.commit, 22) : 'transparent',
        boxShadow: highlight ? `0 0 0 1px ${alpha(C.commit, 90)}` : 'none',
      }}
    >
      {children}
    </span>
  )
}

/** Dark button inside the preview. Clicking it acts as a trigger. */
export function PreviewButton({
  ring,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { ring?: string }) {
  return (
    <button
      type="button"
      {...rest}
      className={`rounded-[7px] border-0 bg-preview-ink px-4 py-[9px] text-sm font-semibold text-preview hover:opacity-90 focus-visible:outline-preview-ink ${className}`}
      style={{ boxShadow: ring ? `0 0 0 3px ${ring}` : undefined, ...rest.style }}
    />
  )
}
