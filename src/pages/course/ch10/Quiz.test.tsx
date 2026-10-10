import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { QUIZ, quizScore } from '../../../content/quiz'
import { Quiz } from './Quiz'

const optionButton = (text: string) => screen.getByRole('button', { name: new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })
const nextBtn = () => screen.getByRole('button', { name: /Next question|See score/ })
const backBtn = () => screen.getByRole('button', { name: 'Back' })

describe('quiz content', () => {
  it('has 8 questions, 4 options each, and a valid answer', () => {
    expect(QUIZ).toHaveLength(8)
    for (const q of QUIZ) {
      expect(q.options.map((o) => o.key)).toEqual(['a', 'b', 'c', 'd'])
      expect(q.options.some((o) => o.key === q.answer)).toBe(true)
    }
  })

  it('question 3 is the one from the design', () => {
    expect(QUIZ[2].q).toBe("A parent re-renders and passes style={{ color: 'red' }} to a child wrapped in memo. Does the child re-render?")
  })

  it('scores only correct answers', () => {
    const answers = QUIZ.map((q, i) => (i % 2 === 0 ? q.answer : null))
    expect(quizScore(answers)).toBe(4)
  })
})

describe('<Quiz>', () => {
  it('reveals correct/incorrect and the explanation only after an option is picked', () => {
    render(<Quiz />)
    const q = QUIZ[0]
    expect(screen.getByText('Question 1 of 8')).toBeInTheDocument()
    expect(screen.queryByText(q.explain)).not.toBeInTheDocument()
    expect(nextBtn()).toBeDisabled()
    expect(backBtn()).toBeDisabled()

    const wrong = q.options.find((o) => o.key !== q.answer)!
    const right = q.options.find((o) => o.key === q.answer)!
    fireEvent.click(optionButton(wrong.text))

    expect(screen.getByText(q.explain)).toBeInTheDocument()
    expect(optionButton(wrong.text)).toHaveTextContent('not quite')
    expect(optionButton(right.text)).toHaveTextContent('correct')
    expect(nextBtn()).toBeEnabled()

    // The first pick is final
    fireEvent.click(optionButton(right.text))
    expect(optionButton(wrong.text)).toHaveAttribute('aria-pressed', 'true')
    expect(optionButton(right.text)).toHaveAttribute('aria-pressed', 'false')
  })

  it('moves with Back/Next, keeps answers, and shows the score at the end', () => {
    render(<Quiz />)
    QUIZ.forEach((q, i) => {
      expect(screen.getByText(`Question ${i + 1} of 8`)).toBeInTheDocument()
      // Answer the first question wrong, the rest right
      const pick = i === 0 ? q.options.find((o) => o.key !== q.answer)! : q.options.find((o) => o.key === q.answer)!
      fireEvent.click(optionButton(pick.text))
      if (i === 1) {
        fireEvent.click(backBtn())
        expect(screen.getByText('Question 1 of 8')).toBeInTheDocument()
        expect(screen.getByText(QUIZ[0].explain)).toBeInTheDocument()
        fireEvent.click(nextBtn())
      }
      expect(nextBtn()).toHaveTextContent(i === QUIZ.length - 1 ? 'See score' : 'Next question')
      fireEvent.click(nextBtn())
    })
    expect(screen.getByRole('status')).toHaveTextContent('You got 7 of 8 right.')

    fireEvent.click(screen.getByRole('button', { name: 'Start over' }))
    expect(screen.getByText('Question 1 of 8')).toBeInTheDocument()
    expect(nextBtn()).toBeDisabled()
  })
})
