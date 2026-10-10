# Build conventions (decided with user)
Project: /Users/kaunghtethein/Developer/solo-apps/react-architecture-playground. Spec: doc/PROMPT.md, doc/README.md, doc/REQUIREMENTS.md, doc/design/*.dc.html (copy/code verbatim; do NOT port support.js).
User override of PROMPT.md stack: follow sibling project ../rn-architecture-playground conventions (read its package.json, vite.config.ts, src/styles/{tokens,global}.css, src/app, src/components/ui, eslint.config.js, CLAUDE.md-free):
- pnpm; Tailwind CSS v4 (@tailwindcss/vite) with ALL design tokens in src/styles/tokens.css as `@theme static { --color-* ... }` (values from doc/README.md, NOT the rn reactnative.dev values); runtime code reads tokens as var(--color-*) via a colors helper like rn's src/sim/colors.ts.
- react-router (v8, `import from 'react-router'`), motion only if useful (reduced-motion still via data-reduced-motion attr on <html>), React Compiler already enabled (no manual memo needed).
- Layout: src/app/{App.tsx,SettingsProvider.tsx,chapters.ts}, src/components/(+ui/), src/content/, src/hooks/, src/sim/, src/pages/{Course,Playground}.tsx, src/pages/course/ChapterN.tsx, src/pages/playground/. (Adapts PROMPT.md's tree to rn's layout.) Tailwind utility classes in JSX; small @layer components in global.css; CSS Modules not needed.
- Fonts: README "Theme" section wins: system stacks, no web fonts, accent oklch(82% 0.1 195).
- Phase colors fixed, never reused for other meaning. Fluid layouts, 44px touch targets mobile.
- Tests: vitest (+@testing-library/react where useful). Scenarios pure `(params)=>Step[]` on a tiny fiber model in src/sim/model.
- Keep code in repo style: no placeholder TODO/stubs, no test.skip. Run `pnpm lint`, `pnpm build` (tsc -b), `pnpm vitest run` before reporting. No git commits unless asked.

## Scope update (user)
Desktop only for now. Skip mobile (MobileBar, drawer, compact controls, mobile Playground tabs, build-order step 6, 390px checks). Verify at 1440/1024.

## Parallel phase rules (chapters + playground agents run at once)
- Foundation + sim model + ch1 done. Read src/sim/model/index.ts header, src/sim/scenarios/ch1-counter.ts, src/pages/course/Chapter1.tsx as the pattern.
- Only edit YOUR files. Shared files (model/*, components/*, styles/*, types.ts, package.json) may only get small additive changes; never rename/remove exports; re-run all tests after. Other agents work concurrently, so transient lint/build errors in files you don't own are not yours: wait/retry, don't "fix" them.
- Put chapter-specific components in src/pages/course/chN/ ; content in src/content/<file>.ts; scenarios in src/sim/scenarios/.
- Copy/code from the design files verbatim. Where real React semantics (model output) conflict with design copy, keep design copy for display text but make logic real (e.g. ch6: show design's "Rendered fewer hooks than expected" text). Passive-effects-after-paint default stays.
- Vitest per scenario. Verify in browser at 1440 and 1024 vs `npx serve doc/design` (use a distinct port per agent). No git commits.
