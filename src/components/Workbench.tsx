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
 * Code on its own full-width row (long lines stay readable), tree + live preview with log side
 * by side below, then controls and extras. Columns follow the workbench's own width (container
 * query): stacked under 640px. Gap 20.
 */
export function Workbench({ code, tree, preview, controls, after, id, className = '' }: WorkbenchProps) {
  return (
    <div id={id} className={`@container flex scroll-mt-[72px] flex-col gap-5 ${className}`}>
      <div className="grid grid-cols-1 gap-5 @min-[640px]:grid-cols-2">
        <Panel title={code.title} meta={code.meta} metaColor={code.metaColor} className="@min-[640px]:col-span-2">
          {code.body}
        </Panel>
        <Panel title={tree.title} meta={tree.meta} metaColor={tree.metaColor}>
          <div className="flex flex-1 items-center px-4 py-7">{tree.body}</div>
          {tree.footer}
        </Panel>
        <Panel title={preview.title} meta={preview.meta} metaColor={preview.metaColor}>
          <div className="p-5">{preview.body}</div>
          {preview.footer}
        </Panel>
      </div>
      {controls}
      {after}
    </div>
  )
}
