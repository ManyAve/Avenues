# Adopting Avenue in an app

This page is for the Management and Neighbors teams, and for their Claude. The prompt below is ready to paste into a
Claude session opened in the app's own repository. It explains how to start using Avenue, and how to report Avenue
bugs and ask for new things.

The full rollout plan is AVE-100 in Linear ("Plan moving Management and Neighbors onto Avenue"). Each app's slices
are filed as cards there: Management MANA-1118 to MANA-1132, Neighbors NEI-202 to NEI-213.

## The prompt

```text
We are moving this app's UI onto Avenue, ManyAve's design system. Avenue is a public repository,
github.com/ManyAve/Avenues, and its Storybook is live at https://avenues.manyave.com. Work through
the steps below in order and stop where a step says to.

1. Read before you change anything
   - Avenue's README.md (especially "Using Avenue from another package", "Versions", "Touch
     targets" and "Spacing and corners"), CHANGELOG.md, AGENTS.md and ADOPTING.md, at the tag you
     will install.
   - The rollout plan, Linear AVE-100: Part A is for both apps, Part B is Management, Part C is
     Neighbors. Then this app's slice cards (Management MANA-1118 to MANA-1132, Neighbors NEI-202
     to NEI-213). Each card names the screens it moves, the changes it is allowed to make, and the
     proof it needs.
   - Browse the matching components in Storybook before replacing one of this app's primitives.

2. Check that you are allowed to start
   - No slice starts until Zack has agreed to the rollout. If you can't find his agreement on
     AVE-100 or this app's slice 0 card (MANA-1118 or NEI-202), stop and ask him.
   - Slice 0 needs an Avenue tag. Run `git ls-remote --tags https://github.com/ManyAve/Avenues`.
     If v0.1.0 (or a later tag) isn't there, or AVE-103, AVE-104 and AVE-105 aren't Done, stop and
     say so. Do not install from `main` or from a commit instead.

3. How Avenue goes into the app
   - A Bun Git dependency pinned to a tag, never `main`:
     "@manyave/avenue": "github:ManyAve/Avenues#v0.1.0"
   - Import `@manyave/avenue/styles.css` (Tailwind, the base layer and the tokens; the app's own
     stylesheet stops importing Tailwind itself), `@manyave/avenue/desktop.css` on desktop surfaces
     only, and one component at a time from `@manyave/avenue/components/<name>`. `cn` is in
     `@manyave/avenue/utils`, and `formatMoney` is in `@manyave/avenue/format`.
   - One copy each of React (^19.3), Tailwind (^4.3) and ui-sdk (exactly the version Avenue pins).
     Never add ui-sdk at another version.
   - Carry Avenue's ui-sdk patches in this app's own `patchedDependencies`. Bun doesn't apply a
     dependency's patches, so without them the fixes silently don't apply here. README "Versions"
     says how, and CHANGELOG.md lists the patches each tag needs. The tag's own `patches/` folder is
     the list: copy every file in it, and remove any copy it no longer has (a ui-sdk upgrade renames
     the file after the new version). Add `avenue-check-patches` to this app's check so a missing or
     stale copy fails it (README, "Checks for apps").
   - If this app's Storybook or dev server runs on Vite, leave `@manyave/avenue` out of Vite's
     dependency pre-bundling (`optimizeDeps.exclude`) and pre-bundle every `@ui-sdk/react` entry
     and `@ui-sdk/core` instead (`optimizeDeps.include`). Otherwise Vite can load ui-sdk twice,
     and ui-sdk's shared state (the agent snapshot, open popups) splits between the copies.
   - Move to a newer Avenue tag only on purpose, in its own pull request, after reading that tag's
     CHANGELOG.md entry.
   - Never copy Avenue's files into the app and never edit them under node_modules. A fork is the
     problem Avenue exists to end. If Avenue is wrong or missing something, report it (step 6).

4. Move one slice at a time, in the plan's order
   - Slice 0 installs Avenue with no visible change, proves the plan's seven conditions, and adds a
     visual diff of every story. Zack sees each app's first pull request before it merges.
   - After that, one slice per pull request, each small enough to merge the day it starts and to
     undo with one revert. Screens import Avenue directly as they move; the old primitives stay for
     screens that haven't moved, until the last slice deletes them.
   - Money, mail and billing screens go last, each in its own release, with the extra proof on
     their cards.
   - Don't change routes, data, the backend, RPC schemas, or the Android and iOS apps, except where
     a slice card says so.

