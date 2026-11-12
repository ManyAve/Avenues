# Avenue

Avenue is ManyAve's design system: tokens, foundations, components and composites, built on
[Base UI](https://base-ui.com) and [shadcn](https://ui.shadcn.com) with Tailwind 4, and shown in
Storybook 11.

All example data is fictional. Avenue imports nothing from outside this package; npm
dependencies are fine.

## Setup

Needs [Bun](https://bun.sh) 1.4.4 or newer.

```sh
bun install
```

## Checks

There is no CI. Run these locally before opening a pull request.

| Command                   | What it does                                                    |
| ------------------------- | --------------------------------------------------------------- |
| `bun run typecheck`       | Type-checks `src` and `.storybook` with TypeScript 7.           |
| `bun run lint`            | Lints with oxlint; any warning fails.                           |
| `bun run build-storybook` | Builds the static Storybook into `storybook-static/`.           |
| `bun run check`           | Runs the three above in order and stops at the first failure.   |
| `bun run storybook`       | Starts Storybook at http://localhost:6006 (interactive).        |

The toolbar's theme switch flips the `.dark` class on `<html>`, the same switch the ManyAve app
uses, so every story can be checked in light and dark. The Accessibility panel runs axe on the
open story.

TypeScript is installed twice on purpose: `@typescript/native` is TypeScript 7 and provides `tsc`,
while the `typescript` package is TypeScript 6, which Storybook needs to read component props for
Controls and the Docs args table.

## Layout

| Path                     | Holds                                                          |
| ------------------------ | -------------------------------------------------------------- |
| `src/styles/tokens.css`  | Palette and semantic colours for light and dark.                |
| `src/styles/avenue.css`  | Tailwind, the shadcn base layer and the tokens as utilities.    |
| `src/lib/utils.ts`       | `cn`, which knows Avenue's text scale.                          |
| `src/components/`        | Components (empty until the component cards land).              |
| `src/stories/`           | Storybook sections: Tokens, Foundations, Components, Composites.|

## Using Avenue from another package

The package is source-shipped (no build step) and exposes:

- `@manyave/avenue/styles.css`: Tailwind, the base layer and the tokens. Its Tailwind source
  covers the package's own files, so the consumer needs no extra content paths.
- `@manyave/avenue/tokens.css`: the tokens alone.
- `@manyave/avenue/components/*`: one entry per component.
- `@manyave/avenue/utils`: `cn`.

`react`, `react-dom` and `tailwindcss` are peer dependencies so a consumer never gets a second
copy.
