import { describe, expect, it } from 'vitest'
import {
  component,
  createContext,
  createRoot,
  domOpsOf,
  eventsOf,
  h,
  memo,
  renderOrder,
  serializeDom,
  startTransition,
  summarizePass,
  toTreeNodes,
  TransitionLane,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  useTransition,
  type ModelEvent,
  type SetState,
} from '.'

const counterApp = () => {
  const Header = component('Header', () => h('h1', null, 'Counter'))
  const Counter = component('Counter', () => {
    const [count, setCount] = useState(0, 'count')
    return h('div', null, h('button', { $id: 'button', onClick: () => setCount(count + 1) }, '+1'), h('p', { $id: 'p' }, 'Count: ', count))
  })
  const App = component('App', () => [h(Header, { $id: 'header' }), h(Counter, { $id: 'counter' })])
  return h(App, { $id: 'app' })
}

describe('mount and update', () => {
  it('mounts with one insertion of the whole subtree', () => {
    const root = createRoot(counterApp())
    const ev = root.mount()
    expect(serializeDom(root.container)).toBe('<h1>Counter</h1><div><button>+1</button><p>Count: 0</p></div>')
    const writes = domOpsOf(ev).filter((o) => o.kind === 'append' || o.kind === 'insert')
    expect(writes.map((o) => o.target)).toEqual(['h1', 'div'])
  })

  it('a click re-renders only Counter and writes one text node', () => {
    const root = createRoot(counterApp())
    root.mount()
    const click = root.click('button')
    expect(eventsOf(click, 'update-queued')[0]).toMatchObject({ component: 'Counter', lane: 'SyncLane', text: 'setCount(1)' })
    const ev = root.flush()
    expect(renderOrder(ev)).toEqual(['counter'])
    const ops = domOpsOf(ev)
    expect(ops).toHaveLength(1)
    expect(ops[0]).toMatchObject({ kind: 'setText', nodeId: 'p', value: '1', text: 'p.childNodes[1].nodeValue = "1"' })
    expect(root.text('p')).toBe('Count: 1')
    const bail = eventsOf(ev, 'bailout')
    expect(bail.find((b) => b.fiberId === 'header')).toMatchObject({ reason: 'no-work', subtree: true })
    expect(ev.findIndex((e) => e.type === 'root-swap')).toBeLessThan(ev.findIndex((e) => e.type === 'paint'))
  })

  it('event handlers never cause DOM writes', () => {
    const root = createRoot(counterApp())
    root.mount()
    root.click('button')
    const ev = root.flush()
    expect(domOpsOf(ev).some((o) => o.target === 'button')).toBe(false)
  })

  it('keeps the alternate pair: current and wip swap on commit', () => {
    const root = createRoot(counterApp())
    root.mount()
    const before = root.current
    root.click('button')
    root.render()
    expect(root.wip).not.toBeNull()
    expect(root.wip!.alternate).toBe(before)
    root.commit()
    expect(root.current).not.toBe(before)
    expect(root.current.alternate).toBe(before)
  })
})