5. Prove each slice before it merges
   - This app's own gates as its AGENTS.md says (for Neighbors: `bun check`, `bun vt run`, the
     Playwright suite and `bun size`; for Management: `bun run check` and `bun run test:outcomes`).
   - The visual diff: every changed story is either listed in Avenue's parity map or is the slice's
     named change. Anything else fails.
   - Tap areas (44px on a phone, no overlaps), the name-clash check (both from
     `@manyave/avenue/checks/*`), Avenue's class rules in the app's lint ("Class rules" below), and one keyboard-only
     Playwright journey that asserts where focus lands after a dialog closes or a row goes away.
   - The pull request lists what users will notice, especially where keyboard, focus or dismissal
     behaviour changes.
   - Fictional data only in stories, tests and screenshots (for example Sunnydale HOA). No real HOA
     data, ever, and never Chimney Hills North.

6. Report Avenue bugs and ask for features in Linear, not in the app
   File in team "Avenues" (key AVE), project "Avenue design system". Search AVE first: if a card
   already covers it, comment there instead of filing a new one. Add the "AI reported" label when
   you file it yourself.

   A bug (label "Bug"): something Avenue does wrong, against its own docs or stories.
   - Title: what goes wrong, in plain words ("Select's menu covers the field on a phone").
   - Where: the app, the screen, and the Avenue component.
   - A screenshot of the screen, and a link to the Avenue story that shows it, if there is one.
   - Steps to see it, what you expected, and what happened instead.
   - Avenue tag, light or dark, desktop or web type scale, browser or desktop app, phone or desktop
     width, mouse or touch.

   A feature request (label "Feature" for something new, "Improvement" for a change to something
   Avenue already has):
   - The ask, word for word, and who asked.
   - The problem behind it: the screen, the job the person is doing there, and the device. Describe
     the problem; don't design the component.
   - Which apps need it. Something only one app uses usually stays in that app.
   - A screenshot of the screen today.

   For both: fictional data only in the text and screenshots, never secrets and never real HOA
   data. Avenue tests every request against research, UX and UI before building it, and will push
   back on the card when a request doesn't hold up; reply there.

   While you wait, keep this app's old part for that one control, write the AVE card number next
   to it in a comment, and carry on with the slice. Link the AVE card from the slice's card.
   When Avenue fixes it, it cuts a new tag; this app moves to it on purpose, in its own pull
   request, with the same proof as a slice.

