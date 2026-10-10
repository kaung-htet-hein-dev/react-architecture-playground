/**
 * Elements: the plain objects a render returns. `h()` plays the role of `jsx()`; components,
 * `memo` and contexts are tagged objects so the model can tell them apart.
 */

export type Props = Record<string, unknown> & { children?: Child }

/** A function component. `render` uses method syntax so typed props stay assignable. */
export interface ComponentType<P = Props> {
  readonly $$kind: 'component'
  readonly name: string
  render(props: P): Child
  /** Set by `memo()`: skip a parent-caused render when this returns true. */
  readonly compare?: (prev: P, next: P) => boolean
}

export interface ContextType<T = unknown> {
  readonly $$kind: 'context'
  readonly name: string
  readonly defaultValue: T
  readonly Provider: ProviderType<T>
}

export interface ProviderType<T = unknown> {
  readonly $$kind: 'provider'
  readonly name: string
  readonly context: ContextType<T>
}

export const Fragment = Symbol.for('model.fragment')

export type ElementType = string | ComponentType<never> | ProviderType<never> | typeof Fragment

export interface Element {
  readonly $$typeof: 'element'
  readonly type: ElementType
  readonly key: string | null
  readonly props: Props
  /** Stable node id for tree snapshots (`$id` prop). */
  readonly nodeId: string | null
}

export type Child = Element | string | number | boolean | null | undefined | readonly Child[]

/** Props every element accepts besides its own. */
export interface ElementExtras {
  key?: string | number | null
  /** Tree-snapshot id for this node, e.g. `'counter'`. Not passed to the component. */
  $id?: string
}

type HostProps = Record<string, unknown> & ElementExtras

export function h(type: string | typeof Fragment, props?: HostProps | null, ...children: Child[]): Element
export function h<P>(type: ComponentType<P>, props?: (P & ElementExtras) | null, ...children: Child[]): Element
export function h<T>(type: ProviderType<T>, props: { value: T } & ElementExtras, ...children: Child[]): Element
/**
 * `jsx()` for the model: `h('p', null, 'Count: ', count)`, `h(Row, { key: id, label })`.
 * Children become `props.children` (one child as itself, several as an array).
 */
export function h(type: unknown, props?: object | null, ...children: Child[]): Element {
  const { key, $id, ...rest } = (props ?? {}) as Record<string, unknown> & ElementExtras
  const p: Props = { ...rest }
  if (children.length === 1) p.children = children[0]
  else if (children.length > 1) p.children = children
  return {
    $$typeof: 'element',
    type: type as ElementType,
    key: key == null ? null : String(key),
    props: p,
    nodeId: $id ?? null,
  }
}

/** Declare a function component: `component('Counter', () => { … })`. */
export function component<P = Props>(name: string, render: (props: P) => Child): ComponentType<P> {
  return { $$kind: 'component', name, render }
}

/** React's shallowEqual: same keys, and every value passes Object.is. */
export function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false
  const ka = Object.keys(a)
  const kb = Object.keys(b)
  if (ka.length !== kb.length) return false
  const ra = a as Record<string, unknown>
  const rb = b as Record<string, unknown>
  return ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && Object.is(ra[k], rb[k]))
}

/** `memo(Component)`: skips parent-caused renders when every prop passes Object.is. */
export function memo<P>(c: ComponentType<P>, compare: (prev: P, next: P) => boolean = shallowEqual): ComponentType<P> {
  return { ...c, compare }
}

export function createContext<T>(defaultValue: T, name = 'Context'): ContextType<T> {
  const ctx = { $$kind: 'context', name, defaultValue } as { -readonly [K in keyof ContextType<T>]: ContextType<T>[K] }
  ctx.Provider = { $$kind: 'provider', name: `${name}.Provider`, context: ctx }
  return ctx
}

export const isElement = (v: unknown): v is Element =>
  typeof v === 'object' && v !== null && (v as Element).$$typeof === 'element'

export const isComponentType = (t: unknown): t is ComponentType<Props> =>
  typeof t === 'object' && t !== null && (t as ComponentType).$$kind === 'component'

export const isProviderType = (t: unknown): t is ProviderType<unknown> =>
  typeof t === 'object' && t !== null && (t as ProviderType).$$kind === 'provider'

/** Display name of an element type: `div`, `Counter`, `Theme.Provider`, `Fragment`. */
export function typeName(t: ElementType | null): string {
  if (t === null) return 'HostRoot'
  if (typeof t === 'string') return t
  if (t === Fragment) return 'Fragment'
  return (t as { name: string }).name
}
