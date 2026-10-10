import { CodePane } from '../../../components/code/CodePane'
import { VersionChip } from '../../../components/ui/VersionChip'
import { CH9_CODE } from '../../../content/codeSamples'
import { C } from '../../../sim/colors'

const COL_LABEL = 'flex items-center gap-2 px-3.5 pt-3 font-mono text-[10.5px] leading-none font-medium tracking-[0.06em] uppercase'
const BOX = 'flex flex-col gap-1.5 rounded-[7px] border border-border bg-raised px-3 py-2.5 font-mono text-xs leading-normal text-text-node'

/** The wide chapter-9 card: server code · what crosses the network · browser code. */
export function ServerComponentsCard() {
  return (
    <article className="overflow-hidden rounded-panel border border-border bg-panel" aria-label="Server Components">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-divider px-4 pt-4 pb-3.5">
        <div className="flex max-w-[760px] flex-col gap-2">
          <h3 className="m-0 text-[17px] font-semibold text-text-heading">Server Components</h3>
          <p className="m-0 text-sm leading-[1.55] text-text-prose">
            A <b className="term">Server Component</b> runs on the server, at build or request time, and its code never ships to the browser. Only components
            marked 'use client' run in the browser, and only they can use state, effects and event handlers. Before, the whole page was client code:
            download the JS, render, then fetch data in an effect.
          </p>
        </div>
        <VersionChip id="server-components" />
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))]">
        <div className="border-r border-divider">
          <div className={COL_LABEL} style={{ color: C.node }}>
            <span className="size-2 rounded-[2px]" style={{ background: C.node }} aria-hidden />
            Server
          </div>
          <CodePane code={CH9_CODE.server} size="sm" activeLine={3} phase="render" label="ProductPage.jsx" />
        </div>
        <div className="flex flex-col gap-2.5 border-r border-divider px-4 py-3.5">
          <span className="font-mono text-[10.5px] leading-none font-medium tracking-[0.06em] text-text-label uppercase">What crosses the network</span>
          <div className={BOX}>
            <span className="text-text-label">rendered result</span>
            <span>&lt;h1&gt;Blue enamel mug&lt;/h1&gt;</span>
            <span>
              &lt;AddToCart productId="42" /&gt; <span style={{ color: C.trigger }}>← client reference</span>
            </span>
          </div>
          <div className={BOX}>
            <span className="text-text-label">JavaScript downloaded</span>
            <span>AddToCart.jsx</span>
            <span className="text-text-faint line-through">ProductPage.jsx, db client</span>
          </div>
        </div>
        <div>
          <div className={COL_LABEL} style={{ color: C.trigger }}>
            <span className="size-2 rounded-[2px]" style={{ background: C.trigger }} aria-hidden />
            Browser
          </div>
          <CodePane code={CH9_CODE.client} size="sm" activeLine={2} phase="trigger" label="AddToCart.jsx" />
        </div>
      </div>
    </article>
  )
}
