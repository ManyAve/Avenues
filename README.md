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
| `bun run tokens:native`   | Regenerates `native/AvenueTokens.swift`, `native/AvenueTokens.kt` and `native/tokens.json` from the stylesheets (below, "Native apps"); `test:scripts` fails until you do after changing a token. |
| `bun run native:android`  | Builds the Compose components in `native/android`, runs their unit tests and records their screenshots to `native/screenshots/android/` (below, "Android components"). Needs Java and the Android SDK, so not part of `check`; `native:android:check` fails on a stale screenshot. |
| `bun run ui-sdk:css`      | Regenerates `src/styles/ui-sdk.css` from `@ui-sdk/core`'s `web.css` after an upgrade (`test:scripts` fails until you do). |
| `bun run shadcn:css`      | Regenerates `src/styles/shadcn.css`, Avenue's copy of `shadcn/tailwind.css`, after a shadcn upgrade (`test:scripts` fails until you do). |
| `bun run storybook`       | Starts Storybook at http://localhost:6006 (interactive).        |

The toolbar's theme switch flips the `.dark` class on `<html>`, the same switch the ManyAve app
uses, so every story can be checked in light and dark. The type-scale switch loads `desktop.css`, the
desktop app's 14/13px scale. The surfaces switch sets `data-surface="lifted"` on `<html>` (below). `bun run test:stories` runs every story under each combination of the two
switches, and the Accessibility panel shows axe's results for the open story.

### Lifted surfaces

Avenue's default light page, cards, popovers and sidebar are all white, and its dark `muted` fill is the card's own
colour: right for an app whose cards carry a border, as Management's do. An app whose cards carry no border (Neighbors)
opts into lifted surfaces with `data-surface="lifted"` on `<html>` (AVE-115): the light page steps to onyx-50 under
white cards, light `muted` and `accent` step to onyx-100, and dark `muted` steps to onyx-800, one above the card.
Nothing else changes. The attribute also works on an element that paints its own `bg-background`.
`scripts/surface-contrast.test.ts` holds the floors it exists for (CIEDE2000: card on page 1.5, muted on page 2,
muted, accent, secondary and border on a card 3), and fails if the defaults ever hold them too, since then lifted has
no job left. Phone apps take the same set as `liftedLight` and `liftedDark` in the native tokens.

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
padding, borders, corners, fill, text colour, type (including italic, underline and case), shadow,
outline, transform, gaps and size, and each icon's fill, stroke and size. Pixels decide too, but only where
they can: both captures show the same text, no style differs (an allowed padding change moves every pixel
after it) and the pair isn't a frame (a container's own box); a different sub-pixel offset may account for
at most 32 edge pixels. Every other comparison is judged on styles only, and the summary and report say how
many, so "same" is never read as "looked identical". A difference passes only with an allowance whose
reason says which kind it is:

- `AVE-2 §<n>: …` an agreed spacing or corner fix, or `AVE-13: …`, `AVE-29: …` or `AVE-8: …`, the
  agreed contrast, control-text and selected-chip-check decisions.
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
| `src/components/`        | One file per component: the shadcn primitives with ui-sdk behavior, styled to the app (AVE-6, AVE-17), and ManyAve's own components built on them (AVE-8: Status and Count, Money, InitialsAvatar, AskAdmin, EmptyState and SectionEmpty, Toast, Chip and ChipRow, ToolbarButton, NavTab, ModeToggle, SearchInput; AVE-117: Tabs; AVE-128: Skeleton and Loading). Stories in `src/stories/components/`. |
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

**The proof** is in the story tests (`src/checks/touch-targets.ts`). The `touch` project runs the Components and
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

## Native apps

Neighbors and Management each ship an iPhone app (SwiftUI) and an Android app (Jetpack Compose). ui-sdk renders in
web frameworks only, so those apps can't run Avenue's components; they share its look through its tokens instead,
and build each screen from the platform's own control. `Foundations/Native` in Storybook pairs every component with
the SwiftUI and Compose control to use.

