/**
 * Shared by Popover, Hover card, Tooltip, Menu, Select and Combobox: how a popup enters and leaves. ui-sdk marks the first frame
 * with data-starting-style and the exit with data-ending-style, and keeps the popup mounted until the exit ends.
 */
export const popupMotion =
  "origin-(--transform-origin) transition-[opacity,scale,translate] duration-fast data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 data-[side=bottom]:data-starting-style:-translate-y-2 data-[side=left]:data-starting-style:translate-x-2 data-[side=right]:data-starting-style:-translate-x-2 data-[side=top]:data-starting-style:translate-y-2 motion-reduce:transition-none";

/**
 * Shared by Popover, Hover card, Menu and its submenus (AVE-112): never wider than the room ui-sdk measures
 * beside the trigger, less its collision padding, so a popup given a fixed width (`w-80`, `w-96`) stays on a 320px
 * phone with a margin each side and wraps its text instead of running off the edge. Base UI's popups did this; on a
 * wider screen the room is larger than any of them, so nothing moves there. Select and Combobox lists already cap
 * themselves the same way (listPopup in picker.ts), and Tooltip within its 320px.
 */
export const popupMaxWidth = "max-w-(--available-width)";

/**
 * The faint edge of everything that floats (AVE-208): Popover, Hover card, Menu, Select and Combobox lists, Dialog,
 * AlertDialog and Drawer. A 1px ring of `border-floating`, which melts into `shadow-popover`. Shadows and rings are
 * dropped in forced-colours mode, so there the surface draws a real 1px border in the system's colour instead.
 */
export const floatingEdge = "ring-1 ring-border-floating forced-colors:border";

/**
 * Shared by Dialog, Drawer (AVE-32) and AlertDialog (AVE-45): the modal surface, its title and its description, so a form that is a centred
 * dialog on a wide screen and a sheet on a phone reads as the same thing. Sizing, corners and position stay with each
 * component. Each is xl with a 16px inset, so a part inside may be xl at most (`--nested-corner`, AVE-211).
 */
export const modalSurface = `[--nested-corner:var(--radius-xl)] bg-popover p-inset text-sm text-popover-foreground shadow-popover outline-none ${floatingEdge}`;
/** Line height is the close button's 24px, so the title and the button share a centre line. */
/**
 * text-compact, as the app's dialogs set their titles (dues.tsx, dialogs.tsx): 16px on web, 14px at desktop scale
 * (AVE-55). The line stays 24px at both scales, where the app's desktop line is 20px, so the title is centred on the
 * 24px close button in the corner (AVE-2 section 4).
 */
export const modalTitle = "text-compact leading-6 font-medium";
export const modalDescription =
  "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground";
/**
 * The close button: 24px, with a 40px hit area through Button's shared `hit-area` (8px reach each side with a mouse,
 * 44px on a phone, AVE-22). It stays 24px on a phone rather than growing to xs's 28px, so it keeps the title's line.
 * Dialog and Drawer place it on the title's line.
 */
export const modalCloseButton =
  "absolute top-4 right-4 [--hit-area-x:--spacing(2)] [--hit-area-y:--spacing(2)] pointer-coarse:size-6";

/**
 * A bottom sheet's drag handle, 36 x 4px (AVE-32): Drawer's, and Select's and Combobox's while they present as a sheet
 * (AVE-39). Decorative, so it is aria-hidden; each shows it only on a bottom sheet. The sheet's surface is the
 * `sheet-bottom` utility in avenue.css.
 */
export const sheetHandle = "-mt-2 mx-auto h-1 w-9 shrink-0 rounded-xs bg-muted-foreground";