Start with step 1, then tell me in a few sentences which slice is next for this app and whether
anything blocks it.
```

## Renamed parts

Avenue's parts take the names of the ui-sdk parts they wrap (AVE-144, v0.25.0), so a name in ui-sdk's docs is the
name in Avenue. The old names were deprecated aliases of the new parts, and the old import paths re-exported the new
files, until both apps had moved off them. v0.43.0 removed them all (AVE-154): an app on v0.43.0 or newer imports the new
names from the new paths, and the old ones fail the typecheck. `data-slot` values stay as they were, so tests and
styles that select them keep working.

| Old name (removed in v0.43.0) | New name | Import from |
| --- | --- | --- |
| `DropdownMenu` | `Menu` | `@manyave/avenue/components/menu` (was `dropdown-menu`) |
| `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuGroup` | `MenuTrigger`, `MenuContent`, `MenuGroup` | `components/menu` |
| `DropdownMenuItem`, `DropdownMenuCheckboxItem` | `MenuItem`, `MenuCheckboxItem` | `components/menu` |
| `DropdownMenuRadioGroup`, `DropdownMenuRadioItem` | `MenuRadioGroup`, `MenuRadioItem` | `components/menu` |
| `DropdownMenuSub`, `DropdownMenuSubTrigger`, `DropdownMenuSubContent` | `MenuSub`, `MenuSubTrigger`, `MenuSubContent` | `components/menu` |
| `DropdownMenuLabel` | `MenuGroupLabel` | `components/menu` |
| `DropdownMenuSeparator`, `DropdownMenuShortcut` | `MenuSeparator`, `MenuShortcut` | `components/menu` |
| `Sheet` | `Drawer` | `@manyave/avenue/components/drawer` (was `sheet`) |
| `SheetTrigger`, `SheetClose`, `SheetContent` | `DrawerTrigger`, `DrawerClose`, `DrawerContent` | `components/drawer` |
| `SheetTitle`, `SheetDescription` | `DrawerTitle`, `DrawerDescription` | `components/drawer` |
| `SheetHeader`, `SheetBody`, `SheetFooter` | `DrawerHeader`, `DrawerBody`, `DrawerFooter` | `components/drawer` |
| `SheetOverlay` | `DrawerBackdrop` | `components/drawer` |
| `TabsTrigger` | `TabsTab` | `components/tabs` |
| `TabsContent` | `TabsPanel` | `components/tabs` |
| `DialogOverlay` | `DialogBackdrop` | `components/dialog` |
| `RadioGroupItem` | `Radio` | `components/radio-group` |
| `Toaster` | `ToastRegion` | `components/toast` |

In Storybook, "Dropdown menu" is now Components / Menu and "Sheet" is now
Components / Drawer, so links to the old pages need the new address.

File field parts (v0.29.0, AVE-148), all in `components/file-field`; the old names were removed in v0.43.0 (AVE-154):

| Old name (removed in v0.43.0) | New name |
| --- | --- |
| `FileName` | `FileFieldName` |
| `FileThumbnail` | `FileFieldPreview` |
| `UploadStatus` | `FileFieldStatus` |

## Renamed props and change details

State props take ui-sdk's names too (AVE-145, v0.26.0): `value` / `defaultValue` / `onValueChange`, `checked` /
`onCheckedChange`, and every change callback gets ui-sdk's `details` second (reason, event, source, `cancel()`). The
old prop names were removed in v0.43.0 (AVE-154). A callback that ignores its second argument needs no change.

| Component | Old prop (removed in v0.43.0) | New prop |
| --- | --- | --- |
| `TableFilters` | `filters`, `onChange` | `value`, `onValueChange` (and `defaultValue`) |
| `SortMenu` | `onChange` | `onValueChange` (`value` optional, and `defaultValue`) |
| `RegisterGroupRow` | `selection` (`"all"`, `"some"`, `"none"`), `onSelectedChange` | `checked` (`true`, `"indeterminate"`, `false`), `onCheckedChange` |
| `ModeToggle` | `choice`, `onThemeChange` | `value`, `onValueChange` (and `defaultValue`; `defaultDev` beside `dev`) |

Menu items and toasts take ui-sdk's names (AVE-151, v0.31.0); the old ones were removed in v0.43.0 (AVE-154):

| Where | Old (removed in v0.43.0) | New |
| --- | --- | --- |
| `MenuItem` | `variant="destructive"` | `destructive` (ui-sdk's prop; sets `data-destructive`) |
| `MenuItem` | `reason` | `disabledReason`, as on `Button`, `Composer` and `FileField` |
| `toast(text, options)` | `variant: "error"`, `"success"` | `type: "error"`, `"success"` |
| `toast(text, options)` | `variant: "progress"` | `type: "info"` |

Button's `variant="destructive"` stays: it picks one of Button's looks, and ui-sdk has no look props.

## Parts instead of slot props

Components that took their content as props are a root and parts (AVE-149, v0.30.0 and v0.32.0), as ui-sdk composes.
The slot props were removed in v0.43.0 (AVE-154); write the parts:

| Component | Old props (removed in v0.43.0) | Parts |
| --- | --- | --- |
| `EmptyState` | `icon`, `title`, `description`, `action`, `secondaryAction`, `externalLink`, `headingLevel` | `EmptyStateIcon`, `EmptyStateTitle` (`render={<h2 />}` for another level), `EmptyStateDescription`, `EmptyStateActions` with `EmptyStateAction` (a second one `variant="link"`); an outside link is a child |
| `SectionEmpty` | `icon`, `title`, `line`, `action` | `SectionEmptyIcon`, `SectionEmptyContent` with `SectionEmptyTitle` and `SectionEmptyDescription`, `SectionEmptyAction` |
| `PageHeader` | `eyebrow`, `title`, `count`, `countLabel`, `description`, `actions` | `PageHeaderContent` with `PageHeaderEyebrow`, `PageHeaderTitle` (holding `PageHeaderCount value label`), `PageHeaderDescription`; `PageHeaderActions` |
| `SectionCard` | `title`, `count`, `countLabel`, `action` | `CardHeader` with `SectionCardTitle` (holding `SectionCardCount`) and `CardAction`; `CardContent` |
| `TopBar` | `logo`, `name`, `homeHref`, `homeRender`, `onHome`, `org`, `actions`, `navLabel` | `TopBarHome` (`logo`, `name`, `href`, `render`, `onHome`), `TopBarOrg`, `TopBarNav` (`aria-label`), `TopBarActions`. The bar no longer adds a Help button: put it in `TopBarActions` |
| `StatusBar` | `count`, `hint`, `totals` | `StatusBarCount`, `StatusBarHint`, `StatusBarTotals items` |
| `ListItem` | `title`, `meta`, `note`, `trailing` | `ListItemContent` with `ListItemTitle`, `ListItemMeta`, `ListItemNote`; `ListItemTrailing` |
| `Callout` | `icon` | `CalloutIcon` (holding the icon) and `CalloutContent` |
| `InlineMessage` | `hideIcon` | `InlineMessageContent` with no `InlineMessageIcon` |
| `Progress` | `trackClassName` | `ProgressTrack className` holding `ProgressIndicator` |
| `MonthGrid` | `renderDay` | the children function, returning `MonthGridDay` |
| `Calendar` | `mark` | `CalendarDay` holding `CalendarDayMark` |
| `Disclosure` (the component) | `summary`, `panelClassName` | `CollapsibleSection variant="disclosure"` with `CollapsibleSectionTrigger` and `CollapsibleSectionPanel` |

The `reasons-hang` and `reasons-hang-start` utilities went in v0.43.0 too; neither the toolbar nor the selection bar
used them any more (AVE-160, AVE-162).

## Context menus

Avenue has no `ContextMenu*` family: a context menu is a Menu opened from a `MenuContextTrigger` area, ui-sdk's part
(AVE-153, v0.40.0). It opens at the pointer on right-click, on a long press on touch, and from Shift+F10 or the
context-menu key when the area has focus, and it stays a popover on phones. To replace shadcn's or Radix's:

| shadcn / Radix | Avenue (`components/menu`) |
| --- | --- |
| `ContextMenu` | `Menu` |
| `ContextMenuTrigger` (`asChild`) | `MenuContextTrigger`, with `tabIndex={0}` and a name (`render` replaces `asChild`) |
| `ContextMenuContent` | `MenuContent` |
| `ContextMenuItem`, `…CheckboxItem`, `…RadioGroup`, `…RadioItem` | `MenuItem`, `MenuCheckboxItem`, `MenuRadioGroup`, `MenuRadioItem` |
| `ContextMenuLabel`, `ContextMenuGroup`, `ContextMenuSeparator`, `ContextMenuShortcut` | `MenuGroupLabel`, `MenuGroup`, `MenuSeparator`, `MenuShortcut` |
| `ContextMenuSub`, `…SubTrigger`, `…SubContent` | `MenuSub`, `MenuSubTrigger`, `MenuSubContent` |
| `onSelect` on an item | `onSelect` (or `value` and the Menu's `onAction`) |
| `variant="destructive"` on an item | `destructive`, plus `data-agent-confirm="<what it does>"` |

Give each row its own `Menu` with its area named for the row, like the row's own words: the open menu takes its name
from the area, which is how an agent and a screen reader tell one row's menu from another's. Put `MenuContent` beside
the area, never inside it: a right-click inside the open menu would move it. In a table, where the area is the row
(`render={<TableRow />}`), pass `container={document.body}` to `MenuContent`, since a `tbody` takes only rows. See Components / Menu / Context Menu and Context Menu In A Table.

## One size scale

Every control that comes in steps takes xs / sm / md / lg, the steps of the `h-control-*` tokens, with md the default
(AVE-152, v0.34.0). Each takes the steps it has. The old names were removed in v0.43.0 (AVE-154).

| Component | Old (removed in v0.43.0) | New |
| --- | --- | --- |
| `Button`, `buttonVariants` | `size="default"` | `size="md"` (or leave it out) |
| `Button`, `buttonVariants` | `size="icon"` | `size="icon-md"` (beside `icon-xs`, `icon-sm`, `icon-lg`) |
| `Toggle`, `toggleVariants`, `ToggleGroup`, `ToggleGroupItem` | `size="default"` | `size="md"` |
| `Switch`, `Avatar`, `InitialsAvatar`, `Card`, `Progress`, `ProgressTrack` | `size="default"` | `size="md"` |

`data-size` always carries the step's name, so it reads `md` where it once read `default`.
A selector such as `data-[size=default]:…` becomes `data-[size=md]:…`. Select and Combobox already took `sm | md`.
Sizes that name a place, not a step, stay as they are: EmptyState `compact`, IconTile `row | section`, and the `width`
of FormDialog and Dock.

## Select and Combobox take items, and come in parts

Select, Combobox and TableFilters take their choices as `items`, in ui-sdk's shape (AVE-146, v0.28.0). `options`
was the old name, removed in v0.43.0 (AVE-154); the entries are the same, so renaming the prop is the whole change.
`SelectOption` is now `ListItem`, `ComboboxOption` is `ComboboxItemData`, and a TableFilters field's `options` is
`items`; the old type names went in v0.43.0 too.

`items` also takes plain strings, groups (`{ type: "group", label, items }`) and separators (`{ type: "separator" }`),
and a value may be an object, with `itemToValue` (the id it posts), `itemToLabel` and `isItemEqualToValue`.

When one tag isn't enough (an item with a second line, an icon, a layout of your own), build it from the parts, nested
as ui-sdk's Composition shows. The styles are Avenue's:

```tsx
<Select items={people} value={signer} onValueChange={setSigner}>
  <SelectTrigger><SelectValue /></SelectTrigger>
  <SelectContent>
    {people.map((p) => (
      <SelectItem key={p.value} value={p.value} label={p.label}>
        <span className="block">{p.label}</span>
        <span className="block text-meta text-muted-foreground">{p.role}</span>
      </SelectItem>
    ))}
  </SelectContent>
