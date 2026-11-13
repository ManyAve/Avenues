import {
  Combobox as ComboboxRoot,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxList,
  ComboboxTrigger,
} from "@ui-sdk/react/combobox";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { defined, fieldControl, listItem, listPopup, type PickerSize } from "#avenue/lib/picker";
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

// ui-sdk treats an empty value as nothing chosen, so the "none" option carries its own value inside the component.
const NONE = "\u0000none";

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
  /** The chosen option's value, or "" for none. */
  value: string;
  onValueChange: (value: string) => void;
  /** Adds a first option that clears the choice (Documents' "Neighborhood"). Without it, "" shows `placeholder`. */
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
  invalid?: boolean | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
}

/**
 * A field that searches as you type, for long lists (households, time zones). Arrow keys and Enter choose; Escape,
 * or leaving the field, closes the list and puts the current choice back in the field. Built on ui-sdk's Combobox.
 */
export function Combobox<T extends ComboboxOption>({
  options,
  value,
  onValueChange,
  noneLabel,
  placeholder,
  emptyMessage = (query) => (query ? `Nothing matches “${query}”.` : "Nothing to choose from yet."),
  filter = matchWords,
  icon,
  id,
  triggerLabel = "Show options",
  invalid,
  disabled,
  size,
  className,
  ...aria
}: ComboboxProps<T>) {
  const byValue = useMemo(() => new Map(options.map((o) => [o.value, o])), [options]);
  const rows = useMemo<ComboboxOption[]>(
    () => (noneLabel ? [{ value: NONE, label: noneLabel }, ...options] : [...options]),
    [noneLabel, options],
  );
  const selected = value ? (byValue.has(value) ? value : null) : noneLabel ? NONE : null;
  const [query, setQuery] = useState("");
  // The popup matches the whole field (icon, input and chevron), not just the input.
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null);
  // Focus selects the whole label so typing replaces it; the click that focused must not undo that selection.
  const focusing = useRef(false);

  return (
    <ComboboxRoot<string>
      value={selected}
      onValueChange={(next: string | string[] | null) => {
        // Clearing the text is still typing, not a choice: only a picked option changes the value.
        if (typeof next === "string") onValueChange(next === NONE ? "" : next);
      }}
      onQueryChange={(next: string) => setQuery(next)}
      filter={(item: { value: string; label: string }, text: string) => {
        if (item.value === NONE) return text.trim() === "";
        const option = byValue.get(item.value);
        return option ? filter(option, text) : false;
      }}
      autoHighlight
      {...defined({ disabled })}
    >
      <div
        ref={setAnchor}
        data-slot="combobox"
        data-disabled={disabled || undefined}
        className={cn(fieldControl({ size }), "gap-0 pe-0", icon ? "ps-2" : "ps-0", className)}
      >
        {icon && (
          <span aria-hidden className="flex shrink-0 text-muted-foreground [&_svg]:size-4">
            {icon}
          </span>
        )}
        <ComboboxInput
          id={id}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          {...aria}
          onFocus={(e) => {
            focusing.current = true;
            e.currentTarget.select();
          }}
          onMouseUp={(e) => {
            if (focusing.current) e.preventDefault();
            focusing.current = false;
          }}
          onBlur={() => {
            focusing.current = false;
          }}
          className="h-full min-w-0 flex-1 bg-transparent px-2 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        />
        <ComboboxTrigger
          aria-label={triggerLabel}
          className="flex h-full w-8 shrink-0 items-center justify-center text-muted-foreground outline-none disabled:cursor-not-allowed"
        >
          <ChevronsUpDownIcon aria-hidden className="size-4" />
        </ComboboxTrigger>
      </div>
      <ComboboxContent
        anchor={anchor}
        side="bottom"
        align="start"
        sideOffset={4}
        className={cn(listPopup, "has-data-empty:p-0")}
      >
        <ComboboxEmpty className="px-3 py-2 text-sm text-muted-foreground not-data-empty:hidden">
          {emptyMessage(query.trim())}
        </ComboboxEmpty>
        <ComboboxList className="scroll-py-1 outline-none">
          {rows.map((option) => (
            <ComboboxItem
              key={option.value}
              value={option.value}
              label={option.label}
              className={cn(listItem, option.meta && "grid-cols-[1rem_1fr_auto]")}
              {...defined({ keywords: option.keywords })}
            >
              <ComboboxItemIndicator className="col-start-1 flex">
                <CheckIcon aria-hidden className="size-4" />
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
