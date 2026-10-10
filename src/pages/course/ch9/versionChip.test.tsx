import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { STORE_KEYS } from '../../../lib/storage'
import { Chapter9 } from '../Chapter9'

const chips = () => screen.getAllByRole('textbox', { name: 'since version' }) as HTMLInputElement[]

beforeEach(() => localStorage.clear())

describe('chapter 9 version labels', () => {
  it('shows five chips defaulting to "React 19"', () => {
    render(<Chapter9 />)
    expect(chips()).toHaveLength(5)
    for (const c of chips()) expect(c.value).toBe('React 19')
  })

  it('saves an edited label to localStorage and restores it after a reload', () => {
    const { unmount } = render(<Chapter9 />)
    fireEvent.change(chips()[1], { target: { value: 'React 19.1' } })
    expect(localStorage.getItem(STORE_KEYS.version('optimistic'))).toBe('React 19.1')
    unmount()

    render(<Chapter9 />)
    const values = chips().map((c) => c.value)
    expect(values).toEqual(['React 19', 'React 19.1', 'React 19', 'React 19', 'React 19'])
  })

  it('reads a stored label on first render', () => {
    localStorage.setItem(STORE_KEYS.version('server-components'), 'React 20')
    render(<Chapter9 />)
    expect(chips()[4].value).toBe('React 20')
  })
})
