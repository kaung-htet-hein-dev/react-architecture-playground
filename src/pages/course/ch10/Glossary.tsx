import { useState } from 'react'
import { filterGlossary, GLOSSARY } from '../../../content/glossary'

/** Chapter-10 glossary: 18 terms with a search box that filters by term or definition. */
export function Glossary() {
  const [query, setQuery] = useState('')
  const shown = filterGlossary(query)
  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="h3">Glossary</h3>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${GLOSSARY.length} terms`}
          aria-label="Search the glossary"
          className="h-8 w-[200px] rounded-control border border-border-strong bg-raised px-2.5 text-[13px] text-text-strong placeholder:text-text-faint focus:border-text-label max-md:h-11 max-md:w-full"
        />
      </div>
      <dl className="m-0 flex flex-col border-t border-divider">
        {shown.map((g) => (
          <div key={g.term} className="grid grid-cols-[140px_minmax(0,1fr)] gap-4 border-b border-divider py-2.5">
            <dt className="font-mono text-[13px] leading-normal font-medium text-text-heading">{g.term}</dt>
            <dd className="m-0 text-sm leading-normal text-text-prose">{g.def}</dd>
          </div>
        ))}
        {shown.length === 0 && <p className="m-0 border-b border-divider py-2.5 text-sm text-text-label">No terms match "{query.trim()}".</p>}
      </dl>
    </div>
  )
}
