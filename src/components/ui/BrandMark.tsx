import { C } from '../../sim/colors'

/** 2×2 grid of phase squares in trigger, render, commit, reconcile order. */
export function BrandMark({ size = 7 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="grid flex-none gap-0.5"
      style={{ gridTemplateColumns: `${size}px ${size}px` }}
    >
      {[C.trigger, C.render, C.commit, C.reconcile].map((c) => (
        <span key={c} className="rounded-[2px]" style={{ width: size, height: size, background: c }} />
      ))}
    </span>
  )
}
