import { C } from '../../sim/colors'

/** React logo (atom: three orbits and a nucleus) in the logo color, `size` px square. */
export function BrandMark({ size = 20 }: { size?: number }) {
  return (
    <svg aria-hidden viewBox="0 0 32 32" width={size} height={size} fill="none" className="flex-none">
      <g style={{ stroke: C.logo }} strokeWidth="1.7">
        <ellipse cx="16" cy="16" rx="14" ry="5.5" />
        <ellipse cx="16" cy="16" rx="14" ry="5.5" transform="rotate(60 16 16)" />
        <ellipse cx="16" cy="16" rx="14" ry="5.5" transform="rotate(120 16 16)" />
      </g>
      <circle cx="16" cy="16" r="2.2" style={{ fill: C.logo }} />
    </svg>
  )
}