describe('update queue', () => {
  it('batches three setState calls into one render (count 2)', () => {
    const C = component('Counter', () => {
      const [count, setCount] = useState(0, 'count')
      const click = () => {
        setCount(count + 1, 'setCount(0 + 1)')
        setCount(count + 1, 'setCount(0 + 1)')
        setCount((c) => c + 1, 'setCount(c => c + 1)')
      }
      return h('button', { $id: 'button', onClick: click }, 'Count: ', count)
    })
    const root = createRoot(h(C, { $id: 'counter' }))
    root.mount()
    root.click('button')
    expect(root.updates.map((u) => u.status)).toEqual(['waiting', 'waiting', 'waiting'])
    const ev = root.flush()
    expect(eventsOf(ev, 'render')).toHaveLength(1)
    expect(eventsOf(ev, 'update-processed').map((e) => e.result)).toEqual([1, 1, 2])
    expect(domOpsOf(ev)).toHaveLength(1)
    expect(root.text('button')).toBe('Count: 2')
    expect(root.updates.every((u) => u.status === 'cleared')).toBe(true)
  })

  it('setting the same state bails out eagerly', () => {
    let set: SetState<number> = () => {}
    const C = component('C', () => {
      const [n, setN] = useState(5)
      set = setN
      return h('p', null, n)
    })
    const root = createRoot(h(C))
    root.mount()
    const ev = root.act(() => set(5))
    expect(eventsOf(ev, 'update-bailout')).toHaveLength(1)
    expect(root.hasPendingWork()).toBe(false)
  })

  it('a sync update interrupts a transition and the transition replays on top (rebasing)', () => {
    let setText: SetState<string> = () => {}
    let start: (fn: () => void) => void = () => {}
    let setQuery: SetState<string> = () => {}
    const List = component('List', (p: { q: string }) => h('ul', null, p.q))
    const App = component('App', () => {
      const [text, set] = useState('', 'text')
      const [query, setQ] = useState('', 'query')
      setQuery = setQ
      const [, startT] = useTransition()
      setText = set
      start = (fn) => startT(fn)
      return h('div', null, h('input', { value: text }), h(List, { q: query }), h('i', null, query))
    })
    const root = createRoot(h(App, { $id: 'app' }))
    root.mount()
    root.event('type r', () => {
      setText('r')
      start(() => setQuery('r'))
    })
    // Sync render first: the transition update is skipped.
    root.render()
    root.commit()
    expect(root.dom('app/div/input')?.attrs.value).toBe('r')
    expect(root.text('app/div/i#2')).toBe('')
    expect(root.pendingLanes & TransitionLane).toBeTruthy()
    // Transition render yields, then a keystroke arrives.
    const first = root.render({ budget: 2 })
    expect(first.status).toBe('yielded')
    root.event('type e', () => {
      setText('re')
      startTransition(() => setQuery('re'))
    })
    const urgent = root.render()
    expect(eventsOf(urgent.events, 'interrupt')).toHaveLength(1)
    root.commit()
    expect(root.dom('app/div/input')?.attrs.value).toBe('re')
    root.flush()
    expect(root.text('app/div/i#2')).toBe('re')
  })
})

describe('bailouts and context', () => {
  const build = (opts: { memo: boolean; newObj: boolean; ctx: boolean }) => {
    const Theme = createContext({ dark: true }, 'Theme')
    let setMain: SetState<number> = () => {}
    const Nav = component('Nav', () => h('nav', null))
    const AvatarBase = component('Avatar', () => {
      if (opts.ctx) useContext(Theme)
      return h('img', null)
    })
    const SidebarBase = component<{ style?: object }>('Sidebar', () => [h(Nav, { $id: 'nav' }), h(AvatarBase, { $id: 'avatar' })])
    const Sidebar = opts.memo ? memo(SidebarBase) : SidebarBase
    const Post = component('Post', () => h('article', null))
    const Feed = component('Feed', () => [h(Post, { key: 1 }), h(Post, { key: 2 }), h(Post, { key: 3 })])
    const Main = component('Main', () => {
      const [n, set] = useState(0)
      setMain = set
      const sidebar = opts.newObj ? h(Sidebar, { $id: 'sidebar', style: { gap: 8 } }) : h(Sidebar, { $id: 'sidebar' })
      return h(Theme.Provider, { value: { dark: n % 2 === 0 } }, sidebar, h(Feed, { $id: 'feed' }))
    })
    const Header = component('Header', () => h('header', null))
    const App = component('App', () => [h(Header, { $id: 'header' }), h(Main, { $id: 'main' })])
    const root = createRoot(h(App, { $id: 'app' }))
    root.mount()
    return { root, bump: () => root.act(() => setMain(1)) }
  }

  it('without memo the whole subtree renders, ancestors and siblings do not', () => {
    const { root, bump } = build({ memo: false, newObj: false, ctx: false })
    bump()
    const ev = root.flush()
    expect(renderOrder(ev)).toEqual(['main', 'sidebar', 'nav', 'avatar', 'feed', 'feed/Post[1]', 'feed/Post[2]', 'feed/Post[3]'])
  })

  it('memo skips Sidebar when props pass Object.is', () => {
    const { root, bump } = build({ memo: true, newObj: false, ctx: false })
    bump()
    const ev = root.flush()
    expect(renderOrder(ev)).not.toContain('sidebar')
    expect(summarizePass(ev).skipped).toEqual(['sidebar'])
  })

  it('a new object prop breaks memo', () => {
    const { root, bump } = build({ memo: true, newObj: true, ctx: false })
    bump()
    expect(renderOrder(root.flush())).toContain('sidebar')
  })

  it('a context consumer renders inside a memo-skipped subtree', () => {
    const { root, bump } = build({ memo: true, newObj: false, ctx: true })
    bump()
    const ev = root.flush()
    const order = renderOrder(ev)
    expect(order).not.toContain('sidebar')
    expect(order).not.toContain('nav')
    expect(order).toContain('avatar')
    expect(eventsOf(ev, 'render').find((r) => r.fiberId === 'avatar')?.reasons).toEqual(['context'])
  })

  it('tree snapshot keeps hierarchy', () => {
    const { root } = build({ memo: false, newObj: false, ctx: false })
    const nodes = toTreeNodes(root, { hosts: false })
    expect(nodes.find((n) => n.id === 'nav')?.parent).toBe('sidebar')
    expect(nodes.find((n) => n.id === 'sidebar')?.parent).toBe('main')
  })
})

