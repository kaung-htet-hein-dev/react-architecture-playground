/**
 * Syntax tokenizer for CodePane, ported as is from design/Code.dc.html (`tok`).
 * It handles comments, editable `⟦params⟧`, strings, `=>`, JSX tags, numbers, identifiers,
 * whitespace and punctuation. Whitespace is merged into the previous token (unless that
 * token is an editable param), exactly like the original.
 */

export type TokenKind =
  | 'comment'
  | 'param'
  | 'string'
  | 'arrow'
  | 'tag'
  | 'number'
  | 'keyword'
  | 'api'
  | 'component'
  | 'ident'
  | 'space'
  | 'punct'

export interface Token {
  /** Text to draw. For params, the value without the ⟦ ⟧ markers. */
  s: string
  kind: TokenKind
  /** For params: 0-based index of the param in the whole source. */
  param?: number
}

export const KEYWORDS: ReadonlySet<string> = new Set([
  'function', 'const', 'let', 'var', 'return', 'if', 'else', 'import', 'from', 'export',
  'default', 'async', 'await', 'new', 'true', 'false', 'null', 'undefined', 'for', 'of', 'in',
  'while', 'this', 'try', 'catch', 'class', 'typeof',
])

/** Hooks and APIs drawn in heading white, weight 500. */
export const API_RE = /^(use[A-Z]?\w*|memo|startTransition|createContext|createSignal|ref|computed|signal|\$state|\$derived)$/

const TOKEN_RE =
  /(\/\/.*$|\/\*.*?\*\/)|⟦([^⟧]*)⟧|('[^']*'|"[^"]*"|`[^`]*`)|(=>)|(<\/?[A-Za-z][\w.]*|\/?>)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$@][\w$]*)|(\s+)|([^\sA-Za-z_$\d])/g

/**
 * Tokenize one line. `paramStart` is the index of the first param on this line, so params can
 * be numbered across the whole source (see `tokenizeLines`).
 */
export function tokenize(line: string, paramStart = 0): Token[] {
  const re = new RegExp(TOKEN_RE.source, 'g')
  const out: Token[] = []
  let param = paramStart
  let m: RegExpExecArray | null
  while ((m = re.exec(line))) {
    let t: Token
    if (m[1]) t = { s: m[0], kind: 'comment' }
    else if (m[2] != null) t = { s: m[2], kind: 'param', param: param++ }
    else if (m[3]) t = { s: m[0], kind: 'string' }
    else if (m[4]) t = { s: m[0], kind: 'arrow' }
    else if (m[5]) t = { s: m[0], kind: 'tag' }
    else if (m[6]) t = { s: m[0], kind: 'number' }
    else if (m[7]) {
      const w = m[7]
      t = {
        s: w,
        kind: KEYWORDS.has(w) ? 'keyword' : API_RE.test(w) ? 'api' : /^[A-Z@]/.test(w) ? 'component' : 'ident',
      }
    } else if (m[9]) t = { s: m[0], kind: 'punct' }
    else t = { s: m[0], kind: 'space' }

    const prev = out[out.length - 1]
    if (m[8] && prev && prev.kind !== 'param') {
      prev.s += m[0]
      continue
    }
    out.push(t)
  }
  return out
}

/** Tokenize a whole source (trailing newline dropped), numbering params across lines. */
export function tokenizeLines(code: string): Token[][] {
  let param = 0
  return code
    .replace(/\n$/, '')
    .split('\n')
    .map((line) => {
      const toks = tokenize(line, param)
      param += toks.filter((t) => t.kind === 'param').length
      return toks
    })
}

/** Values of every ⟦param⟧ in `code`, in order. */
export function readParams(code: string): string[] {
  return [...code.matchAll(/⟦([^⟧]*)⟧/g)].map((m) => m[1])
}

/** Replace the `index`th ⟦param⟧ value in `code`. */
export function writeParam(code: string, index: number, value: string): string {
  let i = 0
  return code.replace(/⟦([^⟧]*)⟧/g, (whole) => (i++ === index ? `⟦${value}⟧` : whole))
}

/** Source with the ⟦ ⟧ markers removed (for copy to clipboard and plain display). */
export const stripParams = (code: string) => code.replace(/⟦([^⟧]*)⟧/g, '$1')
