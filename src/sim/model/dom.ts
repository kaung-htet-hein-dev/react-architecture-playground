/**
 * A tiny stand-in for the browser DOM. Host fibers own these nodes (`fiber.stateNode`); the
 * commit phase is the only code that mutates the attached tree, and every mutation is
 * recorded as a DomOp.
 */
export interface DomNode {
  kind: 'element' | 'text' | 'container'
  /** Tag name for elements, `#text` for text nodes, `#root` for the container. */
  tag: string
  /** Attributes and properties (no event handlers: React delegates those to the root). */
  attrs: Record<string, string>
  /** Text nodes: nodeValue. Elements: textContent set directly (single text child). */
  text: string | null
  children: DomNode[]
  parent: DomNode | null
  /** Short label used in DomOp text, e.g. `li[key=2]`. */
  label: string
}

export function createDomNode(kind: DomNode['kind'], tag: string, label = tag): DomNode {
  return { kind, tag, attrs: {}, text: null, children: [], parent: null, label }
}

export function domRemove(node: DomNode) {
  const p = node.parent
  if (!p) return
  p.children.splice(p.children.indexOf(node), 1)
  node.parent = null
}

/** appendChild / insertBefore semantics: a node already attached is moved. */
export function domInsert(parent: DomNode, node: DomNode, before: DomNode | null) {
  domRemove(node)
  const i = before ? parent.children.indexOf(before) : -1
  if (i < 0) parent.children.push(node)
  else parent.children.splice(i, 0, node)
  node.parent = parent
}

/** textContent of a node, like the DOM property. */
export function textContent(node: DomNode): string {
  if (node.kind === 'text') return node.text ?? ''
  if (node.text != null) return node.text
  return node.children.map(textContent).join('')
}

/** Depth-first search of the attached DOM. */
export function queryDom(node: DomNode, pred: (n: DomNode) => boolean): DomNode | null {
  if (pred(node)) return node
  for (const c of node.children) {
    const hit = queryDom(c, pred)
    if (hit) return hit
  }
  return null
}

export function queryAllDom(node: DomNode, pred: (n: DomNode) => boolean, out: DomNode[] = []): DomNode[] {
  if (pred(node)) out.push(node)
  for (const c of node.children) queryAllDom(c, pred, out)
  return out
}

/** `<div><p>Count: 1</p></div>`-style serialization, for tests and debugging. */
export function serializeDom(node: DomNode): string {
  if (node.kind === 'text') return node.text ?? ''
  const inner = node.text ?? node.children.map(serializeDom).join('')
  if (node.kind === 'container') return inner
  const attrs = Object.entries(node.attrs)
    .map(([k, v]) => ` ${k}="${v}"`)
    .join('')
  return `<${node.tag}${attrs}>${inner}</${node.tag}>`
}
