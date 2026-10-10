import { useState, type ReactNode } from 'react'
import { ChapterHeader } from '../../components/ChapterHeader'
import { CodePane } from '../../components/code/CodePane'
import { writeParam } from '../../components/code/tokenize'
import { DomLog } from '../../components/DomLog'
import { FrameTimeline } from '../../components/FrameTimeline'
import { LivePreview, PreviewButton, PreviewValue } from '../../components/LivePreview'
import { LoopIndicator } from '../../components/LoopIndicator'
import { MobileBar } from '../../components/MobileBar'
import { Panel } from '../../components/Panel'
import { SimControls } from '../../components/SimControls'
import { ComponentTree, TreeLegend } from '../../components/tree/ComponentTree'
import { LaneTag } from '../../components/ui/LaneTag'
import { Segmented } from '../../components/ui/Segmented'
import { Tag } from '../../components/ui/Tag'
import { Toggle } from '../../components/ui/Toggle'
import { VersionChip } from '../../components/ui/VersionChip'
import { Workbench } from '../../components/Workbench'
import { WhyWhatHow } from '../../components/WhyWhatHow'
import { alpha, C } from '../../sim/colors'
import type { Block, LogEntry, NodeState, Phase, SimSpeed, SimStatus, TreeNode } from '../../sim/types'

/* Data mirrors design/Component Sheet.dc.html (renderVals). */

const PHASE_CARDS: [Phase | 'error', string, string, string][] = [
  ['trigger', 'Trigger', 'oklch(80% 0.12 75)', 'Events, setState, queued updates, priority lanes.'],
  ['render', 'Render', 'oklch(78% 0.12 240)', 'Components running, elements, hooks, transitions.'],
  ['reconcile', 'Reconcile', 'oklch(76% 0.12 300)', 'Diffing, keys, matching old to new.'],
  ['commit', 'Commit', 'oklch(78% 0.12 155)', 'DOM writes, effects, the tree swap.'],
  ['error', 'Error', 'oklch(72% 0.14 25)', 'Broken rules and wrong results. Not a phase.'],
]

const NEUTRALS: [string, string, string][] = [
  ['bg', '#16181d', 'page'], ['raised', '#1a1d23', 'code, top bar'], ['panel', '#1e2128', 'panels'], ['control', '#262a33', 'buttons'],
  ['divider', '#2a2e37', 'inside panels'], ['border', '#2f343e', 'panel edge'], ['preview', '#f3f2ee', 'rendered app'],
  ['heading', '#eef0f2', 'titles'], ['strong', '#e4e7eb', 'UI text'], ['prose', '#b4bac3', 'body copy'], ['label', '#7d8590', 'labels'], ['faint', '#5b636e', 'line numbers'],
]

const STATE_ROW: NodeState[] = ['idle', 'render', 'skip', 'reconcile', 'dom', 'removed', 'error', 'pending', 'render', 'idle']
const STATES: TreeNode[] = STATE_ROW.map((s, i) => ({
  id: 's' + i,
  label: i === 8 ? 'Main' : i === 9 ? 'Feed' : 'Node',
  state: s,
  trigger: i === 8,
  selected: i === 9,
  tag: i === 8 ? 'setState' : i === 9 ? 'memo' : undefined,
}))
const STATE_NAMES = ['idle', 're-rendering', 'skipped', 'compared', 'DOM changed', 'removed', 'error', 'pending', 'setState here', 'selected + tag']

const WAVE: TreeNode[] = [
  { id: 'a', label: 'App' },
  { id: 'h', label: 'Header', parent: 'a' },
  { id: 'm', label: 'Main', parent: 'a', state: 'render', trigger: true, order: 1, tag: 'setState' },
  { id: 's', label: 'Sidebar', parent: 'm', state: 'skip', tag: 'memo' },
  { id: 'f', label: 'Feed', parent: 'm', state: 'render', order: 2 },
  { id: 'p', label: 'Post', parent: 'f', state: 'render', order: 3 },
  { id: 'q', label: 'Post', parent: 'f', state: 'dom', order: 4 },
]