describe('keyed reconciliation', () => {
  const list = (keyBy: 'index' | 'id') => {
    let setItems: SetState<{ id: number; label: string }[]> = () => {}
    const Row = component('Row', (p: { label: string }) => h('li', null, p.label, h('input', null)))
    const List = component('List', () => {
      const [items, set] = useState([
        { id: 1, label: 'Milk' },
        { id: 2, label: 'Bread' },
        { id: 3, label: 'Eggs' },
      ])
      setItems = set
      return h('ul', null, items.map((it, i) => h(Row, { key: keyBy === 'index' ? i : it.id, label: it.label })))
    })
    const root = createRoot(h(List, { $id: 'list' }))
    root.mount()
    return { root, removeFirst: () => root.act(() => setItems((xs) => xs.slice(1))), shuffle: () => root.act(() => setItems((xs) => [xs[2], xs[0], xs[1]])) }
  }

  it('index keys: remove first = 2 text writes + 1 removal, inputs stay put', () => {
    const { root, removeFirst } = list('index')
    const inputs = root.container.children[0].children.map((li) => li.children[1])
    removeFirst()
    const ops = domOpsOf(root.flush())
    expect(ops.map((o) => o.kind)).toEqual(['remove', 'setText', 'setText'])
    const ul = root.container.children[0]
    expect(ul.children.map((li) => li.children[1])).toEqual(inputs.slice(0, 2))
  })

  it('id keys: remove first = 1 removal, rows keep their inputs', () => {
    const { root, removeFirst } = list('id')
    const inputs = root.container.children[0].children.map((li) => li.children[1])
    removeFirst()
    const ops = domOpsOf(root.flush())
    expect(ops.map((o) => o.kind)).toEqual(['remove'])
    expect(root.container.children[0].children.map((li) => li.children[1])).toEqual(inputs.slice(1))
  })

  it('id keys: a shuffle moves the two rows that fell behind', () => {
    const { root, shuffle } = list('id')
    shuffle()
    const ev = root.flush()
    expect(domOpsOf(ev).map((o) => o.kind)).toEqual(['move', 'move'])
    expect(root.text()).toBe('EggsMilkBread')
  })
})

