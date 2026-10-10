import { ChapterNav, ChapterProgress, ReducedMotionToggle } from './ChapterNav'

/**
 * Desktop chapter sidebar (≥ 1024px): 232px, sticky under the top bar, scrolls on its own.
 */
export function ChapterSidebar({ current }: { current: number }) {
  return (
    <aside className="sticky top-topbar flex h-[calc(100vh-var(--spacing-topbar))] w-sidebar flex-none flex-col gap-3.5 overflow-y-auto border-r border-divider pt-6 pr-3 pb-6 pl-4 max-lg:hidden">
      <ChapterProgress current={current} />
      <ChapterNav current={current} />
      <div className="mt-auto pt-4">
        <ReducedMotionToggle />
      </div>
    </aside>
  )
}
