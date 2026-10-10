import type { SimulationApi } from './types'

/** SimControls props from a `useSimulation` result: `<SimControls {...simControlProps(sim)} />` */
export function simControlProps(sim: SimulationApi) {
  return {
    status: sim.status,
    index: sim.index,
    total: sim.total,
    phase: sim.step.phase,
    speed: sim.speed,
    caption: sim.step.caption,
    onPlay: sim.play,
    onPause: sim.pause,
    onStep: sim.stepForward,
    onBack: sim.stepBack,
    onReset: sim.reset,
    onSeek: sim.seek,
    onSpeed: sim.setSpeed,
  }
}
