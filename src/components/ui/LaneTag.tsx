import type { Lane } from '../../sim/types'
import { Tag } from './Tag'

/**
 * Priority lane badge. Transition work is render-blue; every urgent lane (SyncLane and the
 * other non-transition lanes) is trigger-amber, the color for priority.
 */
export function LaneTag({ lane, className }: { lane: Lane; className?: string }) {
  const tone = lane === 'TransitionLane' || lane === 'RetryLane' || lane === 'IdleLane' ? 'render' : 'trigger'
  return (
    <Tag tone={tone} variant="tint" className={className}>
      {lane}
    </Tag>
  )
}
