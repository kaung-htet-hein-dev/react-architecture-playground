import { ChapterNav, ChapterProgress } from './ChapterNav'

/**
 * Desktop chapter sidebar (≥ 1024px): 256px, borderless, sticky under the top bar with the list
 * centered vertically; scrolls on its own if the viewport is short.
 */
export function ChapterSidebar({ current }: { current: number }) {
  return (
    <aside className="sticky top-topbar flex h-[calc(100vh-var(--spacing-topbar))] w-sidebar flex-none flex-col justify-center-safe gap-3 overflow-y-auto py-8 pr-3 pl-4 max-lg:hidden">
      <ChapterProgress current={current} />
      <ChapterNav current={current} />
    </aside>
  )
}
