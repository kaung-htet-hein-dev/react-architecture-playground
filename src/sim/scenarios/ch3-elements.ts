import { h, isElement, typeName, type Child, type Element } from '../model'

/**
 * Chapter 3 · UI as a function of state. The objects pane is not a template: Counter is
 * rendered with the model's `h()` (our `jsx()`), and the element tree it returns is printed
 * the way React 19 stores it.
 */
export const CH3_JSX = 'function Counter({ count }) {\n  return (\n    <div>\n      <button>+1</button>\n      <p>Count: {count}</p>\n    </div>\n  );\n}'

export const CH3_COMPILED =
  "import { jsx, jsxs } from 'react/jsx-runtime';\n\nfunction Counter({ count }) {\n  return jsxs('div', {\n    children: [\n      jsx('button', { children: '+1' }),\n      jsxs('p', { children: ['Count: ', count] }),\n    ],\n  });\n}"

/** Line of the objects pane that holds `count`, for the inline note. */
export const CH3_COUNT_LINE = 8

/** Counter, compiled: what `jsxs('div', …)` returns for a given count. */
export function counterElement(count: number): Element {
  return h('div', null, h('button', null, '+1'), h('p', null, 'Count: ', count))
}

const literal = (c: Child): string => {
  if (typeof c === 'string') return `'${c.replace(/'/g, "\\'")}'`
  if (typeof c === 'number' || typeof c === 'boolean') return String(c)
  if (c == null) return 'null'
  if (Array.isArray(c)) return `[${(c as readonly Child[]).map(literal).join(', ')}]`
  return inline(c as Element)
}

const inline = (el: Element) => `{ type: '${typeName(el.type)}', props: { children: ${literal(el.props.children as Child)} } }`

/** The element tree as the objects pane prints it (React 19's `$$typeof` on the root). */
export function formatElement(el: Element, call: string): string {
  const kids = el.props.children
  const list = (Array.isArray(kids) ? kids : [kids]) as readonly Child[]
  const children = list.map((c) => `      ${isElement(c) ? inline(c) : literal(c)},`).join('\n')
  return [
    `// ${call} returns:`,
    '{',
    "  $$typeof: Symbol.for('react.transitional.element'),",
    `  type: '${typeName(el.type)}',`,
    '  props: {',
    '    children: [',
    children,
    '    ],',
    '  },',
    '}',
  ].join('\n')
}

/** Objects pane source for `Counter({ count })`. */
export const ch3Objects = (count: number) => formatElement(counterElement(count), `Counter({ count: ${count} })`)
