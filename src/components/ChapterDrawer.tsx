import { useEffect, useRef } from 'react'
import { ChapterNav, ChapterProgress } from './ChapterNav'

export interface ChapterDrawerProps {
  open: boolean
  onClose: () => void
  current: number
}

/**
 * Chapter drawer for < 1024px (opened from "NN/10" in MobileBar or the top bar). Not drawn in
 * the design: it reuses the sidebar list at full width with 44px items.
 */
export function ChapterDrawer({ open, onClose, current }: ChapterDrawerProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal?.()
    if (!open && d.open) d.close?.()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      aria-label="Chapters"
      className="m-0 mr-auto h-dvh max-h-none w-[min(360px,88vw)] max-w-none border-0 border-r border-divider bg-bg p-0 text-text-strong backdrop:bg-black/50"
    >
      <div className="flex h-full flex-col gap-3.5 overflow-y-auto px-3 pt-4 pb-6">
        <div className="flex items-center justify-between pl-2">
          <span className="text-sm font-semibold text-text-heading">React Internal</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chapters"
            className="flex size-11 items-center justify-center rounded-button text-text-secondary hover:bg-control"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
              <path d="M2 2 L10 10 M10 2 L2 10" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </button>
        </div>
        <ChapterProgress current={current} />
        <ChapterNav current={current} onNavigate={onClose} touch />
      </div>
    </dialog>
  )
}
