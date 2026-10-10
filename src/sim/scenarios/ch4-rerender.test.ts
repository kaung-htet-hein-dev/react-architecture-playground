import { describe, expect, it } from 'vitest'
import type { NodeState } from '../types'
import { CH4_NODES, ch4Code, ch4Rerender, runCh4, WHY, type Ch4NodeId, type Ch4Params } from './ch4-rerender'

/**
 * Independent oracle: React's re-render rules written out by hand (design `ch4()`), not the
 * fiber model. The trigger renders; so does everything below it, except memo(Sidebar) with
 * props that pass Object.is, whose subtree is skipped — but Avatar still renders there if it
 * reads ThemeContext and Main (the provider, new value every render) rendered.
 */
const PARENT: Record<Ch4NodeId, Ch4NodeId | null> = {
  app: null,
  header: 'app',
  main: 'app',
  sidebar: 'main',
  nav: 'sidebar',
  avatar: 'sidebar',
  feed: 'main',
  p1: 'feed',
  p2: 'feed',
  p3: 'feed',
}
const kids = (id: Ch4NodeId) => CH4_NODES.filter((n) => PARENT[n] === id)

function oracle(p: Ch4Params) {
  const st: Partial<Record<Ch4NodeId, { s: NodeState; why: string }>> = {}
  const walk = (id: Ch4NodeId, why: string) => {
    st[id] = { s: 'render', why }
    for (const k of kids(id)) {
      if (k === 'sidebar' && p.memo && !p.newObj) skip(k, WHY.memoSkip)
      else walk(k, k === 'sidebar' && p.memo ? WHY.memoBroken : WHY.parent)
    }
  }
  const skip = (id: Ch4NodeId, why: string) => {
    st[id] = { s: 'skip', why }
    for (const k of kids(id)) {
      if (k === 'avatar' && p.ctx && st.main?.s === 'render') walk(k, WHY.context)
      else skip(k, WHY.parentSkipped)
    }
  }
  walk(p.trigger, WHY.state)
  return st
}

const combos: Ch4Params[] = []
for (const trigger of CH4_NODES)
  for (const memo of [false, true]) for (const newObj of [false, true]) for (const ctx of [false, true]) combos.push({ trigger, memo, newObj, ctx })

describe('ch4 re-render truth table (8 toggle combinations × 10 trigger nodes)', () => {
  it.each(combos.map((c) => [`${c.trigger} memo=${c.memo} newObj=${c.newObj} ctx=${c.ctx}`, c] as const))('%s', (_, p) => {
    const expected = oracle(p)
    const r = runCh4(p)
    for (const id of CH4_NODES) expect([id, r.states[id]]).toEqual([id, expected[id]?.s ?? 'idle'])
    expect(r.why.map((w) => [w.id, w.why])).toEqual(CH4_NODES.filter((id) => expected[id]).map((id) => [id, expected[id]!.why]))
    // Ancestors and siblings of the trigger never render.
    for (let a = PARENT[p.trigger]; a; a = PARENT[a]) expect(r.states[a]).toBe('idle')
  })
})

describe('ch4 trace', () => {
  const p: Ch4Params = { trigger: 'main', memo: true, newObj: false, ctx: true }
  const steps = ch4Rerender(p)

  it('idle + 4 steps: trigger, the trigger renders, the wave, commit', () => {
    expect(steps).toHaveLength(5)
    expect(steps.map((s) => s.phase)).toEqual(['trigger', 'trigger', 'render', 'render', 'commit'])
  })

  it('the design default: Main triggers, memo skips Sidebar, Avatar renders through context', () => {
    const last = steps[4]
    expect(last.treeNote).toBe('6 rendered · 2 skipped · 2 untouched')
    expect(last.data?.why.map((w) => `${w.label}:${w.state}`)).toEqual([
      'Main:rendered',
      'Sidebar:skipped',
      'Nav:skipped',
      'Avatar:rendered',
      'Feed:rendered',
      'Post:rendered',
      'Post:rendered',
      'Post:rendered',
    ])
    const main = last.tree.find((n) => n.id === 'main')
    expect(main).toMatchObject({ trigger: true, tag: 'setState', state: 'render', order: 1 })
    expect(last.tree.find((n) => n.id === 'sidebar')).toMatchObject({ state: 'skip', tag: 'memo' })
    expect(last.tree.find((n) => n.id === 'avatar')).toMatchObject({ state: 'render', tag: 'useContext', order: 2 })
  })

  it('renders make no DOM writes here', () => {
    expect(steps[4].data?.domOps).toBe(0)
  })

  it('the step that renders the trigger shows only the trigger', () => {
    expect(steps[2].tree.filter((n) => n.state === 'render').map((n) => n.id)).toEqual(['main'])
    expect(steps[1].tree.every((n) => n.state === 'idle')).toBe(true)
    expect(steps[0].tree.find((n) => n.id === 'main')?.selected).toBe(true)
  })

  it('the code pane rewrites itself from the toggles', () => {
    expect(ch4Code({ memo: true, newObj: false, ctx: true }).split('\n')[7]).toBe('      <Sidebar user={user} />')
    expect(ch4Code({ memo: false, newObj: true, ctx: false })).toContain('<Sidebar user={user} style={{ gap: 8 }} />')
    expect(ch4Code({ memo: false, newObj: false, ctx: false })).toContain('function Sidebar({ user }) {')
    expect(ch4Code({ memo: true, newObj: false, ctx: false })).toContain('  return <img src={user.photo} />;')
    expect(ch4Rerender({ ...p, ctx: false })[4].dimLines).toEqual([1, 5, 7, 10])
  })
})
