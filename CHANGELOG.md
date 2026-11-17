# Changelog

What changed for apps that install Avenue. See the README, "Versions", for what moves the minor and patch numbers.

## Unreleased

## v0.11.0 (2026-11-16)

- **Table filters** (AVE-123), `@manyave/avenue/components/table-filter`: Linear-style filters for a table, from
  Management's Households and Dues toolbars (MANA-1168). `TableFilters` takes the table's `fields` (text, number,
  money or choice), the `filters` and `onChange`; a Filter button lists the attributes, and each filter shows as a
  pill ("Dues status is any of Owing, Partial") that opens to change its operator and value, with × to remove it.
  Filters are ANDed. Put it in `ToolbarFilters` or a `PhoneToolbar`'s `filters`, so the pills join the toolbar's
  arrow keys. The rules come with it at `@manyave/avenue/table-filters` (`applyFilters`, `matchesFilter`,
  `isComplete`, `filterOps`, `opLabel`, `dollarsToCents`), the same rules as the app's shared/lib/tableFilters.ts.
  Changes from the app: the attribute list is a ui-sdk menu (arrows, type-ahead, an agent's `press`), choosing one
  opens the new pill with focus on its value, Escape returns focus to the pill, removing one moves focus to the
  Filter button, and on a touch screen the pills and × are 44px tall.
- **Register street select** (AVE-123): `RegisterGroupRow` takes `selection` ("none" | "some" | "all") and
  `onSelectedChange`, and leads with a checkbox that selects or clears only that street's rows, half-checked while
  some are. List those bars in the Register's new `groupSelectRows` instead of `spanningRows`: the checkbox is the
  bar's column 0 and the rest its column 1, so the arrows reach both. With a mouse it shows on hover or focus, while
  any of the street's rows is selected and while any row in the table is; on a touch screen it always shows
  (MANA-1174). A named departure from the app: the checkbox sits in the selection column, lined up with the rows'
  checkboxes, and is named "Select all on Birch Lane", because an agent reading "Select Birch Lane" would also match
  "Select 12 Birch Lane". A bar without `selection` is unchanged.
  - Management: take v0.11.0 to move app/ui/components/table-filter.tsx and GroupHeading's checkbox onto Avenue, and
    to read shared/lib/tableFilters.ts's rules from `@manyave/avenue/table-filters`.

## v0.10.0 (2026-11-16)

- **Collapsible section** (AVE-121), `@manyave/avenue/components/collapsible-section`: a full-width row that opens a
  section of its own, on ui-sdk's Collapsible. `CollapsibleSection` (root, `variant`), `CollapsibleSectionHeader`
  (the row's look, with room for a summary beside the trigger), `CollapsibleSectionTrigger` and
  `CollapsibleSectionPanel`. Variants from the board's three hand-drawn rows: `bar` (the activity list's sticky day
  header), `fold` (the time grid's quiet-hours fold, which may leave the panel out because its hours draw in the
  grid) and `plain` (a message row whose card draws the chrome; the trigger's children can read `open`). The
  Disclosure stays for a muted one-line summary.
- **Calendar** (AVE-121), `@manyave/avenue/components/calendar`: a month to pick a day from, on ui-sdk's Calendar,
  in the look of the board's small month under the Activity title. One Tab stop, arrows by day and week, Page Up and
  Down by month, Enter picks; each day is named by its full date. `mark(date)` puts a dot under a day (a background
  class or a tint). Days of the months either side are `muted-foreground`, not the board's 60% fade, which fails
  4.5:1 contrast. On a phone days grow to 44px, so it needs 308px.
- **Month grid** (AVE-121), `@manyave/avenue/components/month-grid`: the board's Activity month as a grid with one Tab
  stop, on ui-sdk's grid focus (ui-sdk's Calendar pages a month at a time and can't hold an endless run of weeks).
  The arrows move by day and week and run on across weeks, Home and End go to the week's ends, Control+Home and
  Control+End to the first and last day, Page Up and Down by four weeks. `renderDay(date)` puts the app's content
  under a day's number; a day given content passes focus to its first button, such as a popover trigger over its
  items. Past the first or last week `onExtend("earlier" | "later")` asks for more weeks, and focus lands on the
  day it was going to. It has no scroll of its own: keep the app's scroll region, title tracking and jumps.
  - Management: take v0.10.0 to move the Activity day header and fold, the Messages row, the small month and the
    month view (activity.tsx, activity-timegrid.tsx, messages.tsx, activity-month.tsx). The month view's day trigger
    is named "Thu, Nov 12: 5 items · $1,800.00 received" while it shows "5 paid", which fails WCAG 2.5.3 (Label in
    Name); name it from its chips with the date in hidden text, as the Month grid story does.
  - Neighbors needs nothing: its own collapsible has no importers, and its calendars are FullCalendar's day grid,
    which does more (events across days) than the Month grid; moving them is a separate call.

## v0.8.0 (2026-11-16)

- **Tabs** (AVE-117): `Tabs`, `TabsList`, `TabsTrigger` and `TabsContent` from `@manyave/avenue/components/tabs`,
  on ui-sdk's tabs. The app's `line` look only: text tabs, 16px between labels, a 2px underline under the chosen one
  on a 40px list with a bottom line. One Tab stop into the list, arrow keys move and choose, Home and End jump, a
  disabled tab still takes focus. A list wider than its space scrolls sideways; on a phone it is 48px tall with labels
  24px apart, so every tap area is 44px. Horizontal only. Parts keep ui-sdk's data-slot names (`tabs-tab`,
  `tabs-panel`, not shadcn's `tabs-trigger`, `tabs-content`); the chosen tab carries `data-selected`.
  - Management: the announcement composer moves from `./ui/tabs` to Avenue's (MANA-1125). Drop `variant="line"`,
    `border-b` and the triggers' `flex-none px-0`, and set the list's padding to `px-3` (each tab keeps 4px inside
    the list for its focus ring, so `px-3` puts the labels within 1px of where `px-5` did). Then delete `app/ui/components/ui/tabs.tsx`.
  - Neighbors: nothing to do; its own `tabs.tsx` has no user yet. Use Avenue's when a screen needs tabs.
  - Phone apps: nothing; Tabs is web only.

## v0.7.0 (2026-11-16)

- **Lifted surfaces, opt-in** (AVE-115). `data-surface="lifted"` on `<html>` gives a tinted page under white cards and
  quiet fills that show on a card: light `background` onyx-50, light `muted` and `accent` onyx-100, dark `muted`
  onyx-800 (one step above the card instead of equal to it). Without the attribute nothing changes. It works on any
  element that paints its own `bg-background` too.
  - Neighbors: set `data-surface="lifted"` on `<html>` and delete the surface overrides in `apps/web/src/styles.css`
    (both the `:root:not(.dark)` and `:root.dark` blocks). Its `check-contrast.ts` reads only plain `:root` and
    `.dark` blocks, so teach it the two lifted selectors too, or it measures the defaults. Lifted keeps Avenue's white card, border, input and
    shadow, so cards get a touch brighter and lines a touch lighter than today's overrides; its contrast check
    (`check-contrast.ts`) passes on it: card on page 2.89, muted on card 5.73 light and 4.20 dark.
  - Management needs no change: its cards carry a border, so it stays on the default surfaces.
  - Phone apps: `AvenueTokens.liftedLight` / `.liftedDark` (Swift), `AvenueTokens.LiftedLight` / `.LiftedDark`
    (Kotlin) and `lifted` in `tokens.json`. AvenueUI's `AvenueTheme` doesn't pick them yet (follow-up card), so a
    phone app that wants them passes them in itself.

## v0.6.1 (2026-11-16)

- **Select takes `aria-labelledby`** (AVE-98), for a select named by visible text it doesn't own, such as a column
  header plus its row ("Role for person 1"). Nothing an app already uses changes.
- **The At a glance page follows its own rules** (AVE-98). Each of its 16 cards has an h2 under the page's h1, so
  heading keys move from card to card, and the Invite the board rows show "Email" and "Role" column headers that
  name each field. Storybook only.

## v0.6.0 (2026-11-16)

- **TopBar lets the app handle its home link** (AVE-110). New props, nothing existing changes:
  - `onHome` runs on a plain click or Enter on the home link instead of following `homeHref`. A cmd, ctrl, shift or
    alt click still follows the link, so home can open in a new tab or window.
  - `homeRender` swaps the home link for the app's own, such as its router's link, the way NavTab's `render` does.
    It keeps the bar's name, classes and look.
  - `windowDrag` makes the bar the desktop window's drag area (`-webkit-app-region: drag`), with the home link, the
    section links and the actions left clickable, and the bar's text unselectable while the window moves. A
    browser ignores it.

  Management can drop its wrapper that catches clicks on the bar and matches the home link by its label: pass
  `onHome` (or `homeRender` with its router link) and, in the desktop window only, `windowDrag`. Its own
  `[data-window-header]` rules for the window controls' inset can stay. Neighbors needs no change.

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

## v0.4.4 (2026-11-16)

- **Popovers and menus stay on a phone screen** (AVE-112). `PopoverContent`, `HoverCardContent`,
  `DropdownMenuContent` and its submenus are never wider than the room beside their trigger, less an 8px margin, so
  one given a fixed width (`w-80`, `w-96`) wraps its text on a 320px phone instead of running off the right edge.
  Tooltip keeps its 320px cap within that room, and Display options' 320px minimum gives way to it too. Wider
  screens are unchanged. Management can drop the `max-w-[calc(100vw-1rem)]` it adds to its five popups.
- **Combobox shrinks to a narrow column** (AVE-113). Its text field's default width no longer sets the minimum of a
  column sized by its content, so a Combobox in a `grid` card on a 390px phone keeps the card on screen. Where a row
  sizes to its content, the field keeps the width it had. Management can drop `grid-cols-[minmax(0,1fr)]` on its
  join-request card.

## v0.4.3 (2026-11-16)

- **`styles.css` builds in an app without shadcn installed** (AVE-107). It imported `shadcn/tailwind.css`, which only
  resolved because the app happened to install shadcn itself. Avenue now carries that stylesheet byte for byte, so
  the built CSS is unchanged and nothing looks different. An app can drop shadcn if it only had it for Avenue;
  Management and Neighbors keep theirs for the shadcn CLI, and need no change beyond taking this version.

## v0.4.2 (2026-11-16)

- **Outline buttons in dark take the card's surface** (AVE-99). They filled with the page colour, which is darker than
  a card, so on every card they read as holes. Hover and open now go one step lighter (`accent`). Light is unchanged.
  Management's own outline button has the same fill, so its screens change in dark when they take this version.
- **Avatar groups keep every avatar's initials readable** (AVE-99). An avatar covers at most a quarter of the one
  before (4px at the default size, was 8px), the ring between them is the card's colour, and a covered avatar's
  initials centre in the part that shows. Default-size initials in a group use the meta size, as small ones did.

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
