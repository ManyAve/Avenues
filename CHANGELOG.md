# Changelog

What changed for apps that install Avenue. See the README, "Versions", for what moves the minor and patch numbers.

## Unreleased

## v0.5.0 (2026-11-16)

- **Every optional prop now takes `undefined`** (AVE-108). ui-sdk declares its optional props without
  `| undefined`, so in an app with `exactOptionalPropertyTypes` on (Management) a maybe-undefined value failed with
  TS2375: `<Button onClick={onSave}>`, `<Dialog onOpenChange={onClose}>`, `<Checkbox disabled={locked}>` and
  about 630 other props across 86 components. Each component now accepts `undefined` for every optional prop and
  passes it on as if left out. The typecheck fails if a prop rejects `undefined` again.
- **Components that wrap their children take plain `children`**: Badge, Chip, Status, Dialog / Alert dialog /
  Sheet content, Tooltip content, the dropdown menu's items and sub-content, and Toggle group. Their type used to
  allow a function of ui-sdk's state, which these components would have drawn as a function, and which an app
  couldn't pass on as a `ReactNode`. Badge, Nav tab and Choice card title also take a plain `className` and `style`
  (they have no state for a function to read).
  - **Apps react:** Management can delete the loosening in `app/ui/avenue.ts` (`loose`, `plain`, `defined`) and
    import Button, Dialog, Badge, Toggle, Switch, the menu parts, Popover and Hover card triggers straight from
    Avenue. Its Checkbox (`indeterminate` and a boolean `onCheckedChange`) and DialogContent (a ref for
    `initialFocus`) wrappers are app conveniences, not type workarounds; keep them or move them into Avenue on a
    new card. `nativeButton` is a Base UI prop that ui-sdk doesn't have: drop it, `render={<a href=… />}` alone makes
    a link.

## v0.4.1 (2026-11-16)

- **FormDialog covers what the board's DuesForm does** (AVE-120), so the board's forms can move onto it. Nothing an
  app already uses changes: a pending save is still held by default.
  - After 8 seconds of `pending` (`slowAfter`), a line in the footer says the save is slow and will finish, in the
    app's words (MANA-1039). `again="record"` adds "so don't record it again".
  - `holdWhilePending={false}` for a save that finishes on its own: Cancel stays on and closing doesn't ask
    "Discard changes?". `locked` holds the dialog shut whether or not it is saving (the app's `preventClose`).
  - With `askAdmin`, the fields are disabled too, not only submit (MANA-953).
  - `submitDisabled` turns submit off while not saving, e.g. during an upload.
  - `alternate={{ label, onSubmit }}`: a second submit before the main one ("Save & prepare letter").
  - `closeOnly`: a single Close button and no ✕, for a dialog with nothing to submit.
- **Callout**: the board's info and warning note (`#avenue/components/callout`, or `@manyave/avenue/components/callout`).
  Its top and bottom padding is 8px, not the app's off-grid 10px (AVE-2).

## v0.4.0 (2026-11-16)

- **Dropdown menu: an item's `onClick` now runs from Enter and Space as well as a click** (AVE-111). ui-sdk fires
  its own `onClick` for a pointer only, so an item wired to it closed the menu from the keyboard and did nothing.
  `DropdownMenuItem` routes `onClick` through ui-sdk's `onSelect`, once per choice, with the DOM event that chose
  the item, so its type is now `(event: Event) => unknown`, not a React mouse handler. A handler that reads
  `event.currentTarget` or a mouse-only field changes; one that ignores the event, or only calls `preventDefault`,
  doesn't. `onSelect` stays the preferred name. An app that maps `onClick` to `onSelect` itself (Management's
  `app/ui/avenue.ts`) can drop that wrapper.

## v0.3.0 (2026-11-16)

- Dialog, Alert dialog and Sheet (AVE-109): the first click on the page after a dialog closes now lands, even while
  the dialog is still fading out. ui-sdk swallowed a press on a closing dialog's backdrop, so after Cancel, Escape or
  a submit, a person who moved straight on to a link had to click it twice. A double click outside a dialog still
  closes it with the first click only: the second lands on the fading backdrop, not the page under it.
  - **Apps react:** Avenue's ui-sdk patch changes, so copy `patches/@ui-sdk%2Fcore@0.1.0-beta.2.patch` from the tag
    into the app's `patches/` (`avenue-check-patches` fails until you do), run `bun install`, and clear Vite's cache.
    Tests that wait for a dialog to detach before the next click (Management's AVE-109 workaround) can drop the wait.

## v0.2.0 (2026-11-16)

- **The content-width token `grid` is now `layout`** (AVE-114): `max-w-grid` becomes `max-w-layout`, still 1280px,
  and `--container-grid` becomes `--container-layout`. The old name made Tailwind give the class `inline-grid` an
  80rem width as well as `display: inline-grid`, so every inline-grid badge or tile in an app that loads Avenue's
  stylesheet stretched to 1280px. An app that used `max-w-grid` renames it; an app that worked around the bug with
  `--container-grid: initial` drops the workaround.

## v0.1.5 (2026-11-15)

- Status: a `destructive` tone, for the board's "Needs attention" (an announcement whose emails didn't go out),
  with the app's colours: a red dot outlined, or a red tint filled. Nothing an app already uses changes. The Android
  and AvenueUI Status keep their five tones for now.

