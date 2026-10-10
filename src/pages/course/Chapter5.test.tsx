import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SettingsProvider } from '../../app/SettingsProvider'
import { Chapter5 } from './Chapter5'

const setup = () => render(<Chapter5 />, { wrapper: SettingsProvider })

/** [label, input value] of each live row in one list. */
function rows(list: 'key={index}' | 'key={item.id}') {
  const section = screen.getByRole('region', { name: list })
  return within(section)
    .getAllByRole('textbox')
    .map((el) => [el.getAttribute('aria-label')!.replace(/^Note for (\S+).*$/, '$1'), (el as HTMLInputElement).value])
}

const toCommit = () => fireEvent.click(screen.getByRole('button', { name: 'Go to step 3' }))

describe('Chapter 5 with real uncontrolled inputs', () => {
  it('starts with a note typed into every row', () => {
    setup()
    const start = [
      ['Milk', '2 litres'],
      ['Bread', 'sourdough'],
      ['Eggs', 'a dozen'],
    ]
    expect(rows('key={index}')).toEqual(start)
    expect(rows('key={item.id}')).toEqual(start)
  })

  it('Remove first: index keys leave the text on the wrong rows, id keys keep it', () => {
    setup()
    toCommit()
    expect(rows('key={index}')).toEqual([
      ['Bread', '2 litres'],
      ['Eggs', 'sourdough'],
    ])
    expect(rows('key={item.id}')).toEqual([
      ['Bread', 'sourdough'],
      ['Eggs', 'a dozen'],
    ])
  })

  it('text typed by the user follows the key: Shuffle after typing', () => {
    setup()
    toCommit()
    const idInputs = within(screen.getByRole('region', { name: 'key={item.id}' })).getAllByRole('textbox')
    fireEvent.change(idInputs[0], { target: { value: 'rye' } })
    fireEvent.click(screen.getByRole('button', { name: 'Shuffle' }))
    toCommit()
    const after = rows('key={item.id}')
    expect(after).toContainEqual(['Bread', 'rye'])
    expect(after).toContainEqual(['Eggs', 'a dozen'])
    // Index keys: inputs stayed in place while the labels swapped.
    expect(rows('key={index}').map((r) => r[1])).toEqual(['2 litres', 'sourdough'])
    expect(rows('key={index}').map((r) => r[0])).toEqual(['Eggs', 'Bread'])
  })

  it('Add item appends an empty row on both sides', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }))
    toCommit()
    expect(rows('key={index}').at(-1)).toEqual(['Butter', ''])
    expect(rows('key={item.id}').at(-1)).toEqual(['Butter', ''])
    expect(rows('key={index}')[0]).toEqual(['Milk', '2 litres'])
  })
})
