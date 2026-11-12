import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { fieldControl, listItem, listPopup, type PickerSize } from "#avenue/lib/picker";
import { cn } from "#avenue/lib/utils";

/** One choice a Combobox offers. `value` is the stored id; `label` is what the field shows once it is chosen. */
export interface ComboboxOption {
  value: string;
  label: string;
  /** Muted text after the label in the list, e.g. "$120.00 owing". Display only; the default search ignores it. */
  hint?: string | undefined;
  /** Right-aligned muted text in the list, e.g. "ID 1042". */
  meta?: string | undefined;
}

const NONE = "";

/** Default search: every word typed appears somewhere in the label (case- and accent-insensitive). */
function matchLabel<T extends ComboboxOption>(options: readonly T[], query: string): T[] {
  const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const words = fold(query).split(/\s+/).filter(Boolean);
  return options.filter((o) => {
    const label = fold(o.label);
    return words.every((w) => label.includes(w));
  });
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
  /** Replaces the default label search, e.g. the household matcher that ranks an exact spreadsheet ID first. */
  filter?: ((options: readonly T[], query: string) => T[]) | undefined;
  /** A leading icon (house, globe). Decorative. */
  icon?: ReactNode | undefined;
  /** The input's id, for its label. Inside a Base UI Field, leave it out. */
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
 * A field that searches as you type, for long lists (households, time zones). Arrow keys and Enter choose; Escape
 * closes and restores the current choice. Built on Base UI Combobox, so the input, list and options carry the
 * combobox roles and the highlighted option is announced.
 */
export function Combobox<T extends ComboboxOption>({
  options,
  value,
  onValueChange,
  noneLabel,
  placeholder,
  emptyMessage = (query) => (query ? `Nothing matches “${query}”.` : "Nothing to choose from yet."),
  filter = matchLabel,
  icon,
  id,
  triggerLabel = "Show options",
  invalid,
  disabled,
  size,
  className,
  ...aria
}: ComboboxProps<T>) {
  const none = useMemo<ComboboxOption | undefined>(
    () => (noneLabel ? { value: NONE, label: noneLabel } : undefined),
    [noneLabel],
  );
  const all = useMemo<ComboboxOption[]>(() => (none ? [none, ...options] : [...options]), [none, options]);
  const selected = (value ? options.find((o) => o.value === value) : none) ?? null;
  const selectedLabel = selected?.label ?? "";
  const [query, setQuery] = useState(selectedLabel);
  // The field always shows the current choice once the list closes: after a pick, Escape, or leaving the field with
  // half-typed text. The choice itself never changes unless an option is picked.
  const [labelShown, setLabelShown] = useState(selectedLabel);
  if (labelShown !== selectedLabel) {
    setLabelShown(selectedLabel);
    setQuery(selectedLabel);
  }
  // A click that focuses the input would otherwise drop the selection its focus made.
  const focusing = useRef(false);
  // Base UI keeps the list open when Tab moves focus out of the field, so the field controls it and closes on blur.
  const [open, setOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const close = () => {
    setOpen(false);
    setQuery(selectedLabel);
  };
  // While the input still shows the chosen label, list everything; once something is typed, filter.
  const typed = query !== selectedLabel;
  const matched = useMemo<ComboboxOption[]>(() => {
    const found = typed ? filter(options, query) : [...options];
    return none && !typed ? [none, ...found] : found;
  }, [filter, none, options, query, typed]);

  return (
    <ComboboxPrimitive.Root<ComboboxOption>
      items={all}
      filteredItems={matched}
      value={selected}
      // Base UI reports null when the text is cleared; that is still typing, not a choice. Only a picked option (the
      // none option included) changes the value, so Escape or leaving the field always restores the last choice.
      onValueChange={(item) => {
        if (item) onValueChange(item.value);
      }}
      inputValue={query}
      onInputValueChange={setQuery}
      open={open}
      onOpenChange={(next) => (next ? setOpen(true) : close())}
      isItemEqualToValue={(a, b) => a.value === b.value}
      itemToStringLabel={(item) => item.label}
      autoHighlight
      disabled={disabled}
    >
      <ComboboxPrimitive.InputGroup
        data-slot="combobox"
        className={cn(fieldControl({ size }), "gap-0 pe-0", icon ? "ps-2" : "ps-0", className)}
      >
        {icon && (
          <span aria-hidden className="flex shrink-0 text-muted-foreground [&_svg]:size-4">
            {icon}
          </span>
        )}
        <ComboboxPrimitive.Input
          id={id}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          {...aria}
          // Selecting the whole label on focus lets typing replace it in one keystroke.
          onFocus={(e) => {
            focusing.current = true;
            e.currentTarget.select();
          }}
          onMouseUp={(e) => {
            if (focusing.current) e.preventDefault();
            focusing.current = false;
          }}
          onBlur={(e) => {
            focusing.current = false;
            if (!popupRef.current?.contains(e.relatedTarget)) close();
          }}
          className="h-full min-w-0 flex-1 bg-transparent px-2 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        />
        <ComboboxPrimitive.Trigger
          aria-label={triggerLabel}
          className="flex h-full w-8 shrink-0 items-center justify-center text-muted-foreground outline-none disabled:cursor-not-allowed"
        >
          <ChevronsUpDownIcon aria-hidden className="size-4" />
        </ComboboxPrimitive.Trigger>
      </ComboboxPrimitive.InputGroup>
      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Positioner align="start" sideOffset={4} className="isolate z-50 outline-none">
          <ComboboxPrimitive.Popup ref={popupRef} data-slot="combobox-content" className={cn(listPopup, "data-empty:p-0")}>
            <ComboboxPrimitive.Empty className="px-3 py-2 text-sm text-muted-foreground empty:hidden">
              {emptyMessage(query.trim())}
            </ComboboxPrimitive.Empty>
            <ComboboxPrimitive.List className="scroll-py-1 outline-none">
              {(item: ComboboxOption) => {
                const option = item as ComboboxOption;
                return (
                  <ComboboxPrimitive.Item
                    key={option.value || "none"}
                    value={option}
                    className={cn(listItem, option.meta && "grid-cols-[1rem_1fr_auto]")}
                  >
                    <ComboboxPrimitive.ItemIndicator className="col-start-1 flex">
                      <CheckIcon aria-hidden className="size-4" />
                    </ComboboxPrimitive.ItemIndicator>
                    <span className="col-start-2 min-w-0 truncate">
                      <span className={option.value ? undefined : "text-muted-foreground"}>{option.label}</span>
                      {option.hint && <span className="text-muted-foreground"> · {option.hint}</span>}
                    </span>
                    {option.meta && (
                      <span className="col-start-3 ps-3 text-control text-muted-foreground tabular-nums">
                        {option.meta}
                      </span>
                    )}
                  </ComboboxPrimitive.Item>
                );
              }}
            </ComboboxPrimitive.List>
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </ComboboxPrimitive.Root>
  );
}
