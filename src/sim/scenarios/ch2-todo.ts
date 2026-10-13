import {
  component,
  createDomNode,
  createRoot,
  domInsert,
  domOpsOf,
  h,
  serializeDom,
  useState,
  type DomNode,
  type SetState,
} from '../model'
import type { DomOp } from '../types'

/**
 * Chapter 2 · Why we need React. The same to-do app ("N left" label) built three ways; each one
 * adds one item, and we count the DOM writes it makes. Nothing here is hand-counted: the
 * vanilla version runs its own imperative code on the model DOM, the React version runs on
 * the fiber model, and "other approaches" run on a tiny fine-grained signal runtime (the model
 * Vue, Svelte, Solid and Angular signals share: a binding re-runs only where data was read).
 */
export interface Todo {
  id: number
  text: string
  done: boolean
}

export const CH2_INITIAL: readonly Todo[] = [
  { id: 1, text: 'Write the guide', done: true },
  { id: 2, text: 'Read the docs', done: false },
]

export const CH2_NEW_TODO = 'Ship it'

export interface ApproachResult {
  /** DOM writes caused by adding one item (mount excluded). */
  ops: DomOp[]
  /** The page after the add, serialized: every approach must end up with the same DOM. */
  html: string
}

export type ApproachId = 'vanilla' | 'react' | 'fineGrained'

const countLeft = (todos: readonly Todo[]) => todos.filter((t) => !t.done).length
const q = (s: string) => JSON.stringify(s)

/** A DOM wrapper that records each write as a DomOp, like the commit phase does. */
function recordingDom() {
  const ops: DomOp[] = []
  return {
    ops,
    createElement(tag: string) {
      ops.push({ kind: 'createElement', target: tag, text: `document.createElement(${q(tag)})` })
      return createDomNode('element', tag)
    },
    setText(node: DomNode, text: string) {
      node.text = text
      ops.push({ kind: 'setText', target: node.label, text: `${node.label}.textContent = ${q(text)}`, value: text })
    },
    append(parent: DomNode, node: DomNode) {
      domInsert(parent, node, null)
      ops.push({ kind: 'append', target: node.label, text: `${parent.label}.append(${node.label})` })
    },
  }
}

/** The page every approach starts from: `<ul id="list">` with the rows and `<p id="left">`. */
function staticPage(todos: readonly Todo[]) {
  const container = createDomNode('container', '#root', 'root')
  const list = createDomNode('element', 'ul', 'list')
  const left = createDomNode('element', 'p', 'left')
  for (const t of todos) {
    const li = createDomNode('element', 'li')
    li.text = t.text
    domInsert(list, li, null)
  }
  left.text = `${countLeft(todos)} left`
  domInsert(container, list, null)
  domInsert(container, left, null)
  return { container, list, left }
}

/** Vanilla JS: the design's addTodo(), run line by line against the page. */
export function vanillaAdd(initial: readonly Todo[] = CH2_INITIAL, text = CH2_NEW_TODO): ApproachResult {
  const todos = initial.map((t) => ({ ...t }))
  const { container, list, left } = staticPage(todos)
  const dom = recordingDom()
  // function addTodo(text) {
  todos.push({ id: todos.length + 1, text, done: false })
  const li = dom.createElement('li')
  dom.setText(li, text)
  dom.append(list, li)
  dom.setText(left, `${countLeft(todos)} left`)
  // }
  return { ops: dom.ops, html: serializeDom(container) }
}

/** React: TodoApp on the fiber model. Mount, then setTodos with one more item. */
export function reactAdd(initial: readonly Todo[] = CH2_INITIAL, text = CH2_NEW_TODO): ApproachResult {
  let setTodos: SetState<readonly Todo[]> = () => {}
  const TodoApp = component('TodoApp', () => {
    const [todos, set] = useState<readonly Todo[]>(initial, 'todos')
    setTodos = set
    const left = countLeft(todos)
    return [h('ul', { $id: 'list' }, todos.map((t) => h('li', { key: t.id }, t.text))), h('p', { $id: 'left' }, left, ' left')]
  })
  const root = createRoot(h(TodoApp, { $id: 'app' }))
  root.mount()
  root.event('addTodo', () => setTodos((ts) => [...ts, { id: ts.length + 1, text, done: false }]))
  const ops = domOpsOf(root.flush())
  return { ops, html: serializeDom(root.container) }
}

/**
 * Fine-grained reactivity: signals, and effects that re-run only when a signal they read
 * changes. The list binding diffs by id; the label binding writes one text node.
 */
export function fineGrainedAdd(initial: readonly Todo[] = CH2_INITIAL, text = CH2_NEW_TODO): ApproachResult {
  type Effect = () => void
  let running: Effect | null = null
  const effect = (fn: () => void) => {
    const run = () => {
      const prev = running
      running = run
      try {
        fn()
      } finally {
        running = prev
      }
    }
    run()
  }
  const signal = <T>(value: T) => {
    const subs = new Set<Effect>()
    const read = () => {
      if (running) subs.add(running)
      return value
    }
    const write = (next: T) => {
      value = next
      for (const s of [...subs]) s()
    }
    return [read, write] as const
  }

  const { container, list, left } = staticPage([])
  let dom = recordingDom()
  const [todos, setTodos] = signal<readonly Todo[]>(initial)
  const leftCount = () => countLeft(todos())

  // <For each={todos()}>: keyed by id, creates rows it hasn't seen.
  const rows = new Map<number, DomNode>()
  effect(() => {
    for (const t of todos()) {
      if (rows.has(t.id)) continue
      const li = dom.createElement('li')
      dom.setText(li, t.text)
      dom.append(list, li)
      rows.set(t.id, li)
    }
  })
  // <p>{left()} left</p>: the text binding writes only when its value changes.
  const textNode = createDomNode('text', '#text', 'left.firstChild')
  const suffix = createDomNode('text', '#text')
  suffix.text = ' left'
  left.text = null
  domInsert(left, textNode, null)
  domInsert(left, suffix, null)
  effect(() => {
    const next = String(leftCount())
    if (textNode.text === next) return
    textNode.text = next
    dom.ops.push({ kind: 'setText', target: textNode.label, text: `${textNode.label}.nodeValue = ${q(next)}`, value: next })
  })

  // Mount writes are not part of the comparison.
  dom = recordingDom()
  setTodos([...todos(), { id: todos().length + 1, text, done: false }])
  return { ops: dom.ops, html: serializeDom(container) }
}

/** All three approaches, each adding the same item to the same list. */
export function ch2Approaches(initial: readonly Todo[] = CH2_INITIAL, text = CH2_NEW_TODO): Record<ApproachId, ApproachResult> {
  return { vanilla: vanillaAdd(initial, text), react: reactAdd(initial, text), fineGrained: fineGrainedAdd(initial, text) }
}