## v0.1.4 (2026-11-15)

- Toast (AVE-118). Nothing an app already uses changes.
  - `variant: "progress"`: something started that hasn't finished, such as a send. A send icon instead of the check;
    timed and announced like a success.
  - `focus: true` moves focus to the action as the toast shows, for when the control the person used is gone (a
    removed section's Undo).
  - `--avenue-toast-bottom` lifts the toast above a bar pinned to the bottom edge, such as a status bar: set it to the
    bar's height and the toast sits 8px above it.
- Android components (README, "Android components"). Nothing an app already uses changes.
  - `native/android`: `AvenueTheme`, `Button`, `Badge`, `Status`, `Chip`, `ChipRow`, `InitialsAvatar`, `Card`,
    `EmptyState` and `InlineMessage` for Jetpack Compose, with the web's names and options, on Material 3 controls.
  - `bun run native:android` records their Paparazzi screenshots to `native/screenshots/android/`;
    `bun run native:android:check` fails when they are stale.
- AvenueUI, Avenue's SwiftUI components for the iPhone apps (README, "Native apps"). Nothing an app already uses
  changes. `Package.swift` at the repository root makes the repository a Swift package; add it at the tag and
  `import AvenueUI`.
  - Button (`.buttonStyle(.avenue(variant, size:))`, `.disabledReason(_:)`), Badge, Status, Chip and ChipRow,
    InitialsAvatar, Card (CardHeader, CardContent, footer), InlineMessage, and `.avenueTheme()` for stock controls:
    the web's names, variants, sizes and look, with the iPhone's own behaviour (VoiceOver, Dynamic Type, 44pt taps).
  - `AvenueCatalog` renders each one; `bun run native:ios` (on a Mac) turns the catalog into the screenshots that
    Storybook's `Native/*` stories show beside the web component and the Android one.

## v0.1.3 (2026-11-15)

- Native tokens for the iPhone and Android apps (AVE-101; README, "Native apps"). Nothing an app already uses changes.
  - `native/AvenueTokens.swift` (SwiftUI, `Color.avenue(\.primary)`), `native/AvenueTokens.kt` (Compose,
    `com.manyave.avenue`) and `native/tokens.json`, generated by `bun run tokens:native` from `tokens.css` and
    `avenue.css`: the colour roles and avatar tints in light and dark, the type scale, corners, phone spacing and
    the 44pt tap minimum, under the web's names. `@manyave/avenue/native/*` exports them.
  - Storybook's `Foundations/Native` pairs each component with the SwiftUI and Compose control a phone app builds it
    from.

## v0.1.2 (2026-11-14)

- Checks for apps (AVE-104, AVE-105; README, "Checks for apps"). Nothing an app already uses changes.
  - `avenue-check-patches`: fails when the app doesn't carry or list Avenue's ui-sdk patches, or its copies differ.
  - `avenue-check-classes [paths...]`: Avenue's class rules (retired corners, off-grid spacing, `hit-area` with
    `after:`, literal breakpoints) over the app's own source.
  - `@manyave/avenue/checks/touch-targets` and `@manyave/avenue/checks/name-clash`: the 44px tap measure, the mouse
    minimums and the name-clash check, as plain DOM functions an app's story or browser tests call.

## v0.1.1 (2026-11-14)

- Toast: `showWith`'s returned function types its options in full, so an app's type check no longer fails on
  `action` (TS7031) when it reads Avenue's source (found installing Avenue in Management, MANA-1118). No API change.

## v0.1.0 (2026-11-14)

The first version an app can install (AVE-103).

- 49 components, the tokens, `styles.css`, `desktop.css`, `cn` and the formatting helpers, as listed in the README
  under "Using Avenue from another package".
- ui-sdk `0.1.0-beta.2` (`@ui-sdk/core` and `@ui-sdk/react`), pinned exactly. An app must not install another
  version.
- One patch to `@ui-sdk/core` that an app must carry too: `patches/@ui-sdk%2Fcore@0.1.0-beta.2.patch` (an empty
  toast region left out of the agent snapshot, AVE-43; popups placed on whole device pixels, AVE-21).
- Peer dependencies: `react` and `react-dom` `^19.3.0`, `tailwindcss` `^4.3.0`.
- Classes Avenue's stylesheet retires: Tailwind's own corner sizes (for example `rounded-4xl`) produce no CSS,
  because Avenue's corner scale replaces them. Find and replace them in the app before loading the stylesheet (AVE-105 makes Avenue's class check runnable from an app).
