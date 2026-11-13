# Avenue

Avenue is ManyAve's design system: tokens, foundations, components and composites, built on
[ui-sdk](https://ui-sdk.dev) (`@ui-sdk/react`) and [shadcn](https://ui.shadcn.com) with Tailwind 4, and
shown in Storybook 11. Component behavior comes from ui-sdk, which replaces Base UI wherever it has an
equivalent; today no component needs Base UI. The look stays
shadcn's structure with Avenue's tokens. `AGENTS.md` has the rule, how to read ui-sdk's docs, and the nine ui-sdk practices every component
follows (per-part imports, styling from state attributes, enter and exit animation, tokens, primitives
for what ui-sdk doesn't ship, its test kit, agent-readiness); `Foundations/Agents` in Storybook is the
worked example.

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
| `bun run test:stories`    | Renders every story in headless Chromium four times (light and dark, web and desktop type scale), runs its play function and runs axe (WCAG 2.2 AA and best practice), then a fifth time as a phone (`touch`), where it also measures every control's tap area (below). A crash, a failed play function, any axe violation or a tap area under 44px fails it. |
| `bun run build-storybook` | Builds the static Storybook into `storybook-static/`.           |
| `bun run check:story-coverage` | Reads the built Storybook and fails if any story was left out of the story tests (its `test` tag removed with `!test`), or if a component misses its accessibility proof (below). |
| `bun run check`           | Runs everything above in order and stops at the first failure.  |
| `bun run tokens:compare`  | Compares the tokens with a ManyAve Management checkout (default `../manyave-management`, or pass a path) and lists every difference; fails on any that isn't an agreed one. Not part of `check`, because it needs the app checked out. |
| `bun run visual:diff [ref]` | Builds Storybook at `ref` (default `main`; `origin/<ref>` when there is no local branch of that name) and from the working tree, captures every story in all four theme and type-scale combinations, and compares them pixel by pixel. Fails on any changed, missing or broken story; captures and diffs go to `.visual-diff/report/`. Not part of `check`, because it builds twice. |
| `bun run parity [--app <path>]` | Builds the ManyAve Management app's Storybook from a local checkout (default `../manyave-management`) and Avenue's, then captures every Avenue component and composite story beside the app story it was ported from, in all four combinations, and compares them. Fails on any difference without a recorded reason, or any story with no pair and no reason; the report goes to `.parity/report/index.html`. Not part of `check`, because it needs the app checked out (below). |
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

### Accessibility proof for each component (ui-sdk)

`scripts/component-patterns.ts` lists every component in `src/components` and how its accessibility is
proven, as one of three kinds. The rule follows ui-sdk's own testing guide: its components are tested
already, so Avenue tests what it wired, and runs the pattern check only where it changes behavior.

| Kind | When | Tag a story in the component's own stories file | What the story tests then run, after `play` |
| ---- | ---- | ---- | ---- |
| `pattern` | An Avenue-built primitive, or a component that changes a ui-sdk part's keys, roles or ARIA (today: Combobox) | `pattern:<name>` | `checkPattern` from `@ui-sdk/core/testing`: roles, names, states, references between parts, keyboard |
| `upstream` | A ui-sdk component Avenue styles and wires | `agent` | a `createAgent` snapshot: it fails when it finds no control or a control without a name |
| `none` | Plain markup (Card, Table, Badge, Inline message) | nothing | nothing extra |

```tsx
export const Agent: Story = {
  tags: ["agent"],
  play: async () => { /* act on the controls the way an agent would; the runner checks the names */ },
};
```

`check:story-coverage` fails when a component isn't listed, when its story with the required tag is
missing or untested, or when a `pattern:` tag names a pattern the kit doesn't know. The pattern list is
tied to the kit's own type, so a ui-sdk upgrade that changes patterns fails `typecheck`. Both checks
only run under the story tests, never while you browse Storybook. The pattern check looks at the whole
page by default, because dialogs and menus render outside the story; `parameters.patternRoot` (a CSS
selector) narrows it. Open a dialog or menu in `play` before it runs, and tag a story whose state
really changes, because the check presses keys.

When a pattern check and an older story assertion disagree, the pattern wins and the UX Engineer signs
off the changed assertion on the card. One documented deviation: ui-sdk's Select moves focus into its
list, which ui-sdk's own combobox check rejects. Avenue ships it as is (UX Engineer, AVE-17) and
revisits it when ui-sdk leaves beta. The kit is a beta: reproduce a pattern failure by hand before
calling it a bug (false alarms are logged on AVE-17).

TypeScript is installed twice on purpose: `@typescript/native` is TypeScript 7 and provides `tsc`,
while the `typescript` package is TypeScript 6, which Storybook needs to read component props for
Controls and the Docs args table.

### Proving Avenue matches the app

`bun run parity` is how Zack approves the finished system: every Avenue component beside the app's own
version. It reads the app (`--app <path>`, default `../manyave-management`) and never changes it or imports
from it: it copies the app's committed files with `git archive` into a temporary folder and builds its
Storybook there. The app's private `@buildwf` Point packages can't install without registry access, so when
`bun install` fails the copy drops them and swaps a stub for `@point/cloud/validators` (the UI only needs it
for types); the report says when it did. `--reuse` skips both builds and reuses `.parity/`; `--only <prefix>`
compares just the Avenue stories whose id starts with it.

The pairs live in `scripts/parity-pairs.ts`. Each Avenue component and composite story either names the app
story (and what to crop on each side) it is compared with, or says in a sentence why it has none (a
behaviour-only story, or something the app doesn't have). Each pair compares, per visible part, the computed
padding, borders, corners, fill, text colour, type, shadow, gaps and size, plus the pixels where both
captures show the same text. A difference passes only with an allowance whose reason says which kind it is:

- `AVE-2 §<n>: …` an agreed spacing or corner fix, or `AVE-13: …` / `AVE-29: …`, the agreed contrast and
  control-text decisions.
- `AVE-<id>: …` a filed bug that is still open; the report lists it as known.
- `app: <file>: …` the app's screen passes its own classes to the component (a card's shadow, a dialog's
  sections), so Avenue's component isn't meant to match; name the app file that adds them.

Anything else, and any story missing from the map, fails the run. When a story is added, add its line to
the map in the same pull request.

## Publishing Storybook

The built Storybook is published at **https://avenues.manyave.com**, a Cloudflare Worker that serves
only static files (`cloudflare.config.ts`; no Worker code, no bindings, no secrets).

**Every push to `main` publishes itself.** The `avenue-storybook` Worker is connected to this repo with
Cloudflare Workers Builds: on each push to `main`, Cloudflare clones the commit, installs with Bun
and runs `bun run deploy`, which builds `storybook-static/`, stamps it with the commit and uploads it
with `cf deploy storybook-static`. Nobody runs anything after a merge. Workers Builds runs no checks
and blocks nothing: the gate is still `bun run check` and `visual:diff main` on your machine before you
merge (there is no CI). Its settings live in the Cloudflare dashboard (Worker `avenue-storybook`,
Settings, Builds), not in this repo, and it uses Cloudflare's own build token, so the repo holds no
credentials. Other branches do not deploy.

To see which commit is live:

```sh
curl -s https://avenues.manyave.com/version.json   # {"commit": "...", "by": "workers-builds", ...}
```

A build that fails shows in the dashboard under Builds and leaves the previous upload serving. To
undo a bad upload, roll back to the previous deployment in the dashboard, or revert the commit on
`main`, which publishes again.

To publish by hand (say Workers Builds is down), from a clean checkout of `main`, with Node.js 22.18
or newer for `cf`:

```sh
bunx cf auth whoami   # must show ManyAve's account; if not, `bunx cf auth login` once per machine
bun run check         # the same gate as a pull request
bun run deploy        # builds storybook-static/, stamps version.json, uploads with `cf deploy`
```

The first deploy created the `avenues.manyave.com` DNS record and certificate, because the domain is
on the `manyave.com` zone in the same account. The config also claims the route
`avenues.manyave.com/*`: the zone sends every other subdomain to the neighborhood-sites Worker with a
`*.manyave.com/*` route, which would otherwise answer here instead of Storybook. Every story uses
fictional data, so the whole Storybook is safe to publish; keep it that way.

## Layout

| Path                     | Holds                                                          |
| ------------------------ | -------------------------------------------------------------- |
| `src/styles/tokens.css`  | Palette, type scale, semantic colours, shadows and tints, light and dark (copied from the app). |
| `src/styles/avenue.css`  | Tailwind, the shadcn base layer and the tokens as utilities, with AVE-2's spacing aliases, control heights and corner scale, and the reduced-motion rule for every surface. |
| `src/styles/ui-sdk.css`  | Generated: ui-sdk's default stylesheet with its rules scoped to `[data-ui-sdk-skin]`, loaded first by `avenue.css` (see `scripts/ui-sdk-css.ts`). |
| `src/styles/desktop.css` | The opt-in desktop type scale (compact 14px, meta 13px).        |
| `scripts/`               | The token comparison, the class check, the visual diff and the ui-sdk stylesheet generator. |
| `src/lib/utils.ts`       | `cn`, which knows Avenue's text scale.                          |
| `src/lib/format.ts`      | `formatMoney`, `tintFor` and `initials`, for amounts in text and tints outside an avatar (AVE-8). |
| `src/lib/control.ts`     | The shared field look (`controlSurface`), the AVE-2 height-and-corner pairing (`controlShape`) Button and Toggle use, and control sizes (`controlSize`) for inputs, textareas and select triggers. |
| `src/components/`        | One file per component: the shadcn primitives with ui-sdk behavior, styled to the app (AVE-6, AVE-17), and ManyAve's own components built on them (AVE-8: Status and Count, Money, InitialsAvatar, AskAdmin, EmptyState and SectionEmpty, Toast, Chip and ChipRow, ToolbarButton, NavTab, ModeToggle, SearchInput). Stories in `src/stories/components/`. |
| `src/stories/`           | Storybook sections: Tokens, Foundations, Components, Composites.|

## Spacing and corners

Avenue follows AVE-2's rules. Spacing stays on Tailwind's 4px grid; components use the aliases `inline` (4),
`group` (8), `row-y` (12), `inset` (16), `page` (16, 20 from 640px) and `section` (24), as in `p-inset` or
`gap-group`. Controls use `h-control-xs/sm/md/lg` (24/28/32/40) and controls in one row share a height. Corners
are `rounded-xs/sm/md/lg/xl` (4/6/8/10/14) and `rounded-full` for labels and tokens only; `2xl` to `4xl` are
retired. Each is shown under Tokens in Storybook. Foundations in Storybook says how to use them: colour and status,
type and the 14px floor, spacing, corners, elevation, icons, motion and theming, each with a do and a don't.

## Touch targets

Every control takes a 44 x 44px tap on a phone without being drawn bigger (AVE-22).

**`hit-area`** is a public utility in `styles.css`: Avenue's controls use it, and an app's own controls can too. It
draws nothing: an invisible `::after`, centred, makes the tappable box at least 44px on a coarse pointer and 24px
on a fine one (WCAG 2.2 target size), never smaller than the control. A control that reaches further with a mouse
sets `--hit-area-x` / `--hit-area-y` (Checkbox and Switch `[--hit-area-x:--spacing(3)] [--hit-area-y:--spacing(2)]`,
12px and 8px). Compose it on a positioned element that doesn't clip its own overflow, in place of hand-written
`after:-inset-*`. It owns the control's `::after`: decoration on a control uses `::before` or a child, and
`check:classes` flags `hit-area` with an `after:` class in the same string. Scope it with a variant when a part is
only sometimes a control (Badge: `[a]:hit-area`).

**Spacing between controls on phones.** Two neighbouring controls need their centres at least 44px apart, so
their hit areas meet without overlapping. Between two things you can tap, use `gap-controls`: 8px with a mouse,
16px on a coarse pointer. On phones xs controls are 28px (`h-control-xs`), so 28 + 16 reaches 44 and every larger
size clears it. `gap-group` stays 8px for a label beside its own control, which may overlap harmlessly (a tap there
still reaches the control). Stacked controls don't need the gap: their rows are 44px tall on phones. The story
kit's `Row` uses `gap-controls`, so the stories are measured at real spacing.

**Where an invisible extension can't work, the control grows on coarse pointers only**, so desktop doesn't move:
text fields and the Combobox input (an `<input>` can't carry `::after`), md Select triggers (to match the fields
beside them), menu and list rows, toggle-group items along the group's axis, and table rows and fields that hold a
checkbox or switch are at least 44px there. An sm Select (a card or dialog header) keeps its size: its trigger
takes `hit-area`, and its phone picker's `<select>` lies invisibly over a 44px band. Spaced toggle groups wrap.

**The proof** is in the story tests (`.storybook/touch-targets.ts`). The `touch` project runs the Components and
Composites stories with Playwright's `hasTouch` (so `(pointer: coarse)` matches) and, after each story, hit-tests
a grid of points over the 44px area centred on every enabled control. Each point must land on that control or a
label of it; a point that lands on the page misses (too small), and one that lands on another control fails both
(overlap). The four mouse projects check sizes: every control at least 24 x 24px, and Checkbox, Switch, the dialog
close button and the help button keep their reach (`FINE_MINIMUMS`). A story's `play` that measures sizes reads
`matchMedia("(pointer: coarse)")` for the phone values.

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
- `@manyave/avenue/format`: `formatMoney`, `tintFor`, `initials`.
- Utilities in `styles.css` beyond Tailwind's: the token aliases (`gap-group`, `gap-controls`, `h-control-md`, ...)
  and `hit-area`, the invisible touch target (above). A change to how they behave is an API change.

`react`, `react-dom` and `tailwindcss` are peer dependencies so a consumer never gets a second
copy.
