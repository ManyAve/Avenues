/**
 * Shared by Popover, Hover card, Tooltip, Dropdown menu, Select and Combobox: how a popup enters and leaves. ui-sdk marks the first frame
 * with data-starting-style and the exit with data-ending-style, and keeps the popup mounted until the exit ends.
 */
export const popupMotion =
  "origin-(--transform-origin) transition-[opacity,scale,translate] duration-100 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 data-[side=bottom]:data-starting-style:-translate-y-2 data-[side=left]:data-starting-style:translate-x-2 data-[side=right]:data-starting-style:-translate-x-2 data-[side=top]:data-starting-style:translate-y-2 motion-reduce:transition-none";

/**
 * Shared by Dialog and Sheet (AVE-32): the modal surface, its title and its description, so a form that is a centred
 * dialog on a wide screen and a sheet on a phone reads as the same thing. Sizing, corners and position stay with each
 * component.
 */
export const modalSurface = "bg-popover p-inset text-sm text-popover-foreground ring-1 ring-foreground/10 outline-none";
/** Line height is the close button's 24px, so the title and the button share a centre line. */
export const modalTitle = "text-base leading-6 font-medium";
export const modalDescription =
  "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground";
/**
 * The close button: 24px, with a 40px hit area through Button's shared `hit-area` (8px reach each side with a mouse,
 * 44px on a phone, AVE-22). It stays 24px on a phone rather than growing to xs's 28px, so it keeps the title's line.
 * Dialog and Sheet place it on the title's line.
 */
export const modalCloseButton =
  "absolute top-4 right-4 [--hit-area-x:--spacing(2)] [--hit-area-y:--spacing(2)] pointer-coarse:size-6";
