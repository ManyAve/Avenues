# AGENTS.md

Avenue is ManyAve's design system: tokens, foundations, components and composites, shown in
Storybook. The README covers setup, the checks and the package layout; read it first. `CLAUDE.md`
points here.

## Rules for the package

- Bun for scripts and dependencies. There is no CI: run `bun run check` before opening a pull request.
- A push to `main` publishes Storybook to avenues.manyave.com by itself (Cloudflare Workers Builds runs
  `bun run deploy`; README, "Publishing Storybook"). It checks nothing, so what you merge is what ships.
- Avenue may use any outside npm package. It never imports from another ManyAve repository.
- Fictional data only. No secrets, no real HOA data.
- Releases tag themselves. Raise `version` in `package.json` and add its `CHANGELOG.md` entry in the pull request;
  on merge the Release tags workflow tags that commit `vX.Y.Z` and opens its GitHub release (README, "Versions").
  Never push a tag, or ask a person to: cloud sessions can't, and nobody needs to. It is the only workflow, and it is
  deployment; don't add checks to it or add other CI.
- Imports inside the package use the `#avenue/*` subpaths with no file extension (README, "Imports
  inside Avenue").

## ui-sdk

Before using ui-sdk, follow the ui-sdk skill (installed at `.agents/skills/ui-sdk`, linked into
`.claude/skills`; the copy at `node_modules/@ui-sdk/core/skills/ui-sdk/SKILL.md` matches the installed
version, so prefer it if the two ever differ), and read `node_modules/@ui-sdk/react/docs/llms.txt`,
then the page of each component you use (`docs/components/<name>.md`). To build a new component, also
search `node_modules/@ui-sdk/react/docs/core.md` by heading (it is over 300 KB; don't read it whole),
and read `rendering.md` next to it. ui-sdk is a beta: trust the installed docs and `.d.ts` types over
memory, and never read `dist/*.js` to work out an API.

**ui-sdk replaces Base UI wherever it has an equivalent** (Zack, 2026-11-12). Every Avenue component
gets its behavior (keyboard, focus, selection, dismissal, popups, ARIA) from `@ui-sdk/react` whenever
ui-sdk ships that component or behavior, including components that were first built on Base UI: move
them. Base UI stays only where ui-sdk has nothing yet, and the component says so in a one-line comment
next to the Base UI import, for example `// Base UI: ui-sdk 0.1 has no <thing>.` Re-check those
comments when ui-sdk is upgraded. Hand-rolled behavior is the last resort, built from `@ui-sdk/core`
(the skill's "Build a component ui-sdk doesn't ship" path), not from scratch.

**On every ui-sdk upgrade**, re-check what Avenue works around today, and drop what ui-sdk now does itself:
- each `// Base UI:` comment (above), and each patch under "Patched ui-sdk" (below);
- Combobox / Pattern is pinned to `presentation="popover"`, because ui-sdk 0.1's `checkPattern` fails its own
  Combobox presenting as a sheet ("aria-controls names no open listbox", AVE-39). Remove the pin, run the `touch`
  project, and if it passes delete the pin and its comment (AVE-75).

**Avenue keeps its own look.** Moving a component to ui-sdk must not change a pixel: it keeps the
shadcn component structure, `data-slot` names, Avenue's tokens and Tailwind classes. ui-sdk supplies
behavior, not appearance; prove it with `bun run visual:diff`.

**`data-slot` names.** On a ui-sdk part, ui-sdk's `data-slot` wins (`menu-item`, `dialog-backdrop`,
`segmented-control-item`), because its behavior reads it; don't pass Avenue's own name to a ui-sdk part.
Avenue's own parts (plain markup such as `card-header` or `dialog-footer`) keep the shadcn names. Style a
ui-sdk part by its state attributes and Avenue's classes, not by its `data-slot`; a parent may select
a ui-sdk part by `data-slot` only for layout (as Field and Avatar group do), and only by the name ui-sdk
documents for it.

ui-sdk's default stylesheet, `@ui-sdk/core/web.css`, is loaded first by `avenue.css` as the generated `src/styles/ui-sdk.css`: its `--ui-*` variables are global, but its rules only apply inside
an element with `data-ui-sdk-skin`, because globally they restyle Avenue (they style every `code` and
`a`, and use the same `data-slot` names as shadcn). Don't add `data-ui-sdk-skin` to an Avenue
component; style it with Avenue's tokens instead. After upgrading `@ui-sdk/core`, run
`bun run ui-sdk:css`; `bun run test:scripts` fails until you do.

**Patched ui-sdk.** `patches/` holds Bun patches to ui-sdk, applied by `bun install` (listed under
`patchedDependencies` in `package.json`), so they survive installs and the Cloudflare build. Each is a stopgap
for a ui-sdk bug and is dropped once ui-sdk fixes it upstream; when upgrading ui-sdk, check each one still applies
and is still needed. To change one, `bun patch <package>`, edit `node_modules`, then `bun patch --commit`.

- `@ui-sdk/core` 0.1.0-beta.2 (since beta.1), toast (AVE-43): an empty toast region was listed in the agent snapshot as an
  unnamed `toast`, failing the agent test on nearly every screen. The patch leaves the region out of the snapshot
  while no toast shows, using the primitive's `agent.shown`. `Toast/EmptyRegion` fails if the patch stops applying.
- `@ui-sdk/core` 0.1.0-beta.2, closing backdrop (AVE-109): a press on a dialog's backdrop while it fades out was
  consumed, so the first click on the page after Cancel, Escape or a submit did nothing. The patch consumes it only
  when an outside press closed the dialog in the last second (the second half of a double click).
  `Dialog/ClickRightAfterClose` fails if the patch stops applying.
- `@ui-sdk/core` 0.1.0-beta.2 (since beta.1), positioning (AVE-21): popups were placed at fractional pixels (a menu at
  593.688px), so their text rendered softer than the page's on 1x screens; Base UI rounded. The patch rounds a
  popup's `left` and `top` to whole device pixels. `Dropdown menu/Open` fails if the patch stops applying.

### How to build with ui-sdk

1. **Docs and skill first**, as above.
2. **Import each component from its own entry**, like `@ui-sdk/react/select`. There is no root import,
   and never import `@ui-sdk/core/internal/*`; oxlint fails both. Bare `@ui-sdk/core` is allowed: it is
   where `definePrimitive` and the other core behaviors live.
3. **One shape.** A root and its parts, nested as the component page's Composition shows. Change a
   part's element with `render`, never an `as` prop. For a part of Avenue's own, use `renderElement`
   and `mergeProps` from `@ui-sdk/react/primitive` so it takes `render` like every other part.
4. **Style from state.** Target the `data-slot` and state attributes (`data-open`, `data-checked`,
   `data-highlighted`, `data-disabled`, `data-side`, ...) and the CSS variables each component page
   lists, with Tailwind data variants and Avenue's tokens. Read the attribute from the component page
   or the rendered DOM; never assume Base UI's name, and never style generated ids or inline state.
5. **Animate with `data-starting-style` and `data-ending-style`** (exit styles go on
   `data-ending-style`, which keeps the part mounted until it finishes), and add
   `motion-reduce:transition-none` or the equivalent.
6. **ui-sdk's tokens come from Avenue's.** `src/styles/ui-sdk-theme.css` sets every `--ui-*` token from
   an Avenue token that follows `.dark`. When ui-sdk adds a token, map it there.
7. **Missing component → a ui-sdk primitive**, built from `@ui-sdk/core` behaviors with
   `definePrimitive` (the skill's create-component path), with an `agent` key naming its actions.
8. **Test with ui-sdk's kit.** Story tests run with `__UI_SDK_STRICT__` set, so ui-sdk's development
   warnings fail them. Press every control by keyboard in the play function. List the component in
   `scripts/component-patterns.ts` and tag its story (README, "Accessibility proof for each component"):
   `pattern:<name>` runs `checkPattern` for a primitive Avenue builds or a component that changes a
   ui-sdk part's keys, roles or ARIA; `agent` runs the agent test for a ui-sdk component Avenue only
   styles and wires. Don't run `checkPattern` on unchanged ui-sdk components; ui-sdk tests those itself.
9. **Keep it agent-ready** (`docs/agents.md`, the skill's agent-ready reference): every control is a
   ui-sdk part with an accessible name that is unique where it sits, by at least one word: the bridge matches
   whole words in any order, so "A–Z" and "Z–A" are one name to it, and the story tests fail on such a pair
   (AVE-92, `src/checks/name-clash.ts`); state changes go through
   `on<Key>Change` callbacks, not DOM listeners; what a popup shows comes from its payload or state,
   not a trigger's `onClick`; anything an agent must not do alone (delete, pay, send) carries
   `data-agent-confirm="<what it does>"`, and fields an agent may fill but not read carry
   `data-agent-secret`. `Foundations/Agents` in Storybook is the worked example and its play function
   is the agent test to copy. Avenue never creates the bridge itself (oxlint fails `@ui-sdk/react/agent` in
   `src/components`, `src/lib` and `src/hooks`); turning `createAgent` on in the ManyAve app is a later
   decision.

## Touch targets

Every control composes the shared `hit-area` utility (`src/styles/avenue.css`): 44px on a phone, 24px with a
mouse (more where `--hit-area-x/y` keeps a reach), invisible, never hand-written `after:-inset-*` (AVE-22, README
"Touch targets"). `hit-area` owns the control's `::after`; decoration on a control uses `::before` or a child.
Between two things you can tap, use `gap-controls` (16px on phones), not `gap-group` or a literal gap. Where
neighbours are too close for an invisible extension, the control grows on `pointer-coarse:` only, never at fine
pointer, so `visual:diff` stays identical. The story tests measure every control in the Components and Composites
stories: the `touch` project fails on a tap area under 44px or two that overlap, the mouse projects on a reach
smaller than `FINE_MINIMUMS`; fix the control or the layout, not the measure.

## Proving a change looks the same

`bun run visual:diff [base-ref]` builds Storybook at the base ref (default `main`, or `origin/main`
in a clone without it) and from the working tree, captures every story in light and dark and in the
web and desktop type scales, and compares them pixel by pixel. It fails on any changed, missing or broken story and writes the
captures and diffs to `.visual-diff/report/`. Use it for any change that could move pixels you
didn't mean to move: a stylesheet, a dependency, a token. It needs Playwright's Chromium, or
`AVENUE_CHROMIUM` pointing at one.
