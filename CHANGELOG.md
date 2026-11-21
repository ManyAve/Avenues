# Changelog

What changed for apps that install Avenue. See the README, "Versions", for what moves the minor and patch numbers.

## Unreleased

## v0.55.0 (2026-11-21)

- **New component: Command, and the ⌘K command palette** (AVE-197). `@manyave/avenue/components/command` is ui-sdk's
  Command in Avenue's look, as a root and ui-sdk's parts: `Command`, `CommandInput`, `CommandList`, `CommandEmpty`,
  `CommandStatus`, `CommandPage`, `CommandGroup`, `CommandGroupLabel`, `CommandItem` (with Avenue's `destructive`),
  `CommandItemIcon`, `CommandItemText` (marks the matched letters), `CommandShortcut` (⌘P on a Mac, Ctrl+P elsewhere)
  and `CommandSeparator`. The palette is `CommandDialog` with `CommandDialogTrigger` (⌘K / Ctrl+K, not bound on
  touch-first devices), `CommandDialogShortcut`, `CommandDialogContent` (near the top of the screen, no close button)
  and `CommandDialogTitle` (for screen readers). A command that runs closes the palette, after its Promise resolves if
  it returns one, with a spinner meanwhile. The highlighted command wears `bg-accent` (AVE-209). ADOPTING.md, "Command
  palette", has the rules: never the only way to a command, and sends, money and deletes open a confirm dialog. New
  stories under Components / Command; no existing pixels change.

## v0.54.0 (2026-11-21)

- **Undo on a toast, instead of asking first** (AVE-198). `useToast()` gains `toast.undo({ title, onUndo, elsewhere,
  id })`: the toast for something done at once that can be taken back. Undo runs `onUndo`, is reached by F6, pointer
  and an agent, and stays 10 seconds like any toast action. Several in a row with the same `id` stay one toast that
  counts them ("3 notices archived"), never a stack, and its Undo takes back all of them, newest first; a failed step
  keeps the toast and Undo retries only what is left. `elsewhere` is a second line saying where to undo once the toast
  has gone. New `docs/undo-or-confirm.md` says when to offer Undo and when to keep a confirm (money, sends, anything that
  leaves the app, anything with no way back), with examples from Management and Neighbors. Existing toasts are
  unchanged; apps change nothing until a screen adopts it.

## v0.53.0 (2026-11-21)

- **The highlighted item in a list wears a faint tint of the brand colour, not grey** (AVE-209). `accent`, the
  highlighted or hovered item in Menu, Select, Combobox and Calendar's days, is now primary mixed into the popover
  (7% in light, 10% in dark, where 7% sat closer to the popover than the grey it replaces). Its text,
  `accent-foreground`, stays neutral ink. It stays clearly lighter than `primary-subtle`, the chosen look (AVE-50), and
  has no border, so a highlighted row never looks chosen; `scripts/surface-contrast.test.ts` holds that in every theme.
  Table and Register row hover stay on `muted`. Intended pixel change in every open menu and list.
- **New colour `fill`** (`bg-fill`) for a quiet neutral shape a step off its surface: Skeleton, Progress's track,
  Message's quoted reply, the composer's reply banner in dark and an outline Button's hover in dark. These read
  `accent` before, borrowing the hover's grey; they keep that grey under the new name, so none of them moves. Shown in
  Foundations / Colors; the native tokens carry it. **Apps:** a skeleton, track or placeholder shape drawn with
  `bg-accent` turns faintly purple with this release; move it to `bg-fill`. A hover on a list item stays on
  `bg-accent`.
- **A field's focus glow is softer** (AVE-209): Input, Textarea, Select and Combobox draw `ring-ring/20` around the
  primary border, down from `/50`; the border stays the indicator. Under forced colours, where the glow disappears and
  the border takes the system colour, a focused field now draws a 2px outline, which it didn't before.
- New story Select / Highlighted and chosen: Cash chosen, Bank transfer highlighted.

## v0.52.0 (2026-11-21)

- **The theme choice is remembered, with no flash** (AVE-193). New `@manyave/avenue/components/preferences`:
  `createColorScheme()` (ui-sdk's color scheme on `<html>`, saved in local storage under `avenue-color-scheme`),
  `Preferences` (ui-sdk's, which now also puts Avenue's `.dark` on `<html>` and follows the computer under System),
  `usePreference`, and `preferencesScript` / `colorSchemeScript` for the first-paint script in `index.html`, also
  importable from a build config as `@manyave/avenue/preferences-script`. `ModeToggle` takes `colorScheme` to show and
  set it; `value`, `defaultValue` and `onValueChange` work as before. ADOPTING.md, "Remember the theme", has the
  steps. Nothing changes for an app until it adopts it; no pixel changes.

## v0.51.0 (2026-11-21)

- **A dialog's middle can scroll on its own, keeping the title and the actions in view** (AVE-190). New part
  `DialogBody`: put everything between `DialogHeader` and `DialogFooter` in it, and when the content is taller than the
  screen only the body scrolls, so the title stays at the top and the footer's Save stays at the bottom. Before, the
  whole dialog scrolled and both went out of view. A dialog without `DialogBody` is unchanged. Management's
  `DetailDialog` (the board's new-event dialog, MANA-1271) wraps its children in `DialogBody`. `FormDialog` and
  `Drawer` already did this with `FormDialogBody` and `DrawerBody`.

## v0.50.1 (2026-11-21)

- **A swiped toast follows the finger** (AVE-192). ui-sdk already let a toast be swiped down to dismiss it, but
  Avenue's toast sat still under the finger and then vanished. Now it moves with a finger, mouse or pen drag, eases
  back if it's let go short of dismissing, and carries on down as it fades when the swipe dismisses it. Under reduced
  motion it still follows the drag and leaves without the slide. Its text can no longer be selected, so a mouse drag
  that starts on the message swipes instead of selecting. Nothing changes at rest, and apps change nothing.

## v0.50.0 (2026-11-21)

- **A bottom sheet can rest at peek, half and full** (AVE-191). Pass ui-sdk's `snapPoints` to `Drawer`, like
  `[0.25, 0.5, 1]`, with `defaultSnapPoint` for where it opens; give `DrawerContent` a height (`h-[85dvh]`) when full
  should mean the sheet's whole limit. With more than one snap point the handle is ui-sdk's `DrawerHandle`, a button
  named "Resize": a press moves to the next height, the arrow keys step, Home and End go to the ends, and screen
  readers on phones adjust it like a slider. `modalAbove` leaves the page behind usable and undimmed while the sheet
  rests at or below that point. A sheet with one height (every sheet today) keeps the decorative bar, as ui-sdk
  advises, so nothing changes for the apps until they pass `snapPoints`. Stories: Drawer › Resting heights, Page
  usable at peek.

## v0.49.0 (2026-11-21)

- **An agent's changes can be undone as a whole** (AVE-214). An app that turns on ui-sdk's agent bridge and
  `createHistory` can now take back everything the agent did with `undoSource("agent")`, including what Avenue's parts
  change after the app's Promise resolves. Until now those changes ran after the agent's press was over and read
  `"programmatic"`, so undoing the agent missed them. Now they keep the source of the press that started them:
  - `FormDialog` (and `FormDialogRoot`): the close after a resolved `onSubmit`, or `FormDialogAlternate`'s `onClick`,
    reaches `onOpenChange` with the submit's `details.source` (`"agent"` when an agent pressed Save);
  - `PendingConfirmDialog` (and `PendingConfirmDialogRoot`): the close after a resolved `onConfirm` keeps Confirm's
    source;
  - `Composer`: emptying the field after a resolved `onSend` keeps the send's source (an app that controls the text
    sees it in `onValueChange`'s details).
  Nothing to change in the apps; `details.source` reads `"agent"`, or the person's own source, where it read
  `"programmatic"`.
- **A toast action hears how it was pressed.** `useToast()`'s `action.onAction` is typed as ui-sdk calls it,
  `(event, { source })`, so an Undo that awaits can wrap what it changes after the await in `withSource(source, …)`
  (`@ui-sdk/react/observe`). Handlers that take no arguments still type-check.
- **The message list shows to an agent only when it has something to do.** Its log is in the agent's snapshot while
  the reader is scrolled up (Jump to latest) or earlier messages can load, and stays out of it at the end of a whole
  thread (ui-sdk's agent key `shown`).
- Foundations › Agents gains two stories: **History** (the agent fills the form, the person types over one field, and
  "Undo the agent's changes" keeps the person's edit) and **Suggestion** (`stageChanges` tries the agent's values on
  the real controls; `revert()` puts the old ones back).

## v0.48.0 (2026-11-21)

- **A hero step at the top of the type scale** (AVE-189). New size `text-hero`: 48px on a 56px line, for the one big
  line at the top of an expressive page, from a tablet up. On a phone that line takes `text-display` (32px), so write
  `text-display sm:text-hero`. The class rules accept it, `cn` knows it, Tokens and Foundations › Typography show it,
  and the native tokens export it (`TypeScale.hero`). No Avenue component uses it. ADOPTING.md, "Page heroes", has
  what Neighbors moves (NEI-326's AVE-189 literals):
  - the hub title and the pet profile name (36px, 48px from `sm`) and the neighbor profile name (36px) take
    `text-display sm:text-hero` and drop `leading-tight`: 4px smaller on a phone, and the neighbor profile now grows
    from `sm` like the pet profile;
  - the Welcome hero (32px, 48px from `md`) takes `text-display md:text-hero`: the same sizes, on a 56px line (was 48px);
  - the 404 and 401 numbers (60px) take `text-hero`, 48px;
  - the door code (36px mono) is not a hero and keeps its commented literal, with its reason.

## v0.47.0 (2026-11-21)

- **A layer for a sticky toolbar, tab bar or page header** (AVE-187, AVE-188). New utility `z-sticky-bar` (20),
  between `z-sticky` (10) and `z-dock` (40): a toolbar, tab bar or page header stuck to the top, which the sticky
  column headers slide under. Management draws three (the short-screen toolbar, the mobile page header, the
  announcement reader's tabs) at a hand-written `z-20`; write `z-sticky-bar` there instead (MANA-1241). Neighbors'
  hub and marketing site headers (`z-40`, `z-50`) take it too. `cn` knows it, and Tokens/Elevation "Layers" shows it.
  No Avenue component changes.

## v0.46.0 (2026-11-20)

- **The class rules reject raw values where Avenue has a name** (AVE-184; ADOPTING.md, "Raw values and tokens"). An app
  that extends `@manyave/avenue/oxlint` now fails on: a colour typed into a class (`no-hardcoded-colors`), an arbitrary
  value a named class already draws (`no-unnecessary-arbitrary-value`), a literal equal to a theme token or a whole 4px
  step (`prefer-scale-token`; `w-[640px]` is `w-160`, `w-[390px]` stays), `bg-(--card)` for `bg-card`
  (`prefer-theme-tokens`), and, each with its fix in the message, `text-[Npx]`, `text-lg` to `text-9xl`, `font-[NNN]`,
  Tailwind's shadows (`shadow`, `shadow-xs` to `shadow-2xl`), page layers written as numbers (`z-20` and up, `z-[..]`)
  and durations written as numbers. Management (about 320 hits) and Neighbors (about 126) fail today; MANA-1241 and
  NEI-326 move them. Until a folder moves, an override can keep the old checks with the new export
  `gridClassPatterns` (`scaleClassPatterns` holds the new ones; `restrictedClassPatterns` is both).
- **Every token earns its place.** A new script test fails on a token in Avenue's stylesheets with fewer than two
  users, unless a `kept:` comment beside its definition says why (docs/tokens.md). What it decided:
  - `bg-field-filled` and `--color-selection` are gone: one use each (SearchInput's filled tint, the `::selection`
    rule), now commented literals there. Neither app used them, and nothing moves.
  - The twenty `--light-*` variables are gone: each fed one state token, which now holds the value. Nothing moves.
  - **Deprecated: `text-web-hero`, `text-web-hero-narrow`, `text-web-section`, `text-web-card`, `text-web-glyph`.** Only
    Management's public site draws them, so they belong in its own stylesheet as `site-*` sizes (MANA-1243);
    deprecated, removed once both apps have moved off them.
- Avenue's own fixes for the new rules: the phone fades on Chip and TopBar use Tailwind's mask utilities in place of a
  `#000` gradient, Switch and Register write their sizes as steps, and stories moved onto the named weights, type
  steps and `shadow-popover`. Stories only, these move pixels: the Overview's big figures (`text-display`,
  `text-heading`), Select's balance figure (32px, was 28px), the day bar's date and "Today" (14px, was 12px and 11px).

## v0.45.0 (2026-11-20)

- **Components follow Avenue's own elevation, type and motion rules** (AVE-183). These move pixels on purpose:
  - Popover, Menu and its submenus, HoverCard, the Select and Combobox popup, the typing bubble and Dock cast
    `shadow-popover`, the shadow ui-sdk's parts already cast, in place of Tailwind's `shadow-md` and `shadow-lg`.
  - One edge colour for a surface: Card, the popups and the modal surface draw `ring-border`, as SectionCard and
    Toast already did, in place of `ring-foreground/10` (the same in light; a little quieter in dark). Tabs keeps its
    underline as an inset shadow in `border`, because a scrolling list clips a real border.
  - Calendar's weekday letters and MonthGrid's weekday names are `text-meta`, not `text-[11px]`: nothing in Avenue is
    under the 14px floor. MonthGrid's names drop their capitals and letter spacing.
  - Progress fills in `duration-slow` (200ms), not 300ms.
  - Button's outline variant fills with shadcn's `bg-input/30` in dark, not the card's surface.
- **New colour: `control-outline`** (`border-control-outline`), the outline of an unchecked Checkbox, Radio, Switch
  and the Combobox's check box. It holds 3:1 on the page, a card, a popover and a muted fill in every theme and
  surface (`scripts/surface-contrast.test.ts`), and ui-sdk's `--ui-input` reads it. It is the same onyx step as
  `muted-foreground` today, so nothing moves, but it is no longer tied to text: a change to `muted-foreground` leaves
  outlines alone. Exported to native as `control-outline`. To change in the apps: an outline drawn with
  `border-muted-foreground` on a control becomes `border-control-outline`.
- Button's secondary hover stays a commented `color-mix` literal: one use, so not a token (docs/tokens.md).

## v0.44.1 (2026-11-20)

- **A field's placeholder has its own token, and reads dimmer than typed text in dark** (AVE-186). Input, Textarea,
  Search input, Select and Combobox draw their placeholder in the new `--placeholder` token (`text-placeholder`,
  `placeholder:text-placeholder`), shown in Foundations / Colors. Light is onyx-700, the grey it had, so nothing moves there. Dark is onyx-400 (was
  onyx-300, muted-foreground): 2.39:1 from typed text, where it was 1.72:1 and an example could pass for a value, and
  5.49:1 on a card, 6.11:1 on the page and 4.64:1 on lifted muted. `scripts/surface-contrast.test.ts` holds 2:1 and
  4.5:1 in all four themes. The native tokens carry `placeholder` too. muted-foreground is unchanged, so secondary
  text and the AVE-38 control outlines don't move. To change in the apps: a field of the app's own that draws
  `placeholder:text-muted-foreground` moves to `placeholder:text-placeholder`.

## v0.44.0 (2026-11-20)

- **Font weight, motion, layers and the modal overlay have names** (AVE-182). New utilities: `font-quiet` (450),
  `font-emphasis` (550) and `font-heading` (620) beside Tailwind's `font-normal`, `font-medium` and `font-semibold`;
  `duration-fast` (100ms), `duration-moderate` (150ms) and `duration-slow` (200ms), the steps Foundations/Motion
  allows; `z-sticky-group` (5), `z-sticky` (10), `z-dock` (40), `z-overlay` (50) and `z-toast` (70); and `bg-overlay`,
  the 10% black behind Dialog, AlertDialog and Drawer, which ui-sdk's `--ui-overlay` now reads. Every Avenue component
  uses them in place of `font-[550]`, `duration-100`, `z-50`, `bg-black/10` and the rest, at the same values; no pixel moves.
  The top bar's 650 wordmark stays a commented literal, since nothing else draws that weight. `cn`
  resolves each name against its group (`cn("font-emphasis", "font-medium")` gives `font-medium`). New stories:
  Tokens/Typography "Font weight", Tokens/Motion and Tokens/Elevation "Layers". To change in the apps: write the names
  in place of the numbers, using ADOPTING.md's "Weights, durations and layers" table (Management MANA-1241, Neighbors
  when it adopts). Nothing breaks if an app waits: the numbers still work.

## v0.43.0 (2026-11-20)

- **Removed the deprecated names** (AVE-154). Every name Avenue kept as a deprecated alias is gone, now that both
  Management and Neighbors have moved off them: an app at its pinned Avenue typechecks against this release with no
  change (checked on each app before the removal). ADOPTING.md's tables now say "removed in v0.43.0" for each:
  - the shadcn part names (`DropdownMenu*`, `Sheet*`, `TabsTrigger`, `TabsContent`, `DialogOverlay`,
    `RadioGroupItem`, `Toaster`) and the old paths `components/dropdown-menu` and `components/sheet` (AVE-144), and
    `FileName`, `FileThumbnail`, `UploadStatus` (AVE-148);
  - the old prop names: TableFilters `filters`/`onChange`, SortMenu `onChange`, RegisterGroupRow
    `selection`/`onSelectedChange` (and its `GroupSelection` type), ModeToggle `choice`/`onThemeChange` (AVE-145);
    `options` on Select, Combobox and a TableFilters field, and the `SelectOption` and `ComboboxOption` types (AVE-146);
  - the slot props of EmptyState, SectionEmpty, PageHeader, SectionCard, TopBar, StatusBar and ListItem, Callout
    `icon`, InlineMessage `hideIcon`, Progress `trackClassName`, MonthGrid `renderDay`, Calendar `mark`, and the
    `Disclosure` component (AVE-149). These roots now draw only their parts. TopBar no longer adds a Help button of
    its own: put one in `TopBarActions`;
  - MenuItem `variant="destructive"` and `reason`, and the toast option `variant` (AVE-151);
  - `size="default"` and Button's `size="icon"` (AVE-152), and the `WithDefault` type;
  - the `reasons-hang` and `reasons-hang-start` utilities (AVE-160, AVE-162).
- **Stories.** Menu / Deprecated names, Toast / Deprecated variant and the Disclosure stories are gone; the
  disclosure look is Collapsible section / Disclosure. Every other story draws as before, now written with parts.
- **Kept on purpose.** Combobox still reads a `value` of `""` as nothing chosen (AVE-137): that is a value at run
  time, not a name, so a typecheck can't prove an app never passes it, and Management's time-zone picker may.
- **Nothing to change in the apps** at their current pins. An app still on a version before the new names first
  follows ADOPTING.md's tables.

## v0.42.0 (2026-11-20)

- **A tap on a sheet as it fades in no longer closes it** (AVE-180). With reduced motion asked for, a sheet (a phone's
  Select, Combobox or long-list Table filter) opens in place and fades in. A mouse or pen press in its first 150ms was
  read by ui-sdk as grabbing a sheet still rising from the bottom, and closed the sheet as a swipe. A new hunk in
  Avenue's ui-sdk patch lands the sheet where it is drawn when a press arrives during that fade. It is why the Table
  filter's "Long list, sheet open" story sometimes captured with its sheet closed. Nothing looks different.
- **Swap the ui-sdk patch.** In the app, copy `patches/@ui-sdk%2Fcore@0.1.0-beta.13.patch` from the tag over the
  app's copy; `avenue-check-patches` fails until you do.

## v0.41.7 (2026-11-20)

- **`@manyave/avenue/oxlint` ships its types** (AVE-181). `lint/classes.d.mts` types `avenueClasses()` (returns
  oxlint's `OxlintConfig`) and `restrictedClassPatterns`, and the `./oxlint` export names it under `types`, so an app's
  `oxlint.config.ts` typechecks without a declaration of its own (before, it failed TS7016). `oxlint` is now an
  optional peer dependency, since the types come from it. To change in the apps: Neighbors deletes
  `types/avenue-oxlint.d.ts` after bumping to this version; Management needs nothing.

## v0.41.6 (2026-11-20)

- **The public-site text sizes are classes now** (AVE-178). `text-web-hero`, `text-web-hero-narrow`, `text-web-section`,
  `text-web-card` and `text-web-glyph` make their font size (38, 34, 24, 17 and 55px) from Avenue's stylesheet; before,
  Tailwind made no CSS for them, so a class gave no size and oxlint's unknown-class rule failed it. They carry no line
  height of their own, as before: the place that uses one sets it (`leading-*`). The `--text-web-*` variables are
  unchanged. No pixel moves in any component. Nothing to change in the apps.

## v0.41.5 (2026-11-20)

- **ADOPTING.md's class-rule steps are tried on Management** (AVE-179). Followed as written on a copy of Management at
  v0.41.4, they work: Vite+'s `lint` block takes `extends`, and a planted `rounded-2xl`, `rounded-3xl`, `gap-1.5`,
  `max-[700px]:` and `hit-area` beside `after:` each fail `vp lint`. "Class rules" now shows the Vite+ block, says the
  rules need v0.41.0 or newer, names a bare `rounded` as a retired corner too, and shows how to let the app's own
  plain-CSS classes through (`ignorePrefixes`), which Management's public site needs. Only the docs changed.

## v0.41.4 (2026-11-20)

- **The checkbox patch to ui-sdk names its own Avenue card** (AVE-177). The comment in
  `patches/@ui-sdk%2Fcore@0.1.0-beta.13.patch` and the Checkbox story's note now cite AVE-177 instead of the Management
  card it first shipped under. Only a comment changed, so the patched code is the same. An app that copied the patch
  may copy it again from the tag, or keep its copy. ui-sdk's newest release is still beta.13, so the patch stays.
- **The story tests prebundle `cva`**, not `class-variance-authority`, which v0.41.1 replaced with it; Vite had warned
  on every story test run that it couldn't find it. Nothing to change in the apps.

## v0.41.3 (2026-11-20)

- **Storybook builds with Vite 8.4's beta** (AVE-167). Vite, which builds Storybook and runs the story tests, moves
  from 8.3.8 to 8.4.0-beta.1, and its bundler Rolldown from 1.2.19 to 1.3.3. Vite is a dev dependency, so apps don't
  install it from Avenue, and no component, token or story moves. Nothing to change in the apps.

## v0.41.2 (2026-11-20)

- **The token scripts read the stylesheets with PostCSS and convert colours with culori** (AVE-172). The native token
  export and the token comparison drop Avenue's own CSS reader and OKLCH formula. The generated Swift, Kotlin and JSON
  tokens are byte for byte the same. Nothing to change in the apps.

## v0.41.1 (2026-11-20)

- **Variant classes come from cva 1.0's beta** (AVE-170). Avenue's variant helpers (`buttonVariants`, `toggleVariants`,
  `badgeVariants`, the field and control sizes) move from `class-variance-authority` 0.7, which stopped releasing in
  2024, to its successor `cva` 1.0.0-beta.12, through one shared config that runs every result through Avenue's `cn`.
  `buttonVariants({ variant, size, className })` keeps its name and call shape and returns the same classes, so a
  screen that wraps it in `cn()` still works; the wrap is no longer needed, since a `className` passed in now replaces
  the classes it conflicts with. Variant props no longer take `null` (cva 1.0 dropped it); leave the prop out instead.
  No component, token or story looks different. Nothing to change in the apps.

## v0.41.0 (2026-11-20)

- **Avenue's class rules run inside oxlint** (AVE-171). The `avenue-check-classes` command is gone; the same rules
  now come from oxlint-tailwindcss, which reads the app's real Tailwind build. Apps add `@manyave/avenue/oxlint` to
  their oxlint config's `extends` and name their own CSS entry (ADOPTING.md, "Class rules"). What fails:
  - any class that makes no CSS under the theme, with the near name it meant: Avenue's retired corners
    (`rounded-2xl` → "Did you mean rounded-xl?"), typos and missing tokens, which the old command never caught;
  - off-grid spacing (`gap-1.5`, `py-1.25`) and literal breakpoints (`max-[700px]:`), each with its fix;
  - `hit-area` beside an `after:` class in one string (Avenue's own small rule, `avenue/hit-area-after`).
  The rules show as editor squiggles where the oxc extension runs. Nothing to change in a screen that passed the old
  command. No pixel moves: Avenue's four `break-words` became `wrap-break-word`, which makes the same CSS
  (`overflow-wrap: break-word`).

## v0.40.3 (2026-11-20)

- **A toast stays above an open bottom sheet in Chromium 159** (AVE-169). In Chromium 159 (Chrome's next release), a
  toast raised while a bottom Sheet or Drawer was open fell below the bottom of the screen instead of sitting 8px above
  the sheet's buttons: the browser now follows a scrolled anchor only when it is the element's default anchor. The
  toast region now names the sheet's footer as its default anchor, so it sits above the footer in every Chromium. No
  pixel moves in today's browsers. Nothing to change in the apps; they get the fix by installing this version.
- Avenue's story tests, visual diff and parity proof run on Playwright's 1.66 prerelease
  (1.66.0-alpha-2026-11-20) and the Chromium it ships (159.0.8154.13). Run `bunx playwright install chromium` once
  after pulling.

## v0.40.2 (2026-11-20)

- **Display options fits a phone** (AVE-176). At 390px the Row height buttons ran about 25px past the popover's right
  edge, because their three equal columns are wider than a phone. Under 640px the popover now takes the screen's full
  width and the three heights share its row, each at least as wide as its label and check; on a 320px phone,
  Comfortable wraps to a second line rather than spill. Nothing moves from 640px up. Nothing to change in the apps.
  See Composites / Display options / On a phone.

## v0.40.1 (2026-11-20)

- **Avenue type-checks with TypeScript 7.1's beta** (AVE-168). The native compiler Avenue checks its own code with
  moves from 7.0.2 to 7.1.0-beta. It found nothing new to fix, and the full local check passes on it. Only Avenue's
  own type check changes: no component, prop, token or story moves, and the published types are the same. Nothing to
  change in the apps.

## v0.40.0 (2026-11-20)

- **Context menus** (AVE-153). `MenuContextTrigger`, ui-sdk's part, turns an area into a context menu: it opens the
  Menu at the pointer on right-click, on a long press on touch, and from Shift+F10 or the context-menu key when the
  area has focus (give it `tabIndex={0}` and a name). Escape or a choice returns focus to the area, which keeps a
  muted fill while its menu is open. It takes `render`, `disabled` (the browser's own menu shows instead) and
  `payload`. The open menu takes its name from the area, as a dropdown takes its trigger's, and is as wide as its
  longest item, since it opens at a point; it stays a popover on phones. Dropdown menus don't change. ADOPTING.md,
  "Context menus", says how to replace shadcn's or Radix's `ContextMenu`; Neighbors needs it to drop Radix (NEI-213).
  See Components / Menu / Context Menu.

## v0.39.2 (2026-11-20)

- **Storybook deploys with cf 1.0's release candidate** (AVE-166). The `cf` CLI that publishes Storybook to
  avenues.manyave.com moves from 1.0.0-beta.31 to 1.0.0-rc.2, its `latest` release. `cloudflare.config.ts` is
  unchanged and type-checks against the new config package, and a dry-run deploy of the built Storybook passes. Only
  the deploy tool changes: no component, token or story moves. Nothing to change in the apps.

## v0.39.1 (2026-11-20)

- **Checking many boxes at once no longer freezes the page** (MANA-1235). Each checkbox, as its check mark appeared,
  made the browser bring the page's styles and animations up to date twice, so checking 500 boxes in one render (the
  board's "Confirm 501 households") froze the page for about 25 seconds. A new patch to ui-sdk gathers the boxes that
  appear together and does that twice in all: the same 501 boxes now take under a second. Nothing looks different.
- **Swap the ui-sdk patch.** In the app, copy `patches/@ui-sdk%2Fcore@0.1.0-beta.13.patch` from the tag over the
  app's copy; `avenue-check-patches` fails until you do.

## v0.39.0 (2026-11-20)

- **ui-sdk 0.1.0-beta.13** (AVE-164). Avenue now builds on `@ui-sdk/react` and `@ui-sdk/core` 0.1.0-beta.13, up from
  beta.7. ui-sdk renamed no part, prop, callback or `data-slot` between the two, so there is no code to rename in the
  apps.
- **Two things look slightly different, both from ui-sdk.** A dialog that opens onto a text field that already holds
  a value now selects that text, so typing replaces it (Form dialog / With callouts shows its amount selected).
  A tooltip's arrow can sit a fraction of a pixel differently, now that ui-sdk places popups with the browser's own
  anchor positioning; the popup itself still lands on whole pixels.
- **Swap the ui-sdk patch.** In the app, delete `patches/@ui-sdk%2Fcore@0.1.0-beta.7.patch`, copy
  `patches/@ui-sdk%2Fcore@0.1.0-beta.13.patch` from the tag, and list it under `patchedDependencies` as
  `"@ui-sdk/core@0.1.0-beta.13"`; `avenue-check-patches` fails until you do. The new patch is smaller: ui-sdk now keeps
  popups on whole pixels itself, so only the fix for the first click after a dialog closes remains (beta.13 still
  swallows that click). An app that installs ui-sdk itself moves it to beta.13 too.

## v0.38.4 (2026-11-20)

- **Routine tool releases** (AVE-165). lucide-react moves to 1.77 (Avenue now asks for `^1.77.0`), and Avenue's own
  tools move to Bun 1.4.5, oxlint 1.94 and Vitest 5.1.1. No component changes and no story looks different. Nothing
  to change in the apps; an app that pins an older lucide-react gets 1.77 the next time it installs Avenue.

## v0.38.3 (2026-11-20)

- **AvenueUI builds in Swift 6 language mode** (AVE-174). `Package.swift` declares `swift-tools-version: 6.0`, so the
  SwiftUI components and their tests compile with Swift 6's data-race checks. They already did without a warning: no
  Swift source changed, and the catalog screenshots are the same. Language mode is per package, so an app keeps its
  own (Neighbors' 5.9, Management's 6.0); it needs Xcode 16 or later to read the manifest, which both apps' builds
  already use. Nothing to change in the apps.
- The Combobox "Sized by content" story compares the field with a plain text field in the same font instead of a
  fixed 200px (AVE-175). Avenue's sans is the platform's own font, so the field is 170px on a Mac and 200px on Linux,
  and the story failed on every Mac. Storybook and the component don't change.
- The Dialog "Open" story waits for the dialog's opening zoom (from 95%) to finish before measuring the close
  button, so a busy machine no longer fails it at 15px instead of 16px (AVE-175).

## v0.38.2 (2026-11-20)

- **Avenue's Android module builds with the newest tools** (AVE-173): Gradle 9.9.2, Android Gradle Plugin
  9.6.0-alpha04, Kotlin 2.4.21 and Paparazzi 2.0.0-alpha05.1. The component source still compiles in Neighbors:
  Kotlin's language and API level are pinned to 2.0 and the Compose BOM stays at 2024.12.01, so source that needs
  anything newer fails in Avenue first. Kotlin 2.5 can't compile at level 2.0, so the compiler stays on 2.4 until
  Neighbors raises its toolchain. Paparazzi 2.0 renders with Android 16, so the Android screenshots were re-recorded;
  text edges shift by a pixel's antialiasing and nothing else changes. Nothing to change in the apps.

## v0.38.1 (2026-11-18)

- **Selection bar reasons no longer print over each other** (AVE-162). When two neighbouring actions in the
  selection bar are both unavailable, each reason still starts under its own button and runs on under the actions
  after it, but on a line of its own, so the second no longer prints over the first. Neighbouring actions that share
  a reason show it once, as one line under both, and each of those buttons is still described by it for a screen
  reader. No reason sits under the count (AVE-96), the bar's width and the gaps between its actions don't change, and
  a bar with one unavailable action looks as it did. Nothing to change in the apps.
- The `reasons-hang-start` utility is deprecated; removed once both apps have moved off it (AVE-154). Neither app
  uses it.

## v0.38.0 (2026-11-18)

- **The one-tag Combobox picks several values** (AVE-161). `<Combobox multiple items={…} />` takes a list for
  `value` and `defaultValue`, and `onValueChange` gets the new list and ui-sdk's details. Avenue draws the chosen
  values as chips in the field with the search after them, from the same parts as Chips in the field: each chip's
  remove button is named for its value ("Remove Oak Lane"), taps are 44px on a touch screen, and Backspace in the
  empty search removes the last chip. Labels come from `items`, so chips are named before the list ever opens. A form
  gets one entry per value, and a reset returns to `defaultValue`. On a small touch screen the list opens as a sheet
  with the search in its header and the chips behind it, and a pick keeps it open. The search keeps its text after a
  pick (`keepQuery`, true by default) and `maxSelected` caps the list. There is no "none" option, leading icon or
  phone Clear button in this form: an empty list is none, and each chip removes itself. See Components / Combobox /
  Several in one tag. Nothing else moves.

## v0.37.1 (2026-11-18)

- **Toolbar reasons no longer print over each other** (AVE-160). On a page toolbar, a disabled action's reason now
  wraps to its button's width instead of running past it in one line, so three disabled actions side by side (the
  board's Dues toolbar at 1280px, for an association with no households) read as three captions, not one garbled
  line. Neighbouring actions that share a reason show it once, as one line under both, and each of those buttons is
  still described by it for a screen reader. The bar grows by the extra lines a long reason takes. With no disabled
  action nothing moves. Nothing to change in the apps: moving to v0.37.1 fixes the Dues toolbar.
- The `reasons-hang` utility is deprecated; removed once both apps have moved off it (AVE-154). Neither app uses it.
  `reasons-hang-start` (the selection bar's) stays.

## v0.37.0 (2026-11-18)

- **Chips for a multi-pick Combobox with its search in the field** (AVE-159, ui-sdk's "Multiple"). New parts
  `ComboboxChips`, `ComboboxChip` and `ComboboxChipRemove`: `ComboboxChips` is the field (Avenue's field surface, the
  chevron at the end, growing a line at a time as chips wrap), holding a `ComboboxValue` that draws one `ComboboxChip`
  per value and the `ComboboxInput`. A chip is a 20px pill in Badge's secondary look; without children it shows the
  value's label and a remove button named "Remove" and the label ("Remove Oak Lane"), with a 44px tap on a touch
  screen. Backspace in the empty search removes the last chip, the arrow keys move between chips, and Backspace on a
  chip removes it. See Components / Combobox / Chips in the field. Nothing else moves.

## v0.36.0 (2026-11-18)

- **A long table filter opens as a sheet on phones** (AVE-157). A choice field with more than eight values (a board's
  thirty streets) now opens its editor as a bottom sheet on a small touch screen, as Select and Combobox do there,
  instead of a popover: it opens with about seven streets showing and grows to about thirteen with a swipe up or a
  tap on the search (the popover showed six), the sheet sits where a thumb reaches and
  stays above the on-screen keyboard, a tap opens it with the keyboard down, and a swipe closes it. The search sits at
  the top of the sheet, above the operator; a tap on a street ticks it and keeps the search's text. With a mouse, and
  for short lists, nothing changes.
- TableFilters takes `presentation` ("auto" by default, "sheet" or "popover"), as Select and Combobox do, for the long
  list's editor. Nothing to change in the apps.

## v0.35.0 (2026-11-18)

- **Combobox picks several values** (AVE-156). Give the root ui-sdk's `multiple`: `value` and `defaultValue` are then
  lists and `onValueChange(values, details)` gets the new list. A pick toggles the item and keeps the list open, each
  item shows a checkbox's box, and the search keeps its text after a pick (`keepQuery`, on by default in Avenue, so
  several matches of one search go in a row; `keepQuery={false}` empties it as ui-sdk does). `maxSelected` caps the
  count. Nothing changes for a Combobox without `multiple`.
- **New Combobox parts for a search inside the popup** (ui-sdk's "Input in the Popup"): `ComboboxTrigger` opens the
  list and lines it up with itself (give it `render`, like `render={<Button variant="outline" />}`), `ComboboxValue`
  shows the choice, and a `ComboboxInput` inside `ComboboxContent` is the popup's plain search field. The parts form
  also takes ui-sdk's `open` / `defaultOpen` / `onOpenChange`, `onOpenChangeComplete`, `onQueryChange` and
  `controller`. See Components / Combobox / Pick several.
- TableFilters' long-list editor (AVE-155) is now built from these parts. It looks and works as before.

## v0.34.0 (2026-11-18)

- **One size scale** (AVE-152): Button, Toggle, ToggleGroup, Switch, Avatar, InitialsAvatar, Card and Progress take
  xs / sm / md / lg (the steps each has), with md the default, as Select, Combobox and the `h-control-*` tokens already
  did. Nothing on screen moves (visual diff in the pull request).
  - Rename `size="default"` to `size="md"` (or leave it out), and Button's `size="icon"` to `size="icon-md"`. The old
    names still work; deprecated; removed once both apps have moved off it (AVE-154). ADOPTING.md, "One size scale".
  - `data-size` carries `md` where it carried `default`, also when the old name is passed: rename a
    `data-[size=default]` selector to `data-[size=md]`.

## v0.33.0 (2026-11-18)

- **FormDialog and PendingConfirmDialog are a root and parts** (AVE-147), as ui-sdk builds a dialog, with the one-tag
  form kept as a wrapper of those parts (ui-sdk's "Wrap the Parts"). The rules live in the root, so an app that
  composes the parts keeps them. Nothing renamed, the one-tag props are unchanged, and nothing on screen moves (visual
  diff in the pull request).
  - FormDialog: `FormDialogRoot` takes the state (`open`/`defaultOpen`/`onOpenChange`, `onSubmit`, `pending`,
    `pendingLabel`, `holdWhilePending`, `locked`, `dirty`, `error`, `askAdmin`, `slowAfter`, `again`,
    `pendingAnnouncement`). Its parts: `FormDialogTrigger`, `FormDialogContent` (`width`, the form and the "Discard
    changes?" question), `FormDialogHeader` (`icon`), `FormDialogTitle`, `FormDialogDescription` (screen-reader only by
    default), `FormDialogBody` (the fields, off with `askAdmin`, and the error at its end), `FormDialogError` (to place
    the error elsewhere), `FormDialogFooter` (the ask-admin reason and the slow line), `FormDialogCancel`,
    `FormDialogAlternate` (`onClick` may return a Promise) and `FormDialogSubmit` (`disabled` also stops Enter).
  - Submit can't run twice while pending; Cancel, ✕ and Esc ask before discarding a dirty form; nothing closes while
    held or `locked`; a returned Promise drives pending (AVE-150), whether the app composes the parts or uses the one
    tag. A part outside its root logs a `console.error` in development naming the root (it throws in strict story
    tests) and draws itself with no rules in production.
  - PendingConfirmDialog: `PendingConfirmDialogRoot` holds the phases (`phase`, `recovery`, `onConfirm`,
    `pendingMessage`) on Avenue's alert dialog parts, and takes `open`/`defaultOpen`/`onOpenChange` or a `controller`.
    Parts: `PendingConfirmDialogTrigger` (`payload`), `PendingConfirmDialogContent` (children may be a function of
    `{ payload }`), `PendingConfirmDialogHeader`/`Title`/`Description`, `PendingConfirmDialogFooter` (the status line
    and the couldn't-confirm sentence), `PendingConfirmDialogCancel` and `PendingConfirmDialogConfirm` (`pendingLabel`).
  - **`createConfirm()`**, ui-sdk's, is exported from alert-dialog and pending-confirm-dialog (with
    `createAlertDialogController`). Pass `confirm.controller` to `PendingConfirmDialogRoot`, and
    `if (await confirm(row)) …` from a row's handler: it opens one shared dialog with that row as its payload, and
    resolves true only once `onConfirm` resolved (the step happened), false on Cancel or Close. `onConfirm` gets the
    payload.

## v0.32.0 (2026-11-18)

- **Callout and InlineMessage come in parts** (AVE-149, the rest of v0.30.0's layout parts). Nothing on screen moves
  (visual diff in the pull request).
  - **Callout**: `CalloutIcon` (Info when empty; put another icon inside, such as TriangleAlert for a warning) and
    `CalloutContent` (the text).
  - **InlineMessage**: `InlineMessageIcon` (the tone's icon, a spinner while pending; leave it out to hide it) and
    `InlineMessageContent` (the message). The region stays mounted and hidden while the content is empty, as before.
  - Each takes parts when one is among its own children; otherwise its children are the text, as today.
  - **Deprecated** (marked `@deprecated` with what to use): Callout's `icon` and InlineMessage's `hideIcon`. They stay
    until Management and Neighbors no longer use them; AVE-154 removes them then.
  - Markup changes with no change on screen: Callout's icon sits in a `span[data-slot=callout-icon]` (aria-hidden),
    its text in `div[data-slot=callout-content]`; InlineMessage's icon and text spans carry `data-slot`
    `inline-message-icon` and `inline-message-content`.
  - Management and Neighbors: nothing to change now.
  - Phone apps: nothing to take; this is web only.

## v0.31.1 (2026-11-18)

- **No release promises to remove an old name any more** (AVE-158). Old part and prop names stay deprecated aliases
  until both Management and Neighbors have moved off them; AVE-154 checks the apps and removes each one then, in its
  own release. Earlier entries (v0.25.0, v0.26.0, v0.28.0, v0.29.0 and v0.31.0) named a removal version; each now
  carries a correction note, and ADOPTING.md and every `@deprecated` message drop the version too.
  - A script test fails when a `@deprecated` message, a dev warning, or a CHANGELOG, ADOPTING.md or AGENTS.md line
    ties removing an old name to a version.
  - Management and Neighbors: nothing to change, and no deadline. Move off the deprecated names at your own pace.
  - Nothing on screen changes: only comments and docs.

## v0.31.0 (2026-11-18)

- **Menu items and toasts take ui-sdk's names** (AVE-151). A menu item is dangerous with `destructive`, ui-sdk's
  prop, and is styled from the `data-destructive` attribute ui-sdk sets; the line saying why a disabled item is
  unavailable is `disabledReason`, as on Button, Composer and FileField. A toast says what it is about with `type`,
  ui-sdk's toast type: `"success"` (the default), `"error"`, or `"info"` for something under way (what `"progress"`
  was). ui-sdk's `warning`, `loading` and `default` types aren't taken: Avenue has no look for them yet.
  - Deprecated; removed once both apps have moved off them (AVE-154): `MenuItem`'s `variant="destructive"` (use `destructive`) and `reason`
    (use `disabledReason`), and the toast's `variant` (use `type`; `"progress"` is `type: "info"`). Each still works and
    draws the same.
  - The menu item no longer carries `data-variant`; select `[data-destructive]` instead.
  - Button's `variant="destructive"` is unchanged: it picks a look, and ui-sdk has no look props.
  - **Unchanged on screen:** the visual diff shows no change; only the new Deprecated names stories are added.
  - Management and Neighbors: nothing to change now. Rename `variant: "error"` to `type: "error"` in toasts at your
    own pace.
  - *Corrected by AVE-158:* this entry first named a release that would remove the old names. None does: they stay
    deprecated and are removed once both apps have moved off them (AVE-154).
  - Phone apps: nothing to take; this is web only.

## v0.30.0 (2026-11-18)

- **The layout pieces come in parts, like ui-sdk's components** (AVE-149). Each is a root and named parts, each part
  takes `render` and `className`, and today's one-tag props still work, built from those parts. Nothing on screen
  moves (visual diff in the pull request). Callout's and InlineMessage's icons follow in the next release.
  - **EmptyState**: `EmptyStateIcon` (put the icon inside), `EmptyStateTitle` (an h3; `render={<h2 />}` for another
    level), `EmptyStateDescription`, `EmptyStateActions` and `EmptyStateAction` (an outline sm Button;
    `variant="link"` for the quieter one; a link with `render`). The root draws icon, title, line and actions in that
    order whatever order they are written in, and anything else after them, so a screen can't reorder the rule.
  - **SectionEmpty**: `SectionEmptyIcon` (the 40px tile), `SectionEmptyContent` (the text column) with
    `SectionEmptyTitle` and `SectionEmptyDescription`, and `SectionEmptyAction`. Same fixed order.
  - **PageHeader**: `PageHeaderContent` (the text column) with `PageHeaderEyebrow`, `PageHeaderTitle` (the h1),
    `PageHeaderCount` (inside the title: `value`, and `label` for what a screen reader hears after it) and
    `PageHeaderDescription`; then `PageHeaderActions`.
  - **SectionCard** is Card's parts: `<SectionCard><CardHeader><SectionCardTitle>…<SectionCardCount /></SectionCardTitle>
    <CardAction>…</CardAction></CardHeader><CardContent>…</CardContent></SectionCard>`. `SectionCardTitle` is an h2.
  - **TopBar**: `TopBarHome` (the home link: `logo`, `name`, `href`, `onHome`, and `render` for the app's router link),
    `TopBarOrg`, `TopBarNav` (the section links; `aria-label`) and `TopBarActions`. `windowDrag` stays on the root and
    reaches every part. TopBar takes parts when any of its children is one; otherwise its children are the links.
  - **StatusBar**: `StatusBarCount`, `StatusBarHint` and `StatusBarTotals` (`items`); the mode toggle stays a child.
  - **DetailList**: `DetailListItem` with `DetailListTerm` and `DetailListDetail` (`items` still works and isn't
    deprecated: it is ui-sdk's name for data). **ListItem**: `ListItemContent` with `ListItemTitle`, `ListItemMeta` and
    `ListItemNote`, then `ListItemTrailing`.
  - **CollapsibleSection** has a `disclosure` variant: the muted one-line summary Disclosure drew. **Disclosure** is
    now a wrapper of it.
  - **Progress**: write `ProgressTrack` (with a `ProgressIndicator`) yourself to style the track; Progress then draws
    no track of its own, and the track takes the bar's `size`.
  - **MonthGrid**: its children are a function of each day, returning a `MonthGridDay value={day.date}` with what the
    day holds inside, as ui-sdk's CalendarWeeks draws its days.
  - **Calendar** exports its parts in Avenue's look: `CalendarHeader` (Avenue's row) with `CalendarHeading`,
    `CalendarPrevious` and `CalendarNext`; `CalendarGrid`, `CalendarWeekdays`, `CalendarWeekday`, `CalendarWeeks`,
    `CalendarDay` (children go in the day's round, and may be a function of its state) and `CalendarDayMark` (the dot;
    `tint`, or a `bg-*` class; hidden on today). An empty Calendar still draws them all.
  - New: `TitleCount` (status), the count part PageHeaderCount and SectionCardCount are built on.
  - **Deprecated** (each marked `@deprecated` with what to use): EmptyState's `icon`, `title`,
    `description`, `action`, `secondaryAction`, `externalLink` and `headingLevel`; SectionEmpty's `icon`, `title`,
    `line` and `action`; PageHeader's `eyebrow`, `title`, `count`, `countLabel`, `description` and `actions`;
    SectionCard's `title`, `count`, `countLabel` and `action`; TopBar's `logo`, `name`, `homeHref`, `homeRender`,
    `onHome`, `org`, `actions` and `navLabel`; StatusBar's `count`, `hint` and `totals`; ListItem's `title`, `meta`,
    `note` and `trailing`; `Disclosure` (use `CollapsibleSection variant="disclosure"`); Progress's `trackClassName`;
    MonthGrid's `renderDay`; Calendar's `mark`.
    They stay until Management and Neighbors no longer use them; AVE-154 removes them then, in its own release.
  - Markup changes with no change on screen: TopBar's home link carries `data-slot="top-bar-home"`; the EmptyState icon
    is wrapped in a `span[data-slot=empty-state-icon]`; SectionEmpty's tile is `span[data-slot=section-empty-icon]`, no
    longer an IconTile; SectionCard's title is one h2 (Card's title drawn as the heading) instead of an h2 inside a div;
    the StatusBar count always holds its dot, shown only when the bar has a hint.
  - Management and Neighbors: nothing to change now. Move to the parts at your own pace; the deprecated props show
    struck through in your editor.
  - Phone apps: nothing to take; this is web only.

## v0.29.1 (2026-11-18)

- **A table filter searches a long list of choices** (AVE-155). A TableFilters choice field with more than eight
  values, such as thirty streets or every household, now shows a search field above its values when its pill opens,
  as Linear's filter does. Focus starts in the search; typing narrows the list, the arrows move through it, Enter (or a
  tap) toggles a value, and the search keeps its text after a pick, so several matches of "oak" go in a row. Escape
  closes it and focus returns to the pill. Built on ui-sdk's Combobox with `multiple`, its input in the popup, so an
  agent sets the values with `setValue` on the pill. Each value is drawn as the short list's checkbox row; on a touch
  screen each is 44px tall, and the list shows six whole rows and snaps to them.
  - **Unchanged:** a field with eight values or fewer keeps its list of checkboxes, and no prop changed. The visual diff
    changes only the new Long list stories.
  - Management and Neighbors: nothing to change; a long `items` list gets the search when you take this release.

## v0.29.0 (2026-11-18)

- **File field: a root and parts, like ui-sdk's FileInput** (AVE-148). `FileFieldRoot` holds the file, its status,
  progress and error, and the rules that follow from them; its parts read them: `FileFieldLabel`,
  `FileFieldDropzone` (the row), `FileFieldPreview`, `FileFieldName`, `FileFieldTrigger`, `FileFieldRemove`,
  `FileFieldRetry`, `FileFieldReason`, `FileFieldDescription`, `FileFieldStatus`, `FileFieldError` and
  `FileFieldWarning`. Compose them to put the hint above the row, the actions before the name, or the trigger in a
  different place; the focus rule (Remove and Try again hand focus to the trigger, AVE-49) and the error that names
  the file to screen readers (AVE-82) hold in any arrangement. Components / File field / Parts shows it.
  - `FileField` with today's props is now built from those parts. Nothing on screen moves (visual diff in the pull
    request).
  - New: the row takes a dropped file, or one pasted while focus is in it, through the same `accept` and `maxSize`
    checks as the picker. A dashed outline shows while a file is dragged over it (red when it wouldn't be taken).
    While uploading, or with a `disabledReason`, drops and pastes are turned away.
  - A dropped or pasted file reaches `onFileChange` like a picked one; its details' `reason` says `drop` or `paste`.
  - The row's marker moves from `data-slot="file-field-row"` to `data-file-field-row`: the row is ui-sdk's drop zone
    now, and its `data-slot` is ui-sdk's, `file-input-dropzone`.
  - Deprecated; removed once both apps have moved off them (AVE-154): `FileName` (use `FileFieldName`), `FileThumbnail` (use `FileFieldPreview`) and
    `UploadStatus` (use `FileFieldStatus`). Each still works standalone given its old props (`name`, `src`, `status`).
  - *Corrected by AVE-158:* this entry first named a release that would remove the old names. None does: they stay
    deprecated and are removed once both apps have moved off them (AVE-154).
  - Management and Neighbors: nothing to change. Management's documents form keeps `FileField` as it is.
  - Phone apps: nothing to take; this is web only.

## v0.28.0 (2026-11-18)

- **Select and Combobox take `items` in ui-sdk's shape, and come in parts** (AVE-146).
  - **Rename** (the old names still work, marked `@deprecated`; removed once both apps have moved off them (AVE-154)): Select's and Combobox's `options` →
    `items`; a TableFilters field's `options` → `items`; the types `SelectOption` → `ListItem` and `ComboboxOption` →
    `ComboboxItemData`. The entries are the same.
  - *Corrected by AVE-158:* this entry first named a release that would remove the old names. None does: they stay
    deprecated and are removed once both apps have moved off them (AVE-154).
  - **More in `items`:** plain strings, groups `{ type: "group", label, items }` and separators `{ type: "separator" }`,
    as ui-sdk's `ListData`. A value may be an object, with `itemToValue` (the id it is known and posted by),
    `itemToLabel` and `isItemEqualToValue`. Select's OS picker on phones shows the groups as its own.
  - **Parts**, styled as the one-tag forms, nested as ui-sdk's Composition shows. Select: `SelectTrigger` (with its
    chevron, and `size`), `SelectValue`, `SelectContent` (with the sheet's handle), `SelectItem` (with its check),
    `SelectGroup`, `SelectGroupLabel`, `SelectSeparator`. Combobox: `ComboboxInput` (the whole field: icon, search,
    the phone's clear button and the chevron), `ComboboxContent`, `ComboboxEmpty`, `ComboboxList`, `ComboboxItem`
    (with its check, and `meta` for right-aligned text), `ComboboxGroup`, `ComboboxGroupLabel`, `ComboboxSeparator`.
    `Select` and `Combobox` are the root when they have children, and the one-tag form when they don't, as ui-sdk's
    own roots are.
  - **Kept:** the one-tag Select opens the OS picker on a touch screen; built from parts it opens the sheet, because
    the OS picker can only be drawn from data (AVE-39). The sheet, the 44px rows and targets, Combobox's "none"
    option, its stand-in label behind the sheet and its form reset are unchanged.
  - TableFilters still edits a choice filter with checkboxes, not a Combobox: changing that would move its pills'
    look, and this release moves no pixels (visual diff in the pull request).
  - Management and Neighbors: rename `options` to `items` when you take this release; nothing else needs to change.
    `src/type-tests/picker-call-sites.tsx` keeps your current call sites compiling.
## v0.27.0 (2026-11-17)

- **A returned Promise drives pending** (AVE-150), as ui-sdk's Button and a dialog Close part's `action` do. Apps no
  longer have to keep a separate `pending` or `phase` in step with their own request.
  - FormDialog: `onSubmit` (and `alternate.onSubmit`) may return a Promise. While it runs the dialog is pending exactly
    as with `pending` (submit off with its `pendingLabel`, held, the slow line after `slowAfter`); resolved, it closes;
    rejected, it stays open and the rejection's message shows in the error slot (Avenue's "We couldn’t save this…"
    when it has none), so reject with the sentence to show. `pending` and `error` stay and win when set.
  - PendingConfirmDialog: `onConfirm` may return a Promise and `phase` is now optional ("ready" by default). While it
    runs the dialog is pending; resolved, it closes (it never goes back to asking about a step that is done); rejected,
    the outcome is unknown and `recovery` shows, with Try again running it again. A `phase` of "pending" or "unknown"
    wins. Give the call a timeout that rejects.
  - New `pendingAnnouncement` on FormDialog (default: `pendingLabel`) and Composer (default "Sending"), ui-sdk's name:
    what a screen reader hears once a save or send has run for a second. An empty string says nothing.
    PendingConfirmDialog needs none: its status line takes focus and says `pendingMessage`.
  - The close after a resolved Promise reaches `onOpenChange(false, details)` with reason `"action"`, ui-sdk's reason
    for a resolved Close action, and can be canceled there.
  - Resolve only when the work happened. A handler that catches its own failure and resolves closes the dialog; keep
    such a handler returning nothing and passing `pending` and `error`, or let it reject.
  - Nothing renamed, nothing on screen moves (visual diff in the pull request). Composer's `onSend` already took a
    Promise; its type now says so.

## v0.26.0 (2026-11-17)

- **State and change callbacks take ui-sdk's names, and every callback gets ui-sdk's change details** (AVE-145). ui-sdk
  calls each callback as `on<Key>Change(value, details)`, where `details` holds the reason, the DOM event, the source
  (`"keyboard"`, `"mouse"`, `"touch"`, `"agent"`…) and `cancel()`. `source: "agent"` is how an app tells an agent's
  change from a person's. Several Avenue callbacks dropped `details` or had names of their own; now none do.
  - **Rename** (the old names still work, marked `@deprecated`; removed once both apps have moved off them (AVE-154)):
    - TableFilters: `filters` → `value`, `onChange` → `onValueChange`. It also takes `defaultValue` and holds the
      filters itself.
    - SortMenu: `onChange` → `onValueChange`. `value` may now be left out, with `defaultValue` instead.
    - RegisterGroupRow: `selection` → `checked` (`"all"` is `true`, `"some"` is `"indeterminate"`, `"none"` is
      `false`) and `onSelectedChange` → `onCheckedChange`.
    - ModeToggle: `choice` → `value`, `onThemeChange` → `onValueChange`. It also takes `defaultValue`, and `defaultDev`
      beside `dev` / `onDevChange` (Dev is a second piece of state on the same root, so it keeps ui-sdk's `<key>` /
      `default<Key>` / `on<Key>Change` form).
  - **Details passed on unchanged** from ui-sdk: Select, Combobox, Disclosure, FormDialog's and PendingConfirmDialog's
    `onOpenChange`, DisplayOptionsDensity, FileField's `onFileChange`, and every change inside TableFilters' pills.
    The types come from ui-sdk: `ChangeDetails` and each component's reason union, re-exported as
    `SelectValueChangeDetails`, `ComboboxValueChangeDetails`, `ThemeChangeDetails`, `DevChangeDetails`,
    `SortChangeDetails`, `TableFiltersChangeDetails` and `FormDialogOpenChangeDetails`.
  - **Changes Avenue makes itself report like ui-sdk's**, through ui-sdk's own `dispatch`: the OS picker of Select
    (reason `"item-press"`, the select's `change` event), SortMenu (`"item-press"`, Clear `"clear-press"`),
    RegisterGroupRow's collapse (`"trigger-press"`), adding (`"item-press"`) and removing (`"remove-press"`) a
    filter, and a Combobox's form reset (`"reset"`).
  - **`details.cancel()` works** wherever Avenue holds the state: an uncontrolled Select's OS picker puts the old value
    back, and Combobox, ModeToggle, SortMenu, TableFilters and FormDialog keep their old state. As in ui-sdk, a
    controlled component ignores it, since the next value comes from you.
  - Still controlled only, on purpose: PendingConfirmDialog's and RegisterGroupRow's `open`. The app closes the dialog
    when its step succeeds and hides the street's rows itself, so neither can work uncontrolled.
  - `src/type-tests/change-details.ts` fails the typecheck, naming the prop, if an exported `on<Key>Change` callback
    loses ui-sdk's details.
  - *Corrected by AVE-158:* this entry first named a release that would remove the old names. None does: they stay
    deprecated and are removed once both apps have moved off them (AVE-154).
  - Management and Neighbors: rename the props above when you take this release; nothing else needs to change, since a
    callback that ignores its second argument still works. Nothing on screen moves (visual diff in the pull request).

## v0.25.0 (2026-11-17)

- **Parts take ui-sdk's names** (AVE-144). Each part Avenue exports is now named for the ui-sdk part it wraps, so a
  name in ui-sdk's docs is the name in Avenue: `Menu`/`MenuItem` (was `DropdownMenu`/`DropdownMenuItem`),
  `Drawer`/`DrawerContent` (was `Sheet`/`SheetContent`), `TabsTab`/`TabsPanel` (was `TabsTrigger`/`TabsContent`),
  `DialogBackdrop` (was `DialogOverlay`), `Radio` (was `RadioGroupItem`) and `ToastRegion` (was `Toaster`). Menu and
  Drawer move to `components/menu` and `components/drawer`. ADOPTING.md, "Renamed parts", has the full old-to-new table.
  - Nothing breaks yet: every old name is a deprecated alias of its new part, and `components/dropdown-menu` and
    `components/sheet` re-export the new files. Both are deprecated; removed once both apps have moved off them (AVE-154).
  - *Corrected by AVE-158:* this entry first named a release that would remove the old names. None does: they stay
    deprecated and are removed once both apps have moved off them (AVE-154).
  - Nothing on screen moves, and no `data-slot` changes (visual diff in the pull request).
  - Storybook: "Dropdown menu" is now Components / Menu and "Sheet" is Components / Drawer.
  - `bun run visual:diff` takes `--renamed old=new` story id prefixes, for a branch that renames a story title.
  - Phone apps: nothing to take; this is web only.

## v0.24.0 (2026-11-17)

- **ui-sdk 0.1.0-beta.7** (AVE-142). `@ui-sdk/react` and `@ui-sdk/core` move from beta.2 to beta.7, so the next
  cards (ui-sdk part names, `items`, change details) are built against ui-sdk's newest docs and types. Nothing on
  screen moves (visual diff in the pull request); `src/styles/ui-sdk.css` is regenerated and stays scoped to
  `data-ui-sdk-skin`.
  - Patches: two of the three remain, re-made for beta.7 in one file,
    `patches/@ui-sdk%2Fcore@0.1.0-beta.7.patch`: the closing backdrop (AVE-109) and whole-pixel popups (AVE-21).
    The toast patch (AVE-43) is gone: beta.7 leaves an empty toast region out of the agent snapshot itself.
  - The Combobox story pin to `presentation="popover"` stays: beta.7's `checkPattern` still fails ui-sdk's own
    Combobox presenting as a sheet (AVE-75).
  - Management and Neighbors: set `@ui-sdk/react` and `@ui-sdk/core` to exactly `0.1.0-beta.7`, delete
    `patches/@ui-sdk%2Fcore@0.1.0-beta.2.patch`, copy `patches/@ui-sdk%2Fcore@0.1.0-beta.7.patch` from the tag, and
    list it under `patchedDependencies` as `"@ui-sdk/core@0.1.0-beta.7"`. `avenue-check-patches` fails until you do.
  - Phone apps: nothing to take; this is web only.

## v0.23.0 (2026-11-17)

- **Every component passes your props through to its root** (AVE-138). Twelve components took a fixed list of props and
  dropped the rest, so an app couldn't give them a ref (to focus or measure them), a `data-testid`, an
  `aria-describedby` or an id of its own. Now each passes the props it doesn't use itself to its root element, as
  ui-sdk parts do, and takes `ref` as a plain prop (React 19, no `forwardRef`):
  - InlineMessage, Disclosure, FileField, ModeToggle, InfoTip and ToolbarActions: to the element on the page.
    InlineMessage, ModeToggle and ToolbarActions also take `render`, like every part Avenue draws itself.
  - DisplayOptions: to its popover, where its `className` already went. DisplayOptionsSection (also `render`) and
    DisplayOptionsDensity: to the section and the row-height group.
  - PendingConfirmDialog: to the dialog itself. An `onKeyDown` of the app's runs first, and Tab stays held while the
    step is pending.
  - RegisterGroupRow and RegisterAddRow: to their row. The grid owns a row's `id`, as on RegisterRow.
  - The component's own role, state and `data-slot` win over the app's, so an app can't switch off what makes it work.
    InfoTip and PendingConfirmDialog take no `aria-describedby`: the tip and the description already describe them.
  - TitleWithCount is unchanged: it draws no element of its own, only the title and count inside a heading, so give
    the heading the ref or id.
  - Disclosure, FileField and InfoTip no longer pass an Avenue `data-slot` to their ui-sdk root. It never reached the
    page (ui-sdk's own, `collapsible`, `field` and `tooltip-trigger`, always won), so nothing on screen changes.
  - Management and Neighbors: nothing to change. A test can now tag these with `data-testid`, and a field can point
    `aria-describedby` at an InlineMessage by its own id.
  - Phone apps: nothing to take; this is web only.

## v0.22.2 (2026-11-17)

- **The selection bar's disabled reason sits with its button, not the count** (AVE-96). A reason such as "Set this
  year's assessment first." used to end at Request dues's right edge and run left, under "1 household selected", where
  it read as the count's caption. It now starts at the button's left edge and runs right, under the actions. The page
  toolbar's reasons are unchanged.
  - Management and Neighbors: nothing to change; take the new tag.
  - Phone apps: nothing to take; this is web only.

## v0.22.1 (2026-11-17)

- **Toast** (AVE-140): a toast shown from `useToast()` with no `ToastProvider` above it used to vanish without a word.
  It still shows nothing, but in development the first one now logs a `console.error` naming `ToastProvider` (once
  per page), and under ui-sdk strict mode (story tests) it throws, so a screen that forgot the provider fails its
  tests. A production build stays silent and never breaks a screen. Calling `useToast()` alone never warns.
  Management and Neighbors: nothing to change; if the error shows up, wrap the app in one `<ToastProvider>`.

## v0.22.0 (2026-11-17)

- **Empty-state actions can be links** (AVE-139). An action that goes somewhere ("Add a household", "See all
  documents") was a button with `onClick={() => navigate(...)}`: it couldn't open in a new tab, didn't show its
  address, and read as a button to a screen reader. Now:
  - EmptyState's `action` and `secondaryAction`, and SectionEmpty's `action`, also take `href` (a plain link with the
    button's look) or `render` (the app's router link, such as `render={<Link to="/households/new" />}`, so navigation
    stays client-side). `render` wins over `href`. A disabled link can't navigate and leaves the tab order.
  - They also take `confirm`, drawn as `data-agent-confirm`, for an action an agent must not take alone.
  - `{ label, onClick }` works as before and looks the same. SectionEmpty's `onClick` is now optional.
  - Management and Neighbors: where an empty state's action navigates, swap `onClick={() => navigate(...)}` for
    `render={<Link to="..." />}`. Nothing else to change.
  - Phone apps: nothing to take; this is web only.

## v0.21.0 (2026-11-17)

- **Combobox** works on its own in a plain form, the way Select does (AVE-137).
  - `value` and `onValueChange` are now optional. Leave them out and pass `defaultValue` (or nothing), and the field
    manages its own choice. Controlled use works as before.
  - `name` posts the chosen value with the form (ui-sdk's hidden input), `required` holds the submit until something
    is chosen, and `form` joins a form elsewhere on the page. A form reset returns to `defaultValue`. The none option
    (`noneLabel`) posts `name=`, like a native select's empty option; nothing chosen posts nothing.
  - **"Nothing chosen" is now `null`**, as in Select and ui-sdk. `onValueChange` gets `null` when the none option is
    picked or the phone's Clear is pressed, where it used to get `""`. `value=""` still means none for this release;
    pass `null` instead before the next one.
  - Upgrading: a handler typed `(value: string) => void` no longer fits `onValueChange`. In Management that is
    `app/ui/components/household-picker.tsx` (`onValueChange={(id) => onChange(id ?? "")}`) and
    `app/ui/components/time-zone-picker.tsx` (already skips an empty value: `(zone) => zone && onChange(zone)` keeps
    working). State held as `useState("")` becomes `useState<string | null>(null)`.
  - Neighbors: no Combobox in use yet. Phone apps: nothing to take.
  - Look: unchanged (`bun run visual:diff`).

## v0.20.0 (2026-11-17)

- **Message list** (AVE-132), reworked after review:
  - The "New message" / "N new messages" pill now floats over the bottom of the list, as Slack and iMessage draw it,
    instead of taking its own row under the list. While the reader is scrolled up, the list's bottom edge fades out
    under the pill, so a message is never cut off at a hard line. At the end there is no pill and no fade, so the
    newest message is never covered. The pill is an outline button on the popover surface with a shadow.
  - `typing` is now drawn as a typing bubble: three dots that rise in turn, on the same fill as others' bubbles,
    with the words beside it ("Ana is typing"). It takes no room while nobody types. New `typingAvatar` puts the
    typer's 28px avatar beside it, lined up with the runs' avatars. The dots stay still under reduced motion. Pass
    the words without an ellipsis; the dots stand in for it.
  - Management and Neighbors: nothing to change unless you pass `typing`; then drop the trailing "…" and pass
    `typingAvatar`.
- Stories: the message list draws Avenue's bubbles (AVE-133) and composer (AVE-134) in place of stand-ins, and its
  Default story is now compared with Management's board chat window by `bun run parity` (the frame matches, with the
  agreed 10px to 12px side padding).
- `bun run parity`: a frame pair keeps the app's size even when its box fills a flex column.

## v0.19.0 (2026-11-17)

- **Dock** (AVE-135), new in `@manyave/avenue/components/dock`: the messenger-style windows pinned to the bottom right
  of a wide screen, each with a header that folds it away, its own actions and Close. Nothing existing changes.
  - `<Dock>` holds the windows, newest first (it sits nearest the right edge). Each is
    `<DockWindow label="Ana Ruiz">` with a `DockWindowHeader` (a `DockWindowTrigger` holding the leading avatar or icon,
    `DockWindowTitle` and `DockWindowBadge count={3}`, then `DockWindowActions` and `DockWindowClose`) and a
    `DockWindowBody`. `width="wide"` is the inbox's 416px.
  - Folding is ui-sdk's Collapsible: the fold button reports `aria-expanded` and `aria-controls`, Enter and Space fold
    it, and folding with focus inside puts focus back on it. Folded, the body stays mounted and hidden, so a
    half-typed message survives and Tab skips it. Control it with `open` and `onOpenChange`, or `defaultOpen`
    (open by default).
  - A window is a named region, not a dialog: no focus trap, no backdrop, and Escape does nothing at window level.
    Close is "Close <label>" and only calls its `onClick`; the app removes the window and moves focus back to what
    opened it, such as its launcher.
  - The unread pill is hidden from screen readers; the fold button reads "Ana Ruiz, 3 unread". "99+" past 99.
  - On a phone (below 640px) a window spans the width and the windows stack, the newest at the bottom, where
    Management squeezes them side by side. The header's buttons grow 16px apart on a touch screen so their tap areas
    don't overlap. Whether to show a dock on a phone at all stays the app's call.
  - Look: Management's frame, the same box and header (`bun run parity`: 12 of 12 the same).
  - Management: `ChatDock` and `DockWindow` in `app/ui/components/chat.tsx` become these; `minimized` and `onToggle`
    become `open` and `onOpenChange`, and the hand-written `hidden` body becomes `DockWindowBody`.
  - Neighbors: the Card-based messages dock moves to this frame, which changes its fill and corners to Management's.
  - Phone apps: nothing to take; native chat screens use the tokens only.

## v0.18.0 (2026-11-17)

- **Every part Avenue draws itself takes `render`** (AVE-136), like every ui-sdk part, so an app can change its
  element without fighting the classes. Nothing looks different, and leaving `render` out renders what it did before.
  - Card: `<Card render={<article />}>` and `<CardTitle render={<h3 />}>` (pick the level that fits the page), so screen
    reader users can move between cards by heading. Also CardHeader, CardDescription, CardAction, CardContent and
    CardFooter.
  - Table: every part. On `Table` it changes the `table`; the container around it stays a `div`.
  - Dialog, AlertDialog, Sheet and Popover headers and footers, and SheetBody (a footer can be a `form` or `footer`).
  - FieldContent, FieldTitle, FieldSeparator; AvatarBadge, AvatarGroup, AvatarGroupCount; DropdownMenuShortcut;
    RegisterHeader, RegisterBody, RegisterSelectColumn; ToolbarFilters, ToolbarControls; Count; Callout; FileName,
    FileThumbnail; Money; IconTile; ChipRow; AskAdmin.
  - Their props are now `OwnPartProps<tag>` (the element's props plus `render`), so existing code type-checks as is.
  - A linter's heading-has-content rule can't see that the part passes its children into `render={<h3 />}`; it may
    need a disable comment on that line.
  - ChipRow and the others also combine a `ref` you pass with their own, instead of replacing it.
  - The prop-driven composites (PageHeader, TopBar, StatusBar, EmptyState, SectionEmpty, DetailList, ListItem) keep
    their element: their markup is the point.
  - Management and Neighbors: nothing to change. Where a screen wraps a heading inside CardTitle, it can drop the
    wrapper for `render`. Neighbors' `asChild` on these parts becomes `render` when it adopts them.
  - Phone apps: nothing to take; this is web only.

## v0.17.0 (2026-11-17)

- **Chat composer** (AVE-134), new in `@manyave/avenue/components/composer`: the reply box under a chat. Nothing
  existing changes.
  - `<Composer onSend={send}><ComposerField aria-label="Message Ana Ruiz" placeholder="Message" /><ComposerSend /></Composer>`.
    The field is Avenue's Textarea (ui-sdk's) and grows from one line to 112px, then scrolls. Enter sends, Shift+Enter
    adds a line, and Enter while an input method is composing does nothing. `onSend` gets the trimmed text.
  - Focus stays in the field after every send, by Enter or by Send. In both apps today, clicking Send left focus on a
    button that then disabled itself, so it dropped to the page.
  - A plain return from `onSend` empties the field at once (an optimistic send). A promise keeps the text, read-only,
    until it resolves, and empties it only then; a rejected one keeps the text so nothing is lost. Showing why it was
    refused stays the app's.
  - Send is disabled while the field is empty or a send is pending. It stays reachable by Tab and tells a screen
    reader why ("Type a message first.", "Sending…").
  - `<ComposerContext onCancel={…}>Replying to <b>Ana Ruiz</b>: …</ComposerContext>` above the field is the reply
    banner; `kind="edit"` makes it the edit banner and turns Send into "Save edit" with a check. Escape in the field
    cancels the banner, and only when there is one, so Escape still reaches a dock or dialog otherwise. Cancelling an
    edit empties the field.
  - Pass `value` and `onValueChange` to the field to control it (an edit puts the message's text in), or leave it
    uncontrolled. `disabledReason` on `Composer` turns it off and says why under it.
  - Look: Management's chat footer, compared with `bun run parity`. The one difference is the field's corner: the
    app asks for `rounded-2xl`, a step the shared theme retired (AVE-2), so its chat field draws square corners today;
    Avenue's is `rounded-xl` (14px), the pill both apps meant at one line. The field is 32px at one line (was 34) to
    match Send, and field and Send sit `gap-controls` apart (was 6px). On a phone the field and Send are both 44px
    tall and the field's text is 16px, so iOS doesn't zoom. In dark the banner is `bg-accent`, not `bg-muted`, which is
    the chat window's own colour there.
  - Management: replace the raw `<textarea>` and Send in `ChatWindow`'s footer (`app/ui/components/chat.tsx`) with
    these parts; `sendsOnKey` and the Escape handler go, and the reply/edit banner becomes `ComposerContext`.
  - Neighbors: when adopting, `ChatComposer` becomes `Composer` with `onSend` returning the send promise; the comment
    thread's reply field can use it too.
  - Phone apps: nothing to take; the native chat screens take tokens only.

## v0.16.0 (2026-11-17)

- **Chat messages** (AVE-133), new in `@manyave/avenue/components/message`: one sender's run of messages and each
  message in it, in Management's board chat look. Nothing existing changes.
  - Parts: `MessageRun` (`from="me" | "them"`, `sender`) holds `MessageRunAvatar` (28px, theirs only) and
    `MessageRunContent` (the column, at most 82% of the row), which holds `MessageRunSender` (the name over a group
    run) and one `Message` per message. A `Message` (`deleted`, `delivery="sent" | "pending" | "failed"`, `edited`,
    `time`) holds `MessageQuote` (`sender`, `deleted`), `MessageRow` (`MessageBubble` and `MessageActions` side by
    side), anything the app adds under it, `MessageStatus` and `MessageMeta`.
  - Who spoke is text, not only side and colour: every bubble starts with hidden "You:" or "Ana Ruiz:", and the drawn
    name is hidden so it is read once. The full `time` ("Thursday, November 12, 4:28 PM") is hidden text at the
    bubble's end, since a description on a paragraph isn't read in browse mode and a `title` can't be reached by
    touch. A quote reads "Replying to <sender>:".
  - States carry text: a deleted message draws "Message deleted" and never its body; `MessageStatus` says "Sending…"
    (polite) or "Not sent" (an alert) beside the app's Retry and Delete (give Delete `data-agent-confirm`).
  - `MessageActions` is a slot for the app's own controls (react, reply, options): it fades in on hover and focus
    and always shows on a touch screen, where a message with actions gains 4px above and below so 44px targets
    don't overlap. Reactions, the options menu, run grouping and day labels stay in the apps.
  - Management: replace `MessageRun` and `Bubble` in `app/ui/components/chat.tsx` with these parts. Same look but
    for AVE-2's grid (corner 14px, not 16; 8px top and bottom padding, not 6, so a one-line bubble is 36px) and three
    contrast fixes: a sending bubble is greyed (`saturate`) instead of 60% opacity, which took its text to
    2.9:1; "edited" is no longer faded (3.4:1); and the reply quote's fill is `bg-accent`, which shows on the dark
    window (`bg-muted` is the window's own colour there). Name each action by its message ("Reply to Ana Ruiz").
  - Neighbors: replace `MessageBubble` in `features/community/messages/conversation-thread.tsx`. The fill becomes
    `foreground/10` and the corner `rounded-xl` (14px) with no tuck, for parity; the hidden sender prefix it already has
    is now built in.

## v0.15.0 (2026-11-17)

- **Message list** (AVE-132), new in `@manyave/avenue/components/message-list`: a chat thread's scrolling messages,
  newest at the bottom, on ui-sdk's `createStickToBottom`. Nothing existing changes.
  - `<MessageList aria-label="Messages with Ana Ruiz" count={messages.length} newest={last.key} newestMine={last.mine}>`
    with the app's rows inside, oldest first, and `<MessageListDay>Today</MessageListDay>` between days. Put it in a
    box with a height; the log takes the room left and scrolls.
  - It follows new messages while the reader is within 48px of the end, or when the newest is their own. Scrolled
    up, it keeps their place and shows "New message" / "N new messages" under the log, in the flow (above the app's
    composer, never over the last bubble). Pressing it scrolls down (instantly under reduced motion) and leaves focus
    in the log.
  - `hasEarlier`, `loadingEarlier` and `onLoadEarlier` draw "Earlier messages" at the top; history added after a press
    lands above without moving the view. While loading it reads "Loading…" and keeps focus.
  - `status="loading" | "failed" | "ready"`: the log mounts only at `ready`, so a screen reader doesn't hear the
    history read out as new. `failed` shows the line and Try again (`onRetry`); `empty` is the app's words for a
    thread with no messages; `typing` ("Ana is typing…", or "") is a polite status under the log, never logged.
  - Accessibility: a WAI-ARIA `log` with `aria-relevant="additions"`, named by `aria-label` or `aria-labelledby`, and
    one Tab stop so the keyboard can scroll it. Agents can call `jumpToLatest` and `loadEarlier`.
  - Spacing is Management's chat window on the 4px grid: 4px between rows, 12px at the sides (the window's 10px).
  - Management: the board chat window's scroller (`app/ui/components/chat.tsx`) becomes this. It gains the log role,
    keyboard scrolling and the jump button, and loading earlier messages stops moving the view.
  - Neighbors: the thread's `Timeline` becomes this; its "N new messages" button and follow rule are the same, and
    the hand-written scroll code goes.
  - Phone apps: nothing to take; native chat screens use the tokens only.

## v0.14.0 (2026-11-17)

- **Status dot** (AVE-130), `StatusDot` in `@manyave/avenue/components/status`: the small filled circle that marks
  needs attention, unread or now. Its tones are Status's (`success`, `warning`, `destructive`, `primary`, `info`,
  `neutral`) plus `current`, which takes the text colour around it, so a dot always matches the Status pill of the
  same tone. `size` is `sm` (6px, the default) or `md` (8px); `ring` adds a 2px page-coloured halo for a dot over an
  icon or avatar. It is hidden from screen readers, because the row, chip or nav item around it says what it means;
  when the dot is the only signal, pass `label` ("unread") and it is read as visually hidden text. Never focusable.
  Status now draws its own dot with it, with no visible change.
  - Management: take v0.14.0 to replace the hand-written dots on the announcement delivery chips and the activity
    "now" line.
  - Neighbors: when adopting, its StatusDot becomes this one; `muted` is `neutral`, and a dot that is the only
    signal passes `label` instead of `aria-hidden={undefined}` and a child.
  - Phone apps: nothing to take. Native Status (Android and AvenueUI) already draws the same 6px dot from the same
    tones; no native standalone dot is added.

## v0.13.0 (2026-11-17)

- **Progress bar** (AVE-129), new in `@manyave/avenue/components/progress`, on ui-sdk's Progress. Nothing existing
  changes.
  - `<Progress value={40}><ProgressLabel>Uploading the budget</ProgressLabel><ProgressValue /></Progress>`: the label
    at the start of the line, the percent at the end, a 6px pill under both with a `bg-primary` fill. Name every bar:
    a `ProgressLabel` (add `className="sr-only"` to hide the words) or `aria-label` on `Progress`. `value={null}` (or
    no value) is indeterminate: a highlight sweeps the track and screen readers hear no percent. `min`, `max`,
    `format` and `getValueLabel` ("3 of 12 households, 25%") come from ui-sdk.
  - `size="xs"` is a 4px bar with square ends, to lay along an edge (`className="absolute inset-x-0 bottom-0"` on a
    photo while it uploads).
  - The track is `bg-accent`, not `bg-muted`: on dark cards muted is the card's own colour, so the empty part of the
    bar vanished. Motion (the fill easing, the sweep) stops under reduced motion.
  - No live region: inside FileField, FileField's own upload announcements stay the only ones.
  - Management: replace the hand-written `role="progressbar"` on the activity card (`app/ui/components/activity.tsx`)
    with `<Progress value={card.progress * 100} aria-label=…>`. Same size and fill; the track becomes visible in dark.
  - Neighbors: replace `apps/web/src/design-system/ui/progress.tsx` (the composer's photo upload bar) with
    `size="xs"`; its `bg-primary/20` track becomes `bg-accent`.

## v0.12.2 (2026-11-17)

- **Table filters** (AVE-123 follow-up, from CodeRabbit's review of #125): two pills that read the same words are
  told apart in their names ("Filter: Neighbor contains (2)"), so an agent or a screen reader can pick one.
  `applyFilters` ignores a filter whose field is named like an Object method ("constructor") instead of throwing.

## v0.12.1 (2026-11-17)

- **Foundations › Moving from older tokens** (AVE-127): the page now says that Tailwind's own `text-xs` and `text-sm`
  grow too, because Avenue points them at `meta` and `compact` (12px to 14px and 14px to 16px on the web scale; 13px
  and 14px on the desktop scale). It adds how to keep hierarchy when `text-sm` matches `text-base` and `text-xs`
  matches `text-meta` (muted colour or a heavier weight, never a smaller size typed back in), and how to check badges,
  chips and tabs with fixed heights against their longest label. Story only: no token, class or component changes.
  - Neighbors: read it before the type-scale switch (NEI-204); it is the biggest part of that change.

## v0.12.0 (2026-11-17)

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
  - Management: take v0.12.0 to move app/ui/components/table-filter.tsx and GroupHeading's checkbox onto Avenue, and
    to read shared/lib/tableFilters.ts's rules from `@manyave/avenue/table-filters`.
## v0.11.0 (2026-11-17)

- **Loading skeleton** (AVE-128), new in `@manyave/avenue/components/skeleton`. Nothing existing changes.
  - `Skeleton` is one placeholder shape, filled `bg-accent` with a slow pulse that stops under reduced motion.
    `shape="text"` is one line as tall as the text it stands for (give it the text class, such as `text-meta`, and
    a width), `"circle"` an avatar (`size-8`), `"block"` (the default) anything else (`h-*`). `SkeletonText lines={3}`
    is a paragraph whose last line is shorter.
  - `Loading label="households"` wraps the shapes: it marks the region `aria-busy` and gives screen readers one polite
    "Loading households", instead of nothing or one bar at a time. Every shape is hidden from them, and the region is
    `inert`, so nothing inside it takes focus or a click. Replace the
    whole `Loading` with the content when it arrives.
  - Show it after about 300ms, at the real layout's size, for loads of a second or more where the layout is known.
  - Neighbors: replace `apps/web/src/design-system/ui/skeleton.tsx` (23 files). The fill stays `bg-accent`, and each screen's shapes go inside a `Loading` with a label.
  - Management: optional. The "Loading…" lines on screens whose layout is known can become a `Loading` of shapes.

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
