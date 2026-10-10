import { useState } from 'react'
import { QUIZ, quizScore, type QuizAnswers, type QuizKey, type QuizQuestion } from '../../../content/quiz'
import { alpha, C } from '../../../sim/colors'

const BTN = 'h-[34px] rounded-[7px] px-3.5 text-[13px] disabled:cursor-not-allowed disabled:opacity-40'
const BTN_BACK = `${BTN} border border-border-strong bg-transparent font-medium text-text-node enabled:hover:bg-control`
const BTN_NEXT = `${BTN} border-0 bg-text-strong font-semibold text-bg enabled:hover:bg-text-heading`

function Option({ k, text, answered, picked, right, onPick }: { k: QuizKey; text: string; answered: boolean; picked: boolean; right: boolean; onPick: () => void }) {
  const show = answered && (picked || right)
  const tone = right ? C.commit : C.error
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={picked}
      aria-disabled={answered || undefined}
      className={`flex min-h-[46px] items-center gap-3 rounded-button px-3 py-2 text-left text-[14.5px] leading-[1.4] text-text-strong ${answered ? 'cursor-default' : 'cursor-pointer hover:bg-panel-hi'}`}
      style={{ border: `1px solid ${show ? tone : C.borderStrong}`, background: show ? alpha(tone, 10) : C.panel }}
    >
      <span
        className="flex size-6 flex-none items-center justify-center rounded-control border border-border-strong font-mono text-[11.5px] font-semibold"
        style={{ color: show ? tone : C.label }}
        aria-hidden
      >
        {k.toUpperCase()}
      </span>
      <span className="flex-1">{text}</span>
      {show && (
        <span className="font-mono text-[11px] font-medium" style={{ color: tone }}>
          {right ? 'correct' : 'not quite'}
        </span>
      )}
    </button>
  )
}

export interface QuizProps {
  /** Defaults to the 8 chapter-10 questions. */
  questions?: readonly QuizQuestion[]
}

/**
 * Chapter-10 quiz: pick an option to reveal right/wrong and the explanation; one answer per
 * question. Back/Next move between questions and the last Next shows the score.
 */
export function Quiz({ questions = QUIZ }: QuizProps) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<QuizAnswers>(() => questions.map(() => null))
  const [finished, setFinished] = useState(false)
  const total = questions.length
  const q = questions[index]
  const picked = answers[index]
  const answered = picked != null
  const last = index === total - 1

  const pick = (k: QuizKey) => {
    if (answered) return
    setAnswers(answers.map((a, i) => (i === index ? k : a)))
  }
  const next = () => (last ? setFinished(true) : setIndex(index + 1))
  const restart = () => {
    setAnswers(questions.map(() => null))
    setIndex(0)
    setFinished(false)
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-baseline justify-between">
        <h3 className="h3">Quiz</h3>
        <span className="font-mono text-xs font-medium text-text-label">{finished ? 'Score' : `Question ${index + 1} of ${total}`}</span>
      </div>
      <div className="flex flex-col gap-3.5 rounded-panel border border-border bg-panel p-[18px]">
        {finished ? (
          <>
            <p className="m-0 text-[17px] leading-normal font-medium text-text-heading" role="status">
              You got {quizScore(answers, questions)} of {total} right.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" className={BTN_BACK} onClick={() => setFinished(false)}>
                Back
              </button>
              <button type="button" className={BTN_NEXT} onClick={restart}>
                Start over
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="m-0 text-[17px] leading-normal font-medium text-pretty text-text-heading" id={`quiz-q-${index}`}>
              {q.q}
            </p>
            <div className="flex flex-col gap-2" role="group" aria-labelledby={`quiz-q-${index}`}>
              {q.options.map((o) => (
                <Option key={o.key} k={o.key} text={o.text} answered={answered} picked={picked === o.key} right={o.key === q.answer} onPick={() => pick(o.key)} />
              ))}
            </div>
            <div aria-live="polite">
              {answered && <p className="m-0 border-t border-divider pt-3 text-[15px] leading-[1.6] text-pretty text-text-prose">{q.explain}</p>}
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className={BTN_BACK} onClick={() => setIndex(index - 1)} disabled={index === 0}>
                Back
              </button>
              <button type="button" className={BTN_NEXT} onClick={next} disabled={!answered}>
                {last ? 'See score' : 'Next question'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
