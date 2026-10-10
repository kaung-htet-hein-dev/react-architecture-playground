import type { ReactNode } from 'react'
import { Panel } from './Panel'

export interface WorkbenchPane {
  /** Header label, e.g. "Code · Counter.jsx" */
  title: ReactNode
  /** Header meta on the right */
  meta?: ReactNode
  metaColor?: string
  body: ReactNode
}

export interface WorkbenchProps {
  /** Code pane (left). */
  code: WorkbenchPane
  /** Tree pane (middle). `footer` takes a TreeLegend. */
  tree: WorkbenchPane & { footer?: ReactNode }
  /** Live preview pane (right). `footer` takes a DomLog. */
  preview: WorkbenchPane & { footer?: ReactNode }
  /** SimControls, under the panes. */
  controls?: ReactNode
  /** Anything after the controls (e.g. a FrameTimeline panel). */
  after?: ReactNode
  /** Anchor id (e.g. `ch1-bench`). */
  id?: string
  className?: string
}

/**
 * Three panes side by side: code · tree · live preview with log
 * (`repeat(auto-fit, minmax(320px, 1fr))`, gap 12), then controls and extras.
 */
export function Workbench({ code, tree, preview, controls, after, id, className = '' }: WorkbenchProps) {
  return (
    <div id={id} className={`flex scroll-mt-[72px] flex-col gap-3 ${className}`}>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-3">
        <Panel title={code.title} meta={code.meta} metaColor={code.metaColor}>
          {code.body}
        </Panel>
        <Panel title={tree.title} meta={tree.meta} metaColor={tree.metaColor}>
          <div className="flex flex-1 items-center px-2 py-[18px]">{tree.body}</div>
          {tree.footer}
        </Panel>
        <Panel title={preview.title} meta={preview.meta} metaColor={preview.metaColor}>
          <div className="p-3.5">{preview.body}</div>
          {preview.footer}
        </Panel>
      </div>
      {controls}
      {after}
    </div>
  )
}
