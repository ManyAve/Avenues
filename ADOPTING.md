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
     `@manyave/avenue/checks/*`), `avenue-check-classes` over the slice's files, and one keyboard-only
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
name in Avenue. The old names still work: each is a deprecated alias of the new part
(your editor strikes it through), and the old import paths re-export the new files. Nothing on screen changes, and
`data-slot` values stay as they were, so tests and styles that select them keep working. Rename at your own pace;
the aliases and old paths are deprecated and removed once both apps have moved off them (AVE-154). No release before then removes them: earlier
versions of this page named one, and AVE-158 took that back.

| Old name (deprecated) | New name | Import from |
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

Props don't change in this release. In Storybook, "Dropdown menu" is now Components / Menu and "Sheet" is now
Components / Drawer, so links to the old pages need the new address.

File field parts (v0.29.0, AVE-148), all in `components/file-field`; the old names are deprecated and
removed once both apps have moved off them (AVE-154):

| Old name (deprecated) | New name |
| --- | --- |
| `FileName` | `FileFieldName` |
| `FileThumbnail` | `FileFieldPreview` |
| `UploadStatus` | `FileFieldStatus` |

## Renamed props and change details

State props take ui-sdk's names too (AVE-145, v0.26.0): `value` / `defaultValue` / `onValueChange`, `checked` /
`onCheckedChange`, and every change callback gets ui-sdk's `details` second (reason, event, source, `cancel()`). The
old prop names still work, typed `@deprecated`, and are removed once both apps have moved off them (AVE-154). A callback that ignores its second argument needs no
change.

| Component | Old prop (deprecated) | New prop |
| --- | --- | --- |
| `TableFilters` | `filters`, `onChange` | `value`, `onValueChange` (and `defaultValue`) |
| `SortMenu` | `onChange` | `onValueChange` (`value` optional, and `defaultValue`) |
| `RegisterGroupRow` | `selection` (`"all"`, `"some"`, `"none"`), `onSelectedChange` | `checked` (`true`, `"indeterminate"`, `false`), `onCheckedChange` |
| `ModeToggle` | `choice`, `onThemeChange` | `value`, `onValueChange` (and `defaultValue`; `defaultDev` beside `dev`) |

Menu items and toasts take ui-sdk's names (AVE-151, v0.31.0); the old ones still work, typed
`@deprecated`, draw the same, and are removed once both apps have moved off them (AVE-154):

| Where | Old (deprecated) | New |
| --- | --- | --- |
| `MenuItem` | `variant="destructive"` | `destructive` (ui-sdk's prop; sets `data-destructive`) |
| `MenuItem` | `reason` | `disabledReason`, as on `Button`, `Composer` and `FileField` |
| `toast(text, options)` | `variant: "error"`, `"success"` | `type: "error"`, `"success"` |
| `toast(text, options)` | `variant: "progress"` | `type: "info"` |

Button's `variant="destructive"` stays: it picks one of Button's looks, and ui-sdk has no look props.

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
(AVE-152, v0.34.0). Each takes the steps it has. The old names still work and draw the same; they are deprecated and
removed once both apps have moved off them (AVE-154).

| Component | Old (deprecated) | New |
| --- | --- | --- |
| `Button`, `buttonVariants` | `size="default"` | `size="md"` (or leave it out) |
| `Button`, `buttonVariants` | `size="icon"` | `size="icon-md"` (beside `icon-xs`, `icon-sm`, `icon-lg`) |
| `Toggle`, `toggleVariants`, `ToggleGroup`, `ToggleGroupItem` | `size="default"` | `size="md"` |
| `Switch`, `Avatar`, `InitialsAvatar`, `Card`, `Progress`, `ProgressTrack` | `size="default"` | `size="md"` |

`data-size` always carries the step's name, so it reads `md` where it read `default`, even when the old name is passed.
A selector such as `data-[size=default]:…` becomes `data-[size=md]:…`. Select and Combobox already took `sm | md`.
Sizes that name a place, not a step, stay as they are: EmptyState `compact`, IconTile `row | section`, and the `width`
of FormDialog and Dock.

## Select and Combobox take items, and come in parts

Select, Combobox and TableFilters take their choices as `items`, in ui-sdk's shape (AVE-146, v0.28.0). `options` is
the old name and still works, typed `@deprecated`, until it is removed once both apps have moved off them (AVE-154); the entries are the same, so renaming the prop is
the whole change. `SelectOption` is now `ListItem`, `ComboboxOption` is `ComboboxItemData`, and a TableFilters
field's `options` is `items`.

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

## For the Avenue team

Requests that arrive this way go through the `avenue-component-request` funnel before anyone builds them. Fixes in
lane F skip research; everything else gets the UX and UI tests.
