/**
 * Shared by Popover, Hover card, Tooltip, Dropdown menu, Select and Combobox: how a popup enters and leaves. ui-sdk marks the first frame
 * with data-starting-style and the exit with data-ending-style, and keeps the popup mounted until the exit ends.
 */
export const popupMotion =
  "origin-(--transform-origin) transition-[opacity,scale,translate] duration-100 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 data-[side=bottom]:data-starting-style:-translate-y-2 data-[side=left]:data-starting-style:translate-x-2 data-[side=right]:data-starting-style:-translate-x-2 data-[side=top]:data-starting-style:translate-y-2 motion-reduce:transition-none";