</Select>

<Combobox value={owner} onValueChange={setOwner}>
  <ComboboxInput icon={<HouseIcon />} triggerLabel="Show owners" />
  <ComboboxContent>
    <ComboboxEmpty>No owner matches.</ComboboxEmpty>
    <ComboboxList>{/* ComboboxItem, ComboboxGroup, ComboboxGroupLabel, ComboboxSeparator */}</ComboboxList>
  </ComboboxContent>
</Combobox>
```

On a phone, the one-tag Select opens the operating system's picker; built from parts it opens Avenue's sheet, since
the OS picker can only be drawn from data. Keep the one tag where the OS picker matters.

## Class rules

Avenue's class rules run inside the app's own oxlint, from `@manyave/avenue/oxlint` (AVE-171; it replaced
`avenue-check-classes`). They use oxlint-tailwindcss, which reads the app's Tailwind build:

- `tailwindcss/no-unknown-classes`: a class that makes no CSS under the app's theme fails, with the near name it
  meant. That covers Avenue's retired corners (`rounded-2xl`, `rounded-3xl`, `rounded-4xl`, and a bare `rounded` with
  no size, draw square corners, because Avenue's theme clears them; use `rounded-xs` to `rounded-xl`), typos and
  missing tokens.
- `tailwindcss/no-restricted-classes`: off-grid spacing (`gap-1.5`, `px-2.5`, `py-1.25`; the 2px `*-0.5` and sizing
  are fine) and literal breakpoints (`max-[700px]:`; use `max-phone:`, `desktop:`, `wide:`), each with its fix.
- `avenue/hit-area-after`: `hit-area` and an `after:` class in the same string. `hit-area` owns the control's
  `::after`; decorate with `before:` or a child.

The rules ship in v0.41.0, so pin that tag or newer first. oxlint takes no `settings` from an extended config, so the
app names its own Tailwind entry: the CSS file that imports `@manyave/avenue/styles.css`. In an `oxlint.config.ts` (oxlint loads one through Node; a `.oxlintrc.json`
can't extend a config that brings JS plugins, so move it to TypeScript):

```ts
import { defineConfig } from "oxlint";
import avenueClasses from "@manyave/avenue/oxlint";