const SIM_STATES: { label: string; status: SimStatus; index: number; phase: Phase; caption: string }[] = [
  { label: 'idle', status: 'idle', index: 0, phase: 'trigger', caption: "Nothing has happened yet. Press play or step and we'll follow the click." },
  { label: 'running', status: 'running', index: 3, phase: 'render', caption: 'React called Counter again. useState returned 1, the value from the queued update.' },
  { label: 'paused', status: 'paused', index: 5, phase: 'reconcile', caption: 'React compared the new <p> with the old one and found one text change.' },
  { label: 'error', status: 'error', index: 3, phase: 'render', caption: 'setCount ran during render, which asked for another render, which ran it again.' },
  { label: 'complete', status: 'complete', index: 7, phase: 'commit', caption: "That's the whole loop: one click, one render, one DOM write, one painted frame." },
]

const SAMPLE = 'function Counter() {\n  const [count, setCount] = useState(⟦0⟧);\n  if (count > 9) return null;\n  return <p>Count: {count}</p>;\n}'
const CODE_STATES: { label: string; phase: Phase; active: number; error: number; dim: number[]; notes: Record<number, string> }[] = [
  { label: 'Active · trigger', phase: 'trigger', active: 2, error: 0, dim: [], notes: {} },
  { label: 'Active · render', phase: 'render', active: 4, error: 0, dim: [3], notes: { 4: '← count = 1' } },
  { label: 'Active · reconcile', phase: 'reconcile', active: 4, error: 0, dim: [], notes: {} },
  { label: 'Active · commit', phase: 'commit', active: 4, error: 0, dim: [], notes: { 4: '← text written' } },
  { label: 'Error line', phase: 'render', active: 0, error: 3, dim: [], notes: { 3: '← early return' } },
]

const LOG_ROWS: LogEntry[] = [
  { text: 'click on <button> → onClick()', tone: 'trigger' },
  { text: 'call Counter() → count is 1', tone: 'render' },
  { text: 'p.firstChild.nodeValue = "1"', tone: 'commit' },
  { text: 'browser paints the frame', tone: 'paint' },
  { text: 'Error: Too many re-renders.', tone: 'error' },
]

const CH1_CODE = 'function Counter() {\n  const [count, setCount] = useState(0);\n\n  return (\n    <div>\n      <button onClick={() => setCount(count + 1)}>+1</button>\n      <p>Count: {count}</p>\n    </div>\n  );\n}'
const CH1_LOG: LogEntry[] = [
  { text: 'click on <button> → onClick()', tone: 'trigger' },
  { text: 'setCount(1) → queue update on Counter', tone: 'trigger' },
  { text: 'call Counter() → count is 1', tone: 'render' },
  { text: 'returns <div> with <button> and <p>', tone: 'render' },
  { text: 'diff <p>: "Count: 0" → "Count: 1"', tone: 'reconcile' },
  { text: 'p.firstChild.nodeValue = "1"', tone: 'commit' },
  { text: 'browser paints the frame', tone: 'paint' },
]
const CH1_TREE: TreeNode[] = [
  { id: 'app', label: 'App' },
  { id: 'header', label: 'Header', parent: 'app' },
  { id: 'counter', label: 'Counter', parent: 'app', state: 'render', tag: 'state', order: 1 },
  { id: 'div', label: 'div', parent: 'counter', order: 2 },
  { id: 'button', label: 'button', parent: 'div', order: 3 },
  { id: 'p', label: 'p', parent: 'div', state: 'dom', order: 4 },
]
const ONE_FRAME: Block[] = [
  { kind: 'trigger', width: 7, label: 'event' },
  { kind: 'render', width: 18, label: 'render Counter' },
  { kind: 'reconcile', width: 10, label: 'diff' },
  { kind: 'commit', width: 10, label: 'commit' },
  { kind: 'idle', label: 'browser is free' },
  { kind: 'paint', width: 16, label: 'paint' },
]
const FRAMES: Block[] = [
  { kind: 'trigger', start: 18, width: 3, title: 'click + handler' },
  { kind: 'render', start: 21.4, width: 3.6, title: 'render' },
  { kind: 'reconcile', start: 25.3, width: 1.8, title: 'diff' },
  { kind: 'commit', start: 27.4, width: 1.6, title: 'commit' },
  { kind: 'paint', start: 30, width: 3, title: 'paint', dim: true },
  { kind: 'commit', start: 34, width: 2, title: 'passive effects', dim: true },
]

const mono = 'font-mono'
const noop = () => {}

