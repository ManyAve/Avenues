# Avenue

Avenue is ManyAve's design system: tokens, foundations, components and composites, built on
[ui-sdk](https://ui-sdk.dev) (`@ui-sdk/react`) and [shadcn](https://ui.shadcn.com) with Tailwind 4, and
shown in Storybook 11. Component behavior comes from ui-sdk, which replaces Base UI wherever it has an
equivalent; today no component needs Base UI. The look stays shadcn's structure with Avenue's tokens. `AGENTS.md` has the rule and how to read ui-sdk's docs.

All example data is fictional. Avenue imports nothing from outside this package; npm
dependencies are fine.

## Setup

Needs [Bun](https://bun.sh) 1.4.4 or newer.

```sh
bun install
bunx playwright install chromium   # once, and again after a Playwright upgrade: the browser the story tests run in
```

To use a Chromium that is already installed instead, point `AVENUE_CHROMIUM` at its executable.

## Checks

There is no CI. Run these locally before opening a pull request. `bun run check` renders every story in
a real browser, so it needs Chromium installed first (`bunx playwright install chromium`, see Setup);
without it, the story step stops with Playwright's "install" message, which is not a failing story.

| Command                   | What it does                                                    |
| ------------------------- | --------------------------------------------------------------- |
| `bun run typecheck`       | Type-checks `src` and `.storybook` with TypeScript 7.           |
| `bun run lint`            | Lints with oxlint; any warning fails.                           |
| `bun run check:classes`   | Fails on retired corners (`rounded-2xl/3xl/4xl`) or off-grid spacing (`*-1.5`, `*-2.5`, `*-3.5`). |
| `bun run test:scripts`    | Tests the check scripts with `bun test`.                        |
| `bun run test:stories`    | Renders every story in headless Chromium four times (light and dark, web and desktop type scale), runs its play function and runs axe (WCAG 2.2 AA and best practice). A crash, a failed play function or any axe violation fails it. |
| `bun run build-storybook` | Builds the static Storybook into `storybook-static/`.           |
| `bun run check:story-coverage` | Reads the built Storybook and fails if any story was left out of the story tests (its `test` tag removed with `!test`). |
| `bun run check`           | Runs everything above in order and stops at the first failure.  |
| `bun run tokens:compare`  | Compares the tokens with a ManyAve Management checkout (default `../manyave-management`, or pass a path) and lists every difference; fails on any that isn't an agreed one. Not part of `check`, because it needs the app checked out. |
| `bun run visual:diff [ref]` | Builds Storybook at `ref` (default `main`) and from the working tree, captures every story in all four theme and type-scale combinations, and compares them pixel by pixel. Fails on any changed, missing or broken story; captures and diffs go to `.visual-diff/report/`. Not part of `check`, because it builds twice. |
| `bun run ui-sdk:css`      | Regenerates `src/styles/ui-sdk.css` from `@ui-sdk/core`'s `web.css` after an upgrade (`test:scripts` fails until you do). |
| `bun run storybook`       | Starts Storybook at http://localhost:6006 (interactive).        |

The toolbar's theme switch flips the `.dark` class on `<html>`, the same switch the ManyAve app
uses, so every story can be checked in light and dark. The type-scale switch loads `desktop.css`, the
desktop app's 14/13px scale. `bun run test:stories` runs every story under each combination of the two
switches, and the Accessibility panel shows axe's results for the open story.

### Story tests and accessibility

Every story is a test, with nothing extra to write: it must render, its `play` function (if it has one)
must pass, and axe must find nothing, in all four combinations. Put interaction checks in `play`.

A story may turn off one axe rule only with a written reason, kept next to it in `a11yExceptions`:

```tsx
parameters: {
  a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } },
  a11yExceptions: { "color-contrast": "The swatches are decorative; each value is written beside it." },
},
```

The story tests check the settings Storybook actually resolved for each story, so a story fails if it
turns a rule off without a reason, switches axe off, sets it to warn or manual, narrows its rules or the
area it checks without a reason (`a11yExceptions.context`), however that is written. The rules are in
`.storybook/a11y-guard.ts`. Every story must also stay in the tests: removing its `test` tag fails
`check:story-coverage`.

TypeScript is installed twice on purpose: `@typescript/native` is TypeScript 7 and provides `tsc`,
while the `typescript` package is TypeScript 6, which Storybook needs to read component props for
Controls and the Docs args table.

## Layout

| Path                     | Holds                                                          |
| ------------------------ | -------------------------------------------------------------- |
| `src/styles/tokens.css`  | Palette, type scale, semantic colours, shadows and tints, light and dark (copied from the app). |
| `src/styles/avenue.css`  | Tailwind, the shadcn base layer and the tokens as utilities, with AVE-2's spacing aliases, control heights and corner scale. |
| `src/styles/ui-sdk.css`  | Generated: ui-sdk's default stylesheet with its rules scoped to `[data-ui-sdk-skin]`, loaded first by `avenue.css` (see `scripts/ui-sdk-css.ts`). |
| `src/styles/desktop.css` | The opt-in desktop type scale (compact 14px, meta 13px).        |
| `scripts/`               | The token comparison, the class check, the visual diff and the ui-sdk stylesheet generator. |
| `src/lib/utils.ts`       | `cn`, which knows Avenue's text scale.                          |
| `src/lib/control.ts`     | The shared field look (`controlSurface`) and AVE-2 control sizes (`controlSize`) for inputs, textareas and select triggers. |
| `src/components/`        | One file per component: the shadcn primitives on ui-sdk, styled to the app (AVE-6, AVE-17). Stories in `src/stories/components/`. |
| `src/stories/`           | Storybook sections: Tokens, Foundations, Components, Composites.|

## Spacing and corners

Avenue follows AVE-2's rules. Spacing stays on Tailwind's 4px grid; components use the aliases `inline` (4),
`group` (8), `row-y` (12), `inset` (16), `page` (16, 20 from 640px) and `section` (24), as in `p-inset` or
`gap-group`. Controls use `h-control-xs/sm/md/lg` (24/28/32/40) and controls in one row share a height. Corners
are `rounded-xs/sm/md/lg/xl` (4/6/8/10/14) and `rounded-full` for labels and tokens only; `2xl` to `4xl` are
retired. Each is shown under Tokens in Storybook.

## Imports inside Avenue

Files inside the package import each other through the package's own subpaths
(`package.json` "imports"), without a file extension:

- `#avenue/lib/*` for `src/lib/*.ts`, for example `import { cn } from "#avenue/lib/utils"`
- `#avenue/hooks/*` for `src/hooks/*.ts`
- `#avenue/components/*` for `src/components/*.tsx`

Never use an `@/` alias: Avenue ships its source, and in an app that maps `@/` to its own folder,
that import would resolve to the app's file instead. Don't add a `.ts` or `.tsx` ending either: the
app's TypeScript settings reject it. `components.json` uses the same subpaths, so
`bunx shadcn add <component>` writes these imports as they should be.

## Using Avenue from another package

The package is source-shipped (no build step) and exposes:

- `@manyave/avenue/styles.css`: Tailwind, the base layer and the tokens. Its Tailwind source
  covers the package's own files, so the consumer needs no extra content paths.
- `@manyave/avenue/tokens.css`: the tokens alone.
- `@manyave/avenue/desktop.css`: the desktop type scale; load it after `styles.css` on desktop surfaces.
- `@manyave/avenue/components/*`: one entry per component.
- `@manyave/avenue/utils`: `cn`.

`react`, `react-dom` and `tailwindcss` are peer dependencies so a consumer never gets a second
copy.