describe('effects', () => {
  it('layout runs before paint, passive after; cleanups run before effects', () => {
    let set: SetState<number> = () => {}
    const log: string[] = []
    const C = component('C', () => {
      const [n, setN] = useState(0)
      set = setN
      useLayoutEffect(() => {
        log.push(`layout ${n}`)
        return () => log.push(`layout cleanup ${n}`)
      }, [n])
      useEffect(() => {
        log.push(`passive ${n}`)
        return () => log.push(`passive cleanup ${n}`)
      }, [n])
      useEffect(() => {
        log.push('mount only')
      }, [])
      return h('p', null, n)
    })
    const root = createRoot(h(C))
    root.mount()
    expect(log).toEqual(['layout 0', 'passive 0', 'mount only'])
    log.length = 0
    root.act(() => set(1))
    const ev = root.flush()
    expect(log).toEqual(['layout cleanup 0', 'layout 1', 'passive cleanup 0', 'passive 1'])
    const kinds = ev.filter((e) => e.type === 'paint' || (e.type === 'effect' && e.action !== 'skip')).map((e: ModelEvent) => (e.type === 'effect' ? `${e.tag}:${e.action}` : e.type))
    expect(kinds).toEqual(['layout:cleanup', 'layout:run', 'paint', 'passive:cleanup', 'passive:run'])
    expect(eventsOf(ev, 'effect').filter((e) => e.action === 'skip')).toHaveLength(1)
  })

  it('setState in useEffect causes a second render after paint', () => {
    const C = component('C', () => {
      const [n, setN] = useState(0)
      useEffect(() => {
        if (n === 0) setN(1)
      }, [n])
      return h('p', null, n)
    })
    const root = createRoot(h(C, { $id: 'c' }))
    const ev = root.mount()
    expect(eventsOf(ev, 'render')).toHaveLength(2)
    expect(eventsOf(ev, 'paint')).toHaveLength(2)
    expect(eventsOf(ev, 'update-queued')[0].lane).toBe('DefaultLane')
    expect(root.text()).toBe('1')
  })

  it('setState in useLayoutEffect re-renders before paint', () => {
    const C = component('C', () => {
      const [n, setN] = useState(0)
      useLayoutEffect(() => {
        if (n === 0) setN(1)
      }, [n])
      return h('p', null, n)
    })
    const root = createRoot(h(C))
    const ev = root.mount()
    expect(eventsOf(ev, 'paint')).toHaveLength(1)
    const firstPaint = ev.findIndex((e) => e.type === 'paint')
    expect(eventsOf(ev.slice(0, firstPaint), 'render')).toHaveLength(2)
  })

  it('unmount runs layout cleanup in commit and passive cleanup later', () => {
    let setShow: SetState<boolean> = () => {}
    const Child = component('Child', () => {
      useLayoutEffect(() => () => {}, [], 'layout')
      useEffect(() => () => {}, [], 'passive')
      return h('span', null)
    })
    const P = component('P', () => {
      const [show, set] = useState(true)
      setShow = set
      return h('div', null, show ? h(Child) : null)
    })
    const root = createRoot(h(P))
    root.mount()
    root.act(() => setShow(false))
    const ev = root.flush()
    const seq = ev.filter((e) => e.type === 'dom' || e.type === 'effect' || e.type === 'paint').map((e) => (e.type === 'effect' ? `${e.timing}:${e.label}` : e.type))
    expect(seq).toEqual(['mutation:layout', 'dom', 'paint', 'passive:passive'])
  })
})

describe('errors', () => {
  it('setState during render: too many re-renders after 25 renders', () => {
    const C = component('Counter', () => {
      const [count, setCount] = useState(0, 'count')
      setCount(count + 1)
      return h('p', null, count)
    })
    const root = createRoot(h(C, { $id: 'counter' }))
    const ev = root.mount()
    expect(eventsOf(ev, 'render')).toHaveLength(25)
    expect(eventsOf(ev, 'error')[0]).toMatchObject({ fiberId: 'counter', renders: 25, message: 'Too many re-renders. React limits the number of renders to prevent an infinite loop.' })
    expect(domOpsOf(ev)).toHaveLength(0)
  })

  it('a conditional hook warns about order and then throws', () => {
    let setAdmin: SetState<boolean> = () => {}
    const Profile = component('Profile', (p: { isAdmin: boolean }) => {
      useState('Ada')
      if (p.isAdmin) useEffect(() => {}, [])
      useState('dark')
      return h('div', null)
    })
    const App = component('App', () => {
      const [a, set] = useState(true)
      setAdmin = set
      return h(Profile, { $id: 'profile', isAdmin: a })
    })
    const root = createRoot(h(App))
    root.mount()
    root.act(() => setAdmin(false))
    const ev = root.flush()
    expect(eventsOf(ev, 'hook-order-warning')[0]).toMatchObject({ previous: ['useState', 'useEffect', 'useState'], next: ['useState', 'useState'] })
    expect(eventsOf(ev, 'error')[0].message).toMatch(/^Should have a queue/)
  })
})