function Section({ label, title, intro, children }: { label: string; title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={label} className="flex flex-col gap-5">
      <h2 className="m-0 text-[22px] font-semibold text-text-heading">{title}</h2>
      {intro && <p className="m-0 max-w-[720px] text-[15px] leading-[1.6] text-text-secondary">{intro}</p>}
      {children}
    </section>
  )
}

const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`flex flex-col gap-3.5 rounded-card border border-border bg-panel p-[18px] ${className}`}>{children}</div>
)

const SubLabel = ({ children }: { children: ReactNode }) => (
  <span className={`${mono} text-[11px] font-medium tracking-[0.06em] text-text-label uppercase`}>{children}</span>
)

function TypeRow({ spec, children }: { spec: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[200px_minmax(0,1fr)] items-baseline gap-6 border-b border-divider py-[18px]">
      <span className={`${mono} text-[11.5px] text-text-label`}>{spec}</span>
      {children}
    </div>
  )
}

/** /dev/components: mirrors design/Component Sheet.dc.html with the real components. */
export default function DevComponents() {
  const [memo, setMemo] = useState(true)
  const [off, setOff] = useState(false)
  const [deps, setDeps] = useState<'[]' | '[count]'>('[count]')
  const [speed, setSpeed] = useState<SimSpeed>(1)
  const [param, setParam] = useState(SAMPLE)
  const [selected, setSelected] = useState('m')

  return (
    <div className="mx-auto box-content flex max-w-[1280px] flex-col gap-16 px-12 pt-14 pb-24">
      <header className="flex flex-col gap-2.5">
        <span className="label">Render, Commit, Repeat · component sheet</span>
        <h1 className="m-0 text-5xl leading-none font-semibold tracking-[-0.035em] text-text-heading">Tokens and components</h1>
        <p className="m-0 max-w-[720px] text-[17px] leading-[1.7] text-text-prose">
          Dark, low-chroma surfaces so the four phase colors carry all the meaning. Syntax highlighting is deliberately muted for the same reason. Every color, size and state here is what the guide, the Playground and the mobile layouts use.
        </p>
      </header>

      <Section
        label="Color"
        title="Phase colors"
        intro="Same lightness and chroma in OKLCH, only hue changes. Each phase keeps its color everywhere: code highlight, tree node, log tag, timeline block, loop indicator. Tint at 14% for fills, 60% for borders."
      >
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
          {PHASE_CARDS.map(([k, name, v, use]) => (
            <div key={k} className="flex flex-col overflow-hidden rounded-panel border border-border bg-panel">
              <div className="flex h-[72px]">
                <span className="flex-[2]" style={{ background: C[k] }} />
                <span className="flex-1" style={{ background: alpha(C[k], 14) }} />
                <span className="flex-1 bg-panel" style={{ boxShadow: `inset 0 0 0 1px ${alpha(C[k], 60)}` }} />
              </div>
              <div className="flex flex-col gap-1 px-3.5 py-3">
                <span className={`${mono} text-xs font-semibold tracking-[0.06em] uppercase`} style={{ color: C[k] }}>{name}</span>
                <span className={`${mono} text-[11.5px] text-text-secondary`}>{v}</span>
                <span className="text-[13px] leading-[1.45] text-text-prose">{use}</span>
              </div>
            </div>
          ))}
        </div>
        <h2 className="mt-3 mb-0 text-[22px] font-semibold text-text-heading">Surfaces and text</h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">
          {NEUTRALS.map(([name, v, use]) => (
            <div key={name} className="flex flex-col gap-2">
              <span className="h-14 rounded-button border border-[#2a2f37]" style={{ background: v }} />
              <span className={`${mono} text-xs font-medium text-text-strong`}>{name}</span>
              <span className={`${mono} text-[11px] text-text-label`}>{v} · {use}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section label="Type" title="Type">
        <p className="m-0 -mt-2 text-[14.5px] text-text-secondary">System sans for prose, system mono for code, labels and anything that came from React.</p>
        <div className="flex flex-col border-t border-divider">
          <TypeRow spec="Display · 84/0.96 · 600 · −4.5%"><span className="display">Render, Commit</span></TypeRow>
          <TypeRow spec="Chapter title · 44/1.06 · 600"><span className="h2">What re-renders and why</span></TypeRow>
          <TypeRow spec="Mobile title · 30/1.08 · 600"><span className="text-[30px] leading-[1.08] font-semibold tracking-[-0.03em] text-text-heading">Fiber and hooks</span></TypeRow>
          <TypeRow spec="Section · 24 · 600"><span className="h3">Common myths</span></TypeRow>
          <TypeRow spec="Lede · 20/1.55 · 400"><span className="lede max-w-[640px]">We'll slow React down until you can see which functions run.</span></TypeRow>
          <TypeRow spec="Prose · 16/1.6 · 400">
            <span className="prose-body max-w-[640px]">For every component instance React keeps a <b className="term">fiber</b>. Defined terms are set in 500 weight, full-white, the first time they appear.</span>
          </TypeRow>
          <TypeRow spec="Mentor caption · 14.5/1.55"><span className="max-w-[640px] text-[15px] leading-[1.6] text-text-code">React found one difference, the text inside the paragraph, so the commit is a single DOM write.</span></TypeRow>
          <TypeRow spec="Code · Mono 13/21 · 12/20"><span className={`${mono} text-[13px] leading-[21px] text-text-code`}>const [count, setCount] = useState(0);</span></TypeRow>
          <TypeRow spec="Label · Mono 11 · +8% caps"><span className="label">Component tree · 1 rendered</span></TypeRow>
        </div>
      </Section>

      <Section
        label="Tree node states"
        title="Component-tree nodes"
        intro="One shape, state carried by fill and border style. Solid means work happened, dashed means React chose not to, struck through means gone. An amber ring marks where setState was called. Edges take the child's state color, so the re-render wave reads top-down."
      >
        <div className="flex flex-col gap-3.5 rounded-card border border-border bg-panel px-4 py-6">
          <div className="overflow-x-auto">
            <div className="mx-auto flex w-max flex-col gap-3.5">
              <ComponentTree nodes={STATES} colWidth={128} showOrder={false} />
              <div className={`grid grid-cols-[repeat(10,128px)] ${mono} text-center text-[11px] text-text-label`}>
                {STATE_NAMES.map((s) => <span key={s}>{s}</span>)}
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(380px,1fr))] gap-3">
          <div className="flex flex-col gap-2.5 rounded-card border border-border bg-panel p-4">
            <SubLabel>Default motion · wave travels 120 ms per level</SubLabel>
            <ComponentTree nodes={WAVE} showOrder={false} />
          </div>
          <div className="flex flex-col gap-2.5 rounded-card border border-border bg-panel p-4">
            <SubLabel>Reduced motion · instant states, numbered order</SubLabel>
            <ComponentTree nodes={WAVE} showOrder />
          </div>
          <div className="col-span-full flex flex-col gap-2.5 rounded-card border border-border bg-panel p-4">
            <SubLabel>Clickable · selected node gets the light ring</SubLabel>
            <ComponentTree
              nodes={WAVE.map((n) => ({ ...n, trigger: false, selected: n.id === selected }))}
              onNodeClick={setSelected}
              showOrder={false}
            />
          </div>
        </div>
      </Section>

      <Section
        label="Simulation controls"
        title="Simulation controls"
        intro="Reset, step back, play or pause, step, a scrubber with one tick per step, speed and a status chip. The mentor sentence underneath always explains the step that just happened. The play button takes the current phase color."
      >
        <div className="flex flex-col gap-3">
          {SIM_STATES.map((s) => (
            <div key={s.label} className="grid grid-cols-[110px_minmax(0,1fr)] items-start gap-4">
              <span className={`${mono} pt-5 text-[11.5px] font-medium text-text-secondary`}>{s.label}</span>
              <SimControls
                status={s.status}
                index={s.index}
                total={7}
                phase={s.phase}
                speed={speed}
                caption={s.caption}
                onPlay={noop}
                onPause={noop}
                onStep={noop}
                onBack={noop}
                onReset={noop}
                onSeek={noop}
                onSpeed={setSpeed}
              />
            </div>
          ))}
          <div className="grid grid-cols-[110px_390px] items-start gap-4">
            <span className={`${mono} pt-5 text-[11.5px] font-medium text-text-secondary`}>compact · mobile</span>
            <SimControls
              compact
              status="running"
              index={3}
              total={7}
              phase="render"
              speed={1}
              caption="React called Counter again; count is 1."
              onPlay={noop}
              onPause={noop}
              onStep={noop}
              onBack={noop}
              onReset={noop}
              onSeek={noop}
              onSpeed={noop}
            />
          </div>
        </div>
      </Section>

      <Section
        label="Code pane"
        title="Code pane"
        intro="The executing line gets a 13% phase tint and a 2 px phase bar. Editable parameters get a dashed amber outline. Lines that didn't run drop to 36% opacity. Errors use the red line and an inline note."
      >
        <div className="grid grid-cols-[repeat(auto-fit,minmax(360px,1fr))] gap-3">
          {CODE_STATES.map((c) => (
            <Panel key={c.label} title={c.label} meta={c.phase} metaColor={c.error ? C.error : C[c.phase]} headerHeight={36}>
              <CodePane code={SAMPLE} activeLine={c.active} errorLine={c.error} phase={c.phase} dimLines={c.dim} notes={c.notes} size="sm" />
            </Panel>
          ))}
          <Panel title="Editable params" meta="type to edit" headerHeight={36}>
            <CodePane
              code={param}
              activeLine={2}
              phase="trigger"
              size="sm"
              onParamChange={(i, v) => setParam((src) => writeParam(src, i, v))}
            />
          </Panel>
        </div>
      </Section>

      <Section label="Chrome and controls" title="Loop indicator, buttons and tags">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(380px,1fr))] gap-3">
          <Card>
            <SubLabel>Loop indicator · top bar</SubLabel>
            {([['none', []], ['one phase', ['reconcile']], ['two phases', ['trigger', 'render']]] as [string, Phase[]][]).map(([l, lit]) => (
              <div key={l} className="flex items-center gap-3">
                <span className={`${mono} w-[84px] text-[11px] text-text-label`}>{l}</span>
                <LoopIndicator lit={lit} />
              </div>
            ))}
            <span className="mt-1.5"><SubLabel>Mobile</SubLabel></span>
            <div className="w-[390px] max-w-full overflow-hidden rounded-panel border border-border">
              <MobileBar current={4} phases={['render']} onOpenChapters={noop} sticky={false} />
            </div>
          </Card>
          <Card>
            <SubLabel>Buttons</SubLabel>
            <div className="flex flex-wrap items-center gap-2">
              <a className="btn-primary" href="#">Primary</a>
              <a className="btn-secondary" href="#">Secondary</a>
              <button type="button" className="btn-control">Action</button>
              <button
                type="button"
                className="btn-control"
                style={{ background: alpha(C.reconcile, 16), borderColor: alpha(C.reconcile, 70), color: 'var(--color-reconcile-pressed-ink)' }}
              >
                Pressed · phase
              </button>
            </div>
            <SubLabel>Toggle and segmented</SubLabel>
            <div className="flex flex-wrap items-center gap-2.5">
              <Toggle checked={memo} onChange={setMemo} label="memo(Sidebar)" />
              <Toggle checked={off} onChange={setOff} label="off" />
              <Segmented label="Dependency array" options={[{ value: '[]', label: '[]' }, { value: '[count]', label: '[count]' }]} value={deps} onChange={setDeps} />
              <Segmented label="Dependency array (editable)" editable options={[{ value: '[]', label: '[]' }, { value: '[count]', label: '[count]' }]} value={deps} onChange={setDeps} />
            </div>
            <SubLabel>Tags and editable version</SubLabel>
            <div className="flex flex-wrap items-center gap-2">
              <LaneTag lane="SyncLane" />
              <LaneTag lane="TransitionLane" />
              <Tag tone="render">RENDERED</Tag>
              <Tag tone="muted" variant="dashed">SKIPPED</Tag>
              <VersionChip id="dev-sheet" />
            </div>
          </Card>
        </div>
      </Section>

      <Section label="Log rows and panels" title="Log rows and panel anatomy">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(380px,1fr))] gap-3">
          <Panel title="Panel header · 40 px" meta="meta">
            <DomLog entries={LOG_ROWS} current={3} />
          </Panel>
          <div className="flex flex-col gap-2.5 rounded-panel border border-border bg-panel p-4 text-[13.5px] leading-[1.55] text-text-prose">
            <SubLabel>Spacing and radii</SubLabel>
            <div className={`grid grid-cols-[120px_1fr] gap-x-3.5 gap-y-1.5 ${mono} text-xs text-text-node`}>
              <span className="text-text-label">space</span><span>4 · 8 · 12 · 16 · 24 · 32 · 56 · 120</span>
              <span className="text-text-label">pane gap</span><span>12</span>
              <span className="text-text-label">radius</span><span>4 tag · 6 control · 10 panel · 24 phone</span>
              <span className="text-text-label">hit target</span><span>32 desktop · 44 mobile minimum</span>
              <span className="text-text-label">content width</span><span>1200 max · prose 780</span>
            </div>
            <span className="mt-1.5"><SubLabel>Motion</SubLabel></span>
            <div className={`grid grid-cols-[120px_1fr_1fr] gap-x-3.5 gap-y-1.5 ${mono} text-xs text-text-node`}>
              <span /><span className="text-text-label">default</span><span className="text-text-label">reduced</span>
              <span className="text-text-label">tree wave</span><span>120 ms / level, ease-out</span><span>instant + order badges</span>
              <span className="text-text-label">line highlight</span><span>160 ms slide</span><span>instant jump</span>
              <span className="text-text-label">playhead</span><span>linear with clock</span><span>jumps per step</span>
              <span className="text-text-label">tree swap</span><span>240 ms cross-move</span><span>labels swap, banner</span>
              <span className="text-text-label">autoplay</span><span>on with Play</span><span>off; step only</span>
            </div>
          </div>
        </div>
      </Section>

      <Section label="Composites" title="Chapter anatomy, workbench and timelines" intro="Not on the design sheet: the composed pieces, using chapter 1's running frame (step 6, commit).">
        <ChapterHeader n={1} title="One click, slowed down" eyebrow="All four phases" />
        <WhyWhatHow
          why="You've written this counter a hundred times. It works, so you've never had to ask what happens between the click and the new number. That gap is where most React bugs and performance questions live."
          what={<>One click goes through the four phases above. A <b className="term">component tree</b> is how React sees your app: each component, and each HTML tag it returns, is a node with a parent and children.</>}
          how="Press step. Each press moves one step forward. The highlighted line, the tree and the log always show the same moment, in the same phase color."
        />
        <Workbench
          code={{ title: 'Code · Counter.jsx', meta: 'commit', metaColor: C.commit, body: <CodePane code={CH1_CODE} activeLine={7} phase="commit" notes={{ 7: '← text changes here' }} label="Counter.jsx" /> }}
          tree={{ title: 'Component tree', meta: '1 rendered · 1 DOM change', body: <ComponentTree nodes={CH1_TREE} colWidth={96} />, footer: <TreeLegend /> }}
          preview={{
            title: 'Live preview',
            meta: '1 DOM op',
            body: (
              <LivePreview>
                <PreviewButton>+1</PreviewButton>
                <span className="text-[19px] font-medium">Count: <PreviewValue highlight>1</PreviewValue></span>
              </LivePreview>
            ),
            footer: <DomLog header entries={CH1_LOG} current={6} />,
          }}
          controls={
            <SimControls status="running" index={6} total={7} phase="commit" speed={speed} caption="React found one difference, the text inside <p>, so the commit is a single DOM write. The <button> and the <div> are left exactly as they were." onPlay={noop} onPause={noop} onStep={noop} onBack={noop} onReset={noop} onSeek={noop} onSpeed={setSpeed} />
          }
          after={
            <Panel title="From event to pixel · one frame" meta="≈16.7 ms at 60 Hz · not to scale">
              <FrameTimeline blocks={ONE_FRAME} playhead={44} />
            </Panel>
          }
        />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(380px,1fr))] gap-3">
          <Panel title="Browser frames" meta="16.7 ms each" headerHeight={30}>
            <FrameTimeline variant="frames" blocks={FRAMES} playhead={28.2} />
          </Panel>
          <Panel title="Live preview · error and tab title" headerHeight={36}>
            <div className="flex flex-col gap-3 p-3.5">
              <LivePreview error={{ title: 'Uncaught Error', message: 'Too many re-renders. React limits the number of renders to prevent an infinite loop.' }} />
              <LivePreview tabTitle="Clicked 2 times">
                <PreviewButton className="mx-auto px-[18px] py-2.5 text-[15px]" ring={alpha(C.commit, 70)}>Count: 2</PreviewButton>
              </LivePreview>
            </div>
          </Panel>
        </div>
      </Section>
    </div>
  )
}
