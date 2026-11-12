# AGENTS.md

Avenue is ManyAve's design system: tokens, foundations, components and composites, shown in
Storybook. The README covers setup, the checks and the package layout; read it first. `CLAUDE.md`
points here.

## Rules for the package

- Bun for scripts and dependencies. There is no CI: run `bun run check` before opening a pull request.
- Avenue may use any outside npm package. It never imports from another ManyAve repository.
- Fictional data only. No secrets, no real HOA data.
- Imports inside the package use the `#avenue/*` subpaths with no file extension (README, "Imports
  inside Avenue").

## ui-sdk

Before using ui-sdk, follow the ui-sdk skill (installed at `.agents/skills/ui-sdk`, linked into
`.claude/skills`), and read `node_modules/@ui-sdk/react/docs/llms.txt`. To build a new component, also
search `node_modules/@ui-sdk/react/docs/core.md` by heading (it is over 300 KB; don't read it whole),
and read `rendering.md` next to it.

**ui-sdk replaces Base UI wherever it has an equivalent** (Zack, 2026-11-12). Every Avenue component
gets its behavior (keyboard, focus, selection, dismissal, popups, ARIA) from `@ui-sdk/react` whenever
ui-sdk ships that component or behavior, including components that were first built on Base UI: move
them. Base UI stays only where ui-sdk has nothing yet, and the component says so in a one-line comment
next to the Base UI import, for example `// Base UI: ui-sdk 0.1 has no <thing>.` Re-check those
comments when ui-sdk is upgraded. Hand-rolled behavior is the last resort, built from `@ui-sdk/core`
(the skill's "Build a component ui-sdk doesn't ship" path), not from scratch.

**Avenue keeps its own look.** Moving a component to ui-sdk must not change a pixel: it keeps the
shadcn component structure, `data-slot` names, Avenue's tokens and Tailwind classes. ui-sdk supplies
behavior, not appearance; prove it with `bun run visual:diff`.

ui-sdk's default stylesheet, `@ui-sdk/core/web.css`, is loaded first by `avenue.css` as the generated `src/styles/ui-sdk.css`: its `--ui-*` variables are global, but its rules only apply inside
an element with `data-ui-sdk-skin`, because globally they restyle Avenue (they style every `code` and
`a`, and use the same `data-slot` names as shadcn). Don't add `data-ui-sdk-skin` to an Avenue
component; style it with Avenue's tokens instead. After upgrading `@ui-sdk/core`, run
`bun run ui-sdk:css`; `bun run test:scripts` fails until you do.

## Proving a change looks the same

`bun run visual:diff [base-ref]` builds Storybook at the base ref (default `main`) and from the
working tree, captures every story in light and dark and in the web and desktop type scales, and
compares them pixel by pixel. It fails on any changed, missing or broken story and writes the
captures and diffs to `.visual-diff/report/`. Use it for any change that could move pixels you
didn't mean to move: a stylesheet, a dependency, a token. It needs Playwright's Chromium, or
`AVENUE_CHROMIUM` pointing at one.