`bun run tokens:native` (`scripts/native-tokens.ts`) writes three files under `native/`, committed and shipped in the
package:

- `AvenueTokens.swift`: `AvenueTokens.light` and `.dark` (each role as `0xRRGGBB`), `.liftedLight` and `.liftedDark`, `TypeScale`, `Radius`, `Spacing`
  and `touchMinimum`, in points, plus `Color.avenue(\.primary)`, which follows light and dark mode. Foundation only
  outside an iOS build.
- `AvenueTokens.kt`: package `com.manyave.avenue`; `AvenueTokens.Light` and `.Dark` (`AvenueColors`), `.LiftedLight` and `.LiftedDark`, `TypeScale` in
  sp, `Radius`, `Spacing` and `TouchMinimum` in dp.
- `tokens.json`: the same values for anything else.

What they hold: every semantic colour role and the four avatar tints, in light and dark, resolved the way the browser
cascades `tokens.css` and converted from OKLCH to sRGB; the app type scale; the five corners; the spacing names and
control heights at their phone values (16 between controls, 28 for an xs control, a 16 page inset); and the 44pt tap
minimum. Names are the web's in camel case (`--card-foreground` is `cardForeground`). Left out on purpose: the palette
ramps, the desktop sidebar, the public site's display type, shadows and the `color-mix` colours, which phones draw
with the platform's own.

An app copies the file it needs from the tag it installs (`node_modules/@manyave/avenue/native/`) into its own
source, with a script, never by hand; Swift and Gradle can't read an npm package, and Avenue never reaches into an
app. A changed token without a regenerated file fails `bun run test:scripts`.

### Android components

`native/android` is a Gradle project holding Avenue's components for Jetpack Compose, in package
`com.manyave.avenue`: `AvenueTheme`, `Button`, `Badge`, `Status`, `Chip` and `ChipRow`, `InitialsAvatar`, `Card`,
`EmptyState` and `InlineMessage`. These are the ones both Android apps rebuild by hand today. Names, options and
sizes are the web's (`Button(variant = ButtonVariant.Outline, size = ButtonSize.Sm)`); behaviour is Android's: each
is built on the Material 3 control (its ripple, focus, TalkBack role and 48dp touch target), styled from
`AvenueTokens.kt`. The iPhone set uses the same names and story slugs.

- `AvenueTheme` puts Avenue's colours, type and corners into `MaterialTheme`, so stock Material controls (text
  fields, switches, dialogs, snackbars) take Avenue's look unwrapped; `Avenue.colors` reads the roles Material has
  no slot for.
- The source compiles with the older of the two apps' toolchains (Kotlin 2.0, AGP 8.9, Compose BOM 2024.12), so an
  app copies `native/android/avenue/src/main/kotlin/com/manyave/avenue/` and `native/AvenueTokens.kt` into its own
  source from the tag it installs, with a script, as with the tokens. It needs `material3`, nothing else.
