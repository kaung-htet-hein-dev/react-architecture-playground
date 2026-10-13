import { Link } from 'react-router'
import { CHAPTERS } from '../../app/chapters'
import { ChapterHeader } from '../../components/ChapterHeader'
import { Glossary } from './ch10/Glossary'
import { Quiz } from './ch10/Quiz'
import { LoopMap, Myths, Summaries } from './ch10/Recap'
import { ChapterSection } from './ChapterSection'

const info = CHAPTERS[9]

/** The page footer under the last chapter. */
function SiteFooter() {
  return (
    <footer className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-4 border-t border-divider px-10 pt-12 pb-20 max-md:px-4">
      <span className="text-sm text-text-label">React Internal · for developers who already use React</span>
      <Link to="/playground" className="flex h-10 items-center rounded-button bg-accent px-4 text-sm font-semibold text-accent-ink hover:brightness-106">
        Try it all in the Playground →
      </Link>
    </footer>
  )
}

/**
 * Chapter 10 · Review the whole loop: the loop map with chapter chips, myths, one-sentence summaries, the
 * quiz and the glossary, followed by the page footer.
 */
export function Chapter10() {
  return (
    <>
      <ChapterSection n={10} last>
        <div className="flex flex-col gap-14">
          <div className="flex flex-col gap-8">
            <div className="flex max-w-copy flex-col gap-3.5">
              <ChapterHeader n={info.n} title={info.title} eyebrow={info.eyebrow} />
              <p className="m-0 text-[17px] leading-[1.6] text-pretty text-text-prose">
                Everything in this guide happens somewhere in one loop. Here is each chapter pinned to the phase it explains.
              </p>
            </div>
            <LoopMap />
          </div>
          <Myths />
          <Summaries />
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(420px,100%),1fr))] items-start gap-6">
            <Quiz />
            <Glossary />
          </div>
        </div>
      </ChapterSection>
      <SiteFooter />
    </>
  )
}