export default defineConfig({
  extends: [avenueClasses()],
  settings: { tailwindcss: { entryPoint: "src/styles.css" } },
  // ...the app's own plugins, rules and overrides, unchanged.
});
```

Where the lint config is a block inside another config, put the same two keys in that block. Vite+'s `lint` in
`vite.config.ts` takes `extends` (tried on Management with Vite+ 1.5, AVE-179); `vp lint` and `vp check` then run the
rules:

```ts
import { defineConfig } from "vite-plus";
import avenueClasses from "@manyave/avenue/oxlint";

export default defineConfig({
  lint: {
    extends: [avenueClasses()],
    settings: { tailwindcss: { entryPoint: "src/index.css" } },
    // ...the block's own ignorePatterns, plugins and rules, unchanged.
  },
});
```

The entry ships its own types (v0.41.7 or newer, AVE-181), so a typechecked config needs no `declare module` for it.

A block without `extends` takes the object merged by hand: add its `jsPlugins` to the block's and its `rules` to the
block's. Nothing else is needed: Avenue depends on `oxlint-tailwindcss`, so it installs with Avenue (oxlint 1.43 or
newer).

Classes the app writes in its own plain CSS, outside the Tailwind entry, aren't Tailwind's, so
`no-unknown-classes` reports each one. Management's public site is the case: `site`, `site-hero` and the rest come
from `src/site/site.css`. Name them in the rule's own options, in the app's `rules`:

```ts
// The public site's own classes (src/site/site.css) aren't Tailwind utilities.
"tailwindcss/no-unknown-classes": ["error", { ignorePrefixes: ["site"] }],
```

(`allowlist` takes whole class names instead of prefixes.)

An app's screens that haven't moved to Avenue may fail these rules. Turn a rule off for those folders with an
`overrides` entry until their slice lands, rather than leaving the whole app unchecked.

## Weights, durations and layers

Avenue names its font weights, durations, page layers and modal overlay (AVE-182), so a screen never writes the
number. The names are Tailwind utilities from `@manyave/avenue/styles.css`; `cn` knows each one.

| Write this | For | Instead of |
| --- | --- | --- |
| `font-normal`, `font-medium`, `font-semibold` | body (400), controls and labels (500), a selected date or count (600) | `font-[400]`, `font-[500]`, `font-[600]` |
| `font-quiet` | small muted text that needs its stroke: column headers, an outline status (450) | `font-[450]` |
| `font-emphasis` | a title or term inside body text: row titles, detail terms, the open nav tab (550) | `font-[550]`, `font-[560]` |
| `font-heading` | page and detail headings (620) | `font-[620]` |
| `duration-fast` | an overlay opening or closing (100ms) | `duration-100` |
| `duration-moderate` | a small change in place: a chevron, a button fading in (150ms) | `duration-150`, `duration-120`, `duration-160` |
| `duration-slow` | the longest anything moves: a toast (200ms) | `duration-200`, and anything longer |
| `z-sticky-group` | a sticky group or day bar under the column header (5) | `z-[5]` |
| `z-sticky` | a sticky column header (10) | `z-10` on a sticky header |
| `z-sticky-bar` | a toolbar or tab bar stuck to the top, above the sticky column headers (20) | `z-20` on a sticky bar |
| `z-dock` | a bar or dock fixed to the bottom edge (40) | `z-40` |
| `z-overlay` | a dialog, drawer or sheet and its backdrop (50) | `z-50` |
| `z-toast` | toasts and notices above an open dialog (70) | `z-[60]`, `z-[70]` |
| `bg-overlay` | the dim behind a dialog or drawer (10% black, both themes) | `bg-black/10` |

Pick by meaning, not by number: a sticky toolbar is not `z-sticky` because it happens to be 10, and a 550 that is a
heading is `font-heading`. A weight used in one place (the top bar's 650 wordmark) stays a literal with a comment. A small order inside one component (a focused segment over its neighbour, a fill behind a
bar) keeps Tailwind's numbers (`z-1`, `focus:z-10`) inside an `isolate` parent; the names are for things that stack
against the page. Where an app has a weight or a layer none of these fits, ask for it on an AVE card with the screens
that use it, rather than adding a one-off.

In plain CSS the same values are `var(--font-weight-emphasis)`, `var(--transition-duration-fast)`,
`var(--z-index-overlay)` and `var(--overlay)`.

## For the Avenue team

Requests that arrive this way go through the `avenue-component-request` funnel before anyone builds them. Fixes in
lane F skip research; everything else gets the UX and UI tests.