- `bun run native:android` builds the module, runs its unit tests (tint and initials match the web's) and records
  each component with Paparazzi in light and dark on a 393dp phone, writing
  `native/screenshots/android/<slug>-<light|dark>.png` for the side-by-side stories. `bun run native:android:check`
  fails when a committed screenshot is missing, stale or extra. Both need Java 17+ and the Android SDK (`ANDROID_HOME`
  or `sdk.dir` in `native/android/local.properties`); neither is part of `bun run check`, which runs without them.

### Components for iPhone (AvenueUI)

The components both iPhone apps were drawing by hand are Avenue components on the iPhone too: a Swift package,
`AvenueUI`, in `native/ios/` (`Package.swift` at the repository root). Each keeps the web component's name, options
and look, and the iPhone's own behaviour: VoiceOver, Dynamic Type, and a tap area of at least 44pt that never grows
what is drawn.

| Web                      | SwiftUI                                                                     |
| ------------------------ | --------------------------------------------------------------------------- |
| `Button`                 | `Button("Save") { }.buttonStyle(.avenue(.outline, size: .sm))`, `.disabledReason("Why")` |
| `Badge`                  | `Badge("Past due", variant: .destructive)`                                  |
| `Status`                 | `Status("Paid", tone: .success, filled: false)`                              |
| `Chip`, `ChipRow`        | `ChipRow(overflow: .scroll) { Chip("Open", count: 4, isSelected: $open) }`  |
| `InitialsAvatar`         | `InitialsAvatar(name:, tintKey:, size: .sm)` (the web's tint hash)           |
| `Card` and its parts     | `Card { CardHeader("Title", description:) { action }; CardContent { } } footer: { }` |
| `InlineMessage`          | `InlineMessage(message, tone: .error)` (announced once per new message)      |
| `EmptyState`             | None: the system's `ContentUnavailableView`                                  |

`.avenueTheme()` on an app's root tints the stock controls (toggles, pickers, links) with Avenue's primary. The
module is `AvenueUI`, not `Avenue`, because the Neighbors app already has a type named `Avenue`. Only what both apps
rebuild is here; everything else stays the platform's own control (the `Foundations/Native` table).

An app adds the repository as a Swift package at the tag it uses, the same tag as its web install
(`.package(url: "https://github.com/ManyAve/Avenues", exact: "<version>")`).

**Seeing them.** `AvenueCatalog` shows every component in each of its states with fictional data, for an Xcode
preview or a debug screen. `bun run native:ios` (`scripts/native-ios.ts`, a Mac with Xcode only; `check` doesn't run
it) builds the package for the first iPhone simulator, runs its tests, and renders the catalog in light and dark to
`native/screenshots/ios/<slug>-<light|dark>.png`. Storybook's `Native/*` stories show each one beside the live web
component and the Android capture of the same slug, or "Not built yet" while one is missing. Commit the PNGs it
changes. The captures use the simulator's own fonts, so compare them only across the same Xcode version.

## Using Avenue from another package

The package is source-shipped (no build step) and exposes:

- `@manyave/avenue/styles.css`: Tailwind, the base layer and the tokens. Its Tailwind source
  covers the package's own files, so the consumer needs no extra content paths.
- `@manyave/avenue/tokens.css`: the tokens alone.
- `@manyave/avenue/desktop.css`: the desktop type scale; load it after `styles.css` on desktop surfaces.
- `@manyave/avenue/native/*`: the tokens for the phone apps, as Swift, Kotlin and JSON (below, "Native apps").
- `@manyave/avenue/components/*`: one entry per component.
- `@manyave/avenue/utils`: `cn`.
- `@manyave/avenue/format`: `formatMoney`, `tintFor`, `initials`.
- Utilities in `styles.css` beyond Tailwind's: the token aliases (`gap-group`, `gap-controls`, `h-control-md`, ...)
  `hit-area`, the invisible touch target (above), and `chosen`, the one look of a chosen thing (the primary border,
  the primary-subtle fill and its text), which Chip, a `choice` ToggleGroup and ChoiceCard reach through their own
  state variant (`data-pressed:chosen`, `data-checked:chosen`, `has-data-checked:chosen`; AVE-50). A change to how
  they behave is an API change.

`react`, `react-dom` and `tailwindcss` are peer dependencies so a consumer never gets a second
copy.

What an app installs to build `styles.css`: `@manyave/avenue` itself and the three peers, with Tailwind's Vite
plugin or PostCSS plugin. Not shadcn: Avenue carries its own copy of `shadcn/tailwind.css` (`src/styles/shadcn.css`,
AVE-107), and `tw-animate-css` comes in as Avenue's dependency. An app that has shadcn for its own CLI keeps it; the
two don't clash.

### Versions

An app installs Avenue from a tag, never from `main`:

```json
"@manyave/avenue": "github:ManyAve/Avenues#v0.1.0"
```

A merge to `main` changes Storybook only; no app moves until it changes its tag, in its own pull request, with
the same visual proof as any other change to its screens. Each tag has an entry in `CHANGELOG.md` saying what
changed for apps.

While Avenue is 0.x, the minor number (0.**1**.0) moves on any change an app has to react to, and the patch number
(0.1.**1**) on everything else. A change an app has to react to is any change to:

- a component's props, parts, or `data-slot` names;
- a public utility: `hit-area`, `gap-controls`, `chosen`, the token aliases;
- a token's name, or a class Avenue retires (for example a corner class its scale clears);
- the ui-sdk version or Avenue's patches to it (an app carries the same patches; see below).

A new component, a new token or a bug fix that keeps the API is a patch.

Nobody pushes tags by hand. To release, a pull request raises `version` in `package.json` and adds that version's
`## vX.Y.Z (date)` entry to `CHANGELOG.md`; when it merges, the Release tags workflow
(`.github/workflows/release-tags.yml`) tags the merge commit `vX.Y.Z` and opens a GitHub release with the entry as
its notes. A bump with no changelog entry isn't tagged. The workflow never moves a tag, and each run tags any
earlier version on `main` that is still missing one, so re-running it from the Actions tab (or the next bump)
repairs a failed run. It is Avenue's one GitHub Actions workflow and it is deployment, not a check: it builds and
tests nothing. An app may pin the tag's commit instead (`github:ManyAve/Avenues#<full sha>`), which is just as
fixed; `git ls-remote --tags https://github.com/ManyAve/Avenues` lists each tag's commit.

**ui-sdk patches.** Bun applies `patchedDependencies` only from the project that runs `bun install`, so Avenue's
patches under `patches/` don't apply inside an app. An app copies the same files into its own `patches/` and lists
them under its own `patchedDependencies`, and checks that its copies match the ones in the tag it installs (the
tag's files are at `node_modules/@manyave/avenue/patches/`).

### Checks for apps

An app proves each screen it moves onto Avenue with the same checks Avenue runs on itself (AVE-104, AVE-105). None
is tied to a Storybook version.

- **`avenue-check-patches`**, in the app's `check` script, run from the app's root: fails when a patch in the
  installed tag's `patches/` is missing from the app's `patches/`, differs from it, or isn't under the app's
  `patchedDependencies`. Copy the files across and list each as Avenue's `package.json` does.
- **`avenue-check-classes [paths...]`**: Avenue's class rules over the app's own source (for example
  `avenue-check-classes app/ui`), relative to where it runs. It catches classes that produce no CSS under Avenue's
  theme, such as `rounded-4xl`. Run it over the files a slice moves; an app's unmoved screens may still fail it.
- **`@manyave/avenue/checks/touch-targets`** and **`@manyave/avenue/checks/name-clash`**: plain functions over the
  DOM, to call after a story or a browser test renders a screen:

```ts
import { nameClashes, namedControls } from "@manyave/avenue/checks/name-clash";
import { fineTargetProblems, formatTouchProblems, touchTargetProblems } from "@manyave/avenue/checks/touch-targets";

// With a touch pointer (Playwright's hasTouch, or a coarse-pointer story project): every 44px tap lands on its control.
const touch = touchTargetProblems(document.body);
if (touch.length > 0) throw new Error(formatTouchProblems(touch));
// With a mouse: every hit area is at least 24 x 24px, and Avenue's controls keep their reach.
const fine = fineTargetProblems(document.body);
// Anywhere: no two controls in one place have names an agent reads as the same words.
const clashes = nameClashes(namedControls(document.body));
```

They measure Avenue's controls and ui-sdk's parts (anything with a `data-slot` and a control's role). From
Playwright outside a story runner, bundle them into the page (`page.addScriptTag`) or call them in a browser-mode
test. `.storybook/story-checks.ts` shows how Avenue's own story tests run them after every story.

To move an app onto Avenue, and to report Avenue bugs or ask for features, see [ADOPTING.md](ADOPTING.md): a
ready-to-paste prompt for the app's own Claude.
