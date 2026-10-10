import { describe, expect, it } from 'vitest'
import { readParams, stripParams, tokenize, tokenizeLines, writeParam } from './tokenize'

const kinds = (line: string) => tokenize(line).map((t) => [t.s, t.kind])

describe('tokenize', () => {
  it('splits a hook call with an editable param', () => {
    expect(kinds('  const [count, setCount] = useState(⟦0⟧);')).toEqual([
      ['  ', 'space'],
      ['const ', 'keyword'],
      ['[', 'punct'],
      ['count', 'ident'],
      [', ', 'punct'],
      ['setCount', 'ident'],
      ['] ', 'punct'],
      ['= ', 'punct'],
      ['useState', 'api'],
      ['(', 'punct'],
      ['0', 'param'],
      [')', 'punct'],
      [';', 'punct'],
    ])
  })

  it('does not merge whitespace into a param', () => {
    const t = tokenize('⟦1⟧ + x')
    expect(t[0]).toMatchObject({ s: '1', kind: 'param', param: 0 })
    expect(t[1]).toEqual({ s: ' ', kind: 'space' })
  })

  it('recognises JSX tags, components, strings and arrows', () => {
    expect(kinds('<Button onClick={() => go("a")}>')).toEqual([
      ['<Button ', 'tag'],
      ['onClick', 'ident'],
      ['=', 'punct'],
      ['{', 'punct'],
      ['(', 'punct'],
      [') ', 'punct'],
      ['=> ', 'arrow'],
      ['go', 'ident'],
      ['(', 'punct'],
      ['"a"', 'string'],
      [')', 'punct'],
      ['}', 'punct'],
      ['>', 'tag'],
    ])
    expect(kinds('</p>')).toEqual([
      ['</p', 'tag'],
      ['>', 'tag'],
    ])
  })

  it('treats PascalCase, numbers, hooks/APIs and comments', () => {
    expect(kinds('Feed 42 memo startTransition createContext x // done')).toEqual([
      ['Feed ', 'component'],
      ['42 ', 'number'],
      ['memo ', 'api'],
      ['startTransition ', 'api'],
      ['createContext ', 'api'],
      ['x ', 'ident'],
      ['// done', 'comment'],
    ])
    expect(kinds('a /* b */ c')).toEqual([
      ['a ', 'ident'],
      ['/* b */ ', 'comment'],
      ['c', 'ident'],
    ])
  })

  it('round-trips every character except param markers', () => {
    const src = 'const t = `Clicked ${count} times`; setCount(c => c + ⟦1⟧);'
    expect(tokenize(src).map((t) => t.s).join('')).toBe(stripParams(src))
  })
})

describe('params', () => {
  const code = 'useState(⟦0⟧);\nsetCount(count + ⟦1⟧);\nsetCount(c => c + ⟦1⟧);\n'

  it('numbers params across lines', () => {
    const params = tokenizeLines(code).flat().filter((t) => t.kind === 'param').map((t) => t.param)
    expect(params).toEqual([0, 1, 2])
    expect(tokenizeLines(code)).toHaveLength(3)
  })

  it('reads and writes params by index', () => {
    expect(readParams(code)).toEqual(['0', '1', '1'])
    expect(readParams(writeParam(code, 1, '5'))).toEqual(['0', '5', '1'])
  })
})
