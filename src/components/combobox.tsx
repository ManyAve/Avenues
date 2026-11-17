import {
  Combobox as ComboboxRoot,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxList,
  ComboboxTrigger,
} from "@ui-sdk/react/combobox";
import { CheckIcon, ChevronsUpDownIcon, XIcon } from "lucide-react";
import { useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  fieldControl,
  listItem,
  listPopup,
  listScroll,
  listSheetHandle,
  type PickerSize,
  type Presentation,
} from "#avenue/lib/picker";
import { defined } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

/** One choice a Combobox offers. `value` is the stored id; `label` is what the field shows once it is chosen. */
export interface ComboboxOption {
  value: string;
  label: string;
  /** More words the search matches without showing them, like a spreadsheet ID. */
  keywords?: string[] | undefined;
  /** Muted text after the label in the list, e.g. "$120.00 owing". Display only; the default search ignores it. */
  hint?: string | undefined;
  /** Right-aligned muted text in the list, e.g. "ID 1042". */
  meta?: string | undefined;
}

// ui-sdk treats an empty value as nothing chosen, so the "none" option carries its own value inside the component. A
// form gets "" for it instead, like a native select's empty option (see the hidden input below).
const NONE = "\u0000none";

/** "" is the old "nothing chosen" (before v0.21.0); it still reads as null for one release (AVE-137). */
const chosen = (value: string | null | undefined) => (value ? value : null);

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Default search: every word typed appears in the label or a keyword (case- and accent-insensitive). */
function matchWords(option: ComboboxOption, query: string): boolean {
  const text = fold([option.label, ...(option.keywords ?? [])].join(" "));
  return fold(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => text.includes(w));
}

export interface ComboboxProps<T extends ComboboxOption> {
  size?: PickerSize | undefined;
  options: readonly T[];
  /**
   * The chosen option's value, or null for none. Pass it with `onValueChange` to control the field, or leave it out
   * and use `defaultValue`. "" still means none for one release (deprecated in v0.21.0, AVE-137).
   */
  value?: string | null | undefined;
  /** The value chosen at first, when `value` is left out. A form reset returns to it. */
  defaultValue?: string | null | undefined;
  /** Gets the new value, or null when the choice is cleared (the "none" option, or the phone's Clear). */
  onValueChange?: ((value: string | null) => void) | undefined;
  /** The name the chosen value posts under in a form. "None" posts "", and nothing chosen posts nothing. */
  name?: string | undefined;
  /** The id of a form to post with, when the field isn't inside it. */
  form?: string | undefined;
  /** Blocks the form's submit until something is chosen, with the browser's own message. */
  required?: boolean | undefined;
  /** Adds a first option that clears the choice (Documents' "Neighborhood"). Without it, null shows `placeholder`. */
  noneLabel?: string | undefined;
  placeholder?: string | undefined;
  /** What the list says when nothing matches. Gets the trimmed query. */
  emptyMessage?: ((query: string) => ReactNode) | undefined;
  /**
   * Replaces the default word search. True keeps an option; a number keeps it and ranks it (higher first), e.g. the
   * household matcher that puts an exact spreadsheet ID first.
   */
  filter?: ((option: T, query: string) => boolean | number) | undefined;
  /** A leading icon (house, globe). Decorative. */
  icon?: ReactNode | undefined;
  /** The input's id, for its label. Inside a Field, leave it out. */
  id?: string | undefined;
  "aria-label"?: string | undefined;
  "aria-describedby"?: string | undefined;
  /** Names the chevron button for screen readers ("Show households"). */
  triggerLabel?: string | undefined;
  /**
   * Names the phone's clear button. By default "Clear" and the field's label in lower case ("Clear household"),
   * read from the input's label or `aria-label`.
   */
  clearLabel?: string | undefined;
  invalid?: boolean | undefined;
  disabled?: boolean | undefined;
  /**
   * How the list opens. "auto" (default) opens a bottom sheet on a small touch screen, with the search field in the
   * sheet's header and the keyboard closed until it is tapped, and a popover elsewhere, decided each time it opens;
   * "sheet" or "popover" always (UX Engineer, AVE-39).
   */
  presentation?: Presentation | undefined;
  className?: string | undefined;
}

/**
 * A field that searches as you type, for long lists (households, time zones). Arrow keys and Enter choose; Escape,
 * or leaving the field, closes the list and puts the current choice back in the field. Built on ui-sdk's Combobox.
 *
 * Icons are the app's 14px (its time-zone picker, AVE-59): the leading icon, the chevron and the check. The leading
 * icon sits 8px from the edge where the app's sits 10px, the AVE-2 section 1 step inside a control.
 */
export function Combobox<T extends ComboboxOption>({
  options,
  value,
  defaultValue,
  onValueChange,
  name,
  form,
  required,
  noneLabel,
  placeholder,
  emptyMessage = (query) => (query ? `Nothing matches “${query}”.` : "Nothing to choose from yet."),
  filter = matchWords,
  icon,
  id,
  triggerLabel = "Show options",
  clearLabel,
  invalid,
  disabled,
  presentation = "auto",
  size,
  className,
  ...aria
}: ComboboxProps<T>) {
  const byValue = useMemo(() => new Map(options.map((o) => [o.value, o])), [options]);
  const rows = useMemo<ComboboxOption[]>(
    () => (noneLabel ? [{ value: NONE, label: noneLabel }, ...options] : [...options]),
    [noneLabel, options],
  );
  // Uncontrolled, the field still tracks its value, for the stand-in label below.
  const [own, setOwn] = useState(() => chosen(defaultValue));
  const current = value !== undefined ? chosen(value) : own;
  // ui-sdk is always handed the value, with Avenue's "none" option in place of null where there is one.
  const toRoot = (v: string | null) => (v ? (byValue.has(v) ? v : null) : noneLabel ? NONE : null);
  const selected = toRoot(current);
  const change = (next: string | null) => {
    setOwn(next);
    onValueChange?.(next);
  };
  const chosenLabel = selected === NONE ? noneLabel : selected ? byValue.get(selected)?.label : undefined;
  const [query, setQuery] = useState("");
  // The popup matches the whole field (icon, input and chevron), not just the input.
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null);
  // Focus selects the whole label so typing replaces it; the click that focused must not undo that selection.
  const focusing = useRef(false);
  // The clear button's name follows the field's own label, which a Field gives the input after it mounts.
  const inputRef = useRef<HTMLInputElement>(null);
  const [fieldName, setFieldName] = useState<string | undefined>();
  // ui-sdk is always handed the value (it refuses `value` and `defaultValue` together), so a form reset is answered
  // here: the field goes back to `defaultValue`, and a controlled field hears it through onValueChange.
  const reset = useEffectEvent(() => {
    // A controlled field with no default of its own keeps its value: the app decides what a reset means there.
    if (value !== undefined && defaultValue === undefined) return;
    const target = chosen(defaultValue);
    if (target !== current) change(target);
  });
  useEffect(() => {
    const input = inputRef.current;
    const owner = form ? input?.ownerDocument.getElementById(form) : input?.closest("form");
    if (!(owner instanceof HTMLFormElement)) return;
    const onReset = () => reset();
    owner.addEventListener("reset", onReset);
    return () => owner.removeEventListener("reset", onReset);
  }, [form]);
  useLayoutEffect(() => {
    const element = inputRef.current;
    const label = element?.getAttribute("aria-label") ?? element?.labels?.[0]?.textContent ?? undefined;
    setFieldName(label?.trim().toLowerCase() || undefined);
  }, []);

  return (
    <ComboboxRoot<string>
      value={selected}
      onValueChange={(next: string | string[] | null, details: { reason: string; cancel: () => void }) => {
        if (typeof next === "string") change(next === NONE ? null : next);
        // The phone's Clear clears the choice as well as the search (AVE-93); Escape while the list is open asks for
        // it back. Clearing the text by typing is still typing, not a choice, so that request is refused.
        else if (details.reason === "clear-press") change(null);
        else details.cancel();
      }}
      onQueryChange={(next: string, details: { reason: string; cancel: () => void }) => {
        // ui-sdk empties the text on a form reset, as it would return to its own empty default; the reset listener
        // above has put the field's default value back, and with it its label, so the text stays.
        if (details.reason === "reset") details.cancel();
        else setQuery(next);
      }}
      filter={(item: { value: string; label: string }, text: string) => {
        if (item.value === NONE) return text.trim() === "";
        const option = byValue.get(item.value);
        return option ? filter(option, text) : false;
      }}
      autoHighlight
      presentation={presentation}
      // While the none option is chosen, ui-sdk would post its private value, so it gets no name and the hidden input
      // below posts "" in its place.
      {...defined({ disabled, name: selected === NONE ? undefined : name, form, required })}
    >
      {name && selected === NONE && (
        <input type="hidden" name={name} value="" disabled={disabled} {...defined({ form })} />
      )}
      <div
        ref={setAnchor}
        data-slot="combobox"
        data-disabled={disabled || undefined}
        className={cn(fieldControl({ size }), "gap-0 pe-0 pointer-coarse:min-h-11", icon ? "ps-2" : "ps-0", className)}
      >
        {icon && (
          <span aria-hidden className="flex shrink-0 text-muted-foreground">
            {icon}
          </span>
        )}
        {/* While the list is a sheet, ui-sdk moves the input into the sheet's header, which would leave the field
            looking cleared behind it. This stand-in shows the current choice there until a new one is picked
            (AVE-76). It's aria-hidden: the real field is in the sheet, and it shows only while the input is gone. */}
        <span
          aria-hidden
          data-slot="combobox-value"
          className={cn(
            "hidden min-w-0 flex-1 truncate px-2 [[data-slot=combobox]:not(:has(>input))>&]:block",
            !chosenLabel && "text-muted-foreground",
          )}
        >
          {chosenLabel ?? placeholder}
        </span>
        <ComboboxInput
          ref={inputRef}
          id={id}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          {...aria}
          onFocus={(e) => {
            focusing.current = true;
            const input = e.currentTarget;
            // On a phone, selected text brings up the system's copy and select handles, so the cursor goes to the end
            // instead; with a mouse or keyboard, the whole label is selected so typing replaces it (AVE-76).
            if (input.ownerDocument.defaultView?.matchMedia("(pointer: coarse)").matches) {
              input.setSelectionRange(input.value.length, input.value.length);
            } else input.select();
          }}
          onMouseUp={(e) => {
            if (focusing.current) e.preventDefault();
            focusing.current = false;
          }}
          onBlur={() => {
            focusing.current = false;
          }}
          className={cn(
            // w-full: a text field's default width (about 20 characters) is also its smallest, so in a column sized by
            // its content (a grid's automatic column) it set that column's minimum and widened a card past a phone. A
            // percentage width lets the browser shrink it to nothing there, while a row sized by its content still gets
            // the default width (AVE-113). flex-1 sizes it inside the group either way, so nothing else moves.
            "h-full w-full min-w-0 flex-1 bg-transparent px-2 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed",
            // In a sheet, ui-sdk moves this input into the sheet's header, where it is a 44px search field of its own.
            "sheet:h-11 sheet:w-full sheet:rounded-lg sheet:border sheet:border-input sheet:px-3 sheet:text-base sheet:transition-colors sheet:focus-visible:border-ring sheet:focus-visible:ring-3 sheet:focus-visible:ring-ring/50 dark:sheet:bg-input/30",
          )}
        />
        {/* On a phone the cursor lands after the chosen label instead of selecting it (AVE-76), so typing would add to
            it; Clear empties the field and the search in one tap, keeps focus in it, and shows only while there is
            something to clear. ui-sdk's own Escape brings the choice back while the list is open. With a mouse,
            select-on-focus does this job, so the button never shows there and the desktop look is unchanged
            (UX Engineer, AVE-93). Undoable, so no agent confirm. */}
        <ComboboxClear
          aria-label={clearLabel ?? (fieldName ? `Clear ${fieldName}` : "Clear choice")}
          className="relative hit-area hidden h-full w-11 shrink-0 items-center justify-center text-muted-foreground outline-none pointer-coarse:flex disabled:cursor-not-allowed"
        >
          <XIcon aria-hidden />
        </ComboboxClear>
        <ComboboxTrigger
          aria-label={triggerLabel}
          className="flex h-full w-8 shrink-0 items-center pointer-coarse:w-11 justify-center text-muted-foreground outline-none disabled:cursor-not-allowed"
        >
          <ChevronsUpDownIcon aria-hidden />
        </ComboboxTrigger>
      </div>
      <ComboboxContent
        anchor={anchor}
        side="bottom"
        align="start"
        sideOffset={4}
        // A sheet keeps one height while the search narrows the list, within the part of the screen above the keyboard.
        className={cn(
          listPopup,
          "not-sheet:has-data-empty:p-0 sheet:h-[calc(var(--visual-viewport-height,100dvh)*0.85)]",
        )}
      >
        <div aria-hidden data-slot="sheet-handle" className={listSheetHandle} />
        <ComboboxEmpty className="px-3 py-2 text-sm text-muted-foreground not-data-empty:hidden">
          {emptyMessage(query.trim())}
        </ComboboxEmpty>
        <ComboboxList className={cn("scroll-py-1 outline-none", listScroll)}>
          {rows.map((option) => (
            <ComboboxItem
              key={option.value}
              value={option.value}
              label={option.label}
              className={cn(listItem, option.meta && "grid-cols-[1rem_1fr_auto]")}
              {...defined({ keywords: option.keywords })}
            >
              <ComboboxItemIndicator className="col-start-1 flex">
                <CheckIcon aria-hidden className="size-3.5" />
              </ComboboxItemIndicator>
              <span className="col-start-2 min-w-0">
                <span className={option.value === NONE ? "text-muted-foreground" : undefined}>
                  {option.label}
                </span>
                {option.hint && <span className="text-muted-foreground"> · {option.hint}</span>}
              </span>
              {option.meta && (
                <span className="col-start-3 ps-3 text-control text-muted-foreground tabular-nums">
                  {option.meta}
                </span>
              )}
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </ComboboxRoot>
  );
}
