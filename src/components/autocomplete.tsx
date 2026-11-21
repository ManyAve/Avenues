import * as Ui from "@ui-sdk/react/autocomplete";
import type {
  AutocompleteController,
  AutocompleteOpenChangeReason,
  AutocompleteSubmitDetails,
  AutocompleteValueChangeDetails as UiValueChangeDetails,
} from "@ui-sdk/react/autocomplete";
import type { AsyncOptionsStatus } from "@ui-sdk/react/async-options";
import { mergeProps, renderElement } from "@ui-sdk/react/primitive";
import { XIcon } from "lucide-react";
import { createContext, use, useLayoutEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from "react";
import type { ChangeDetails } from "#avenue/lib/change";
import {
  fieldControl,
  listGroupLabel,
  listItem,
  listPopup,
  listScroll,
  listSeparator,
  listSheetHandle,
  sheetSearch,
  type PickerSize,
  type Presentation,
} from "#avenue/lib/picker";
import { defined, type Loose, type NodeChildren, type OwnPartProps } from "#avenue/lib/props";
import {
  MarkedText,
  markWords,
  matchWords,
  SearchContext,
  searchMessage,
  searchMessageShows,
  type SearchState,
} from "#avenue/lib/search";
import { cn } from "#avenue/lib/utils";

/** What `onValueChange` gets after the text: ui-sdk Autocomplete's own details (reason, event, `item`, `cancel()`). */
export type AutocompleteValueChangeDetails = UiValueChangeDetails;

/** What `onOpenChange` gets after the new state: ui-sdk Autocomplete's own details. */
export type AutocompleteOpenChangeDetails = ChangeDetails<AutocompleteOpenChangeReason>;

/** What the parts share through the root: the field the popup lines up with, whether it is disabled, and its text. */
type Shared = {
  anchor: HTMLElement | null;
  setAnchor: (element: HTMLElement | null) => void;
  disabled: boolean;
  text: string;
};
const SharedContext = createContext<Shared | null>(null);

/** The label of the `AutocompleteItem` an `AutocompleteItemText` sits in, for the text it marks. */
const ItemLabelContext = createContext<string | undefined>(undefined);

function useShared(part: string): Shared {
  const shared = use(SharedContext);
  if (!shared) throw new Error(`${part} goes inside Avenue's Autocomplete.`);
  return shared;
}

export type AutocompleteProps = {
  /** The text. Pass it with `onValueChange` to control the field, or leave it out and use `defaultValue`. */
  value?: string | undefined;
  /** The text at first, when `value` is left out. A form reset returns to it. */
  defaultValue?: string | undefined;
  /**
   * Gets the new text and ui-sdk's details, on typing, choosing a suggestion (`details.item`), the phone's Clear, a
   * form reset or a controller. `details.cancel()` keeps the old text. With `status`, send it on to
   * `useAsyncOptions`' `setQuery`.
   */
  onValueChange?: ((value: string, details: AutocompleteValueChangeDetails) => void) | undefined;
  /** Whether the suggestions are open. Pass it with `onOpenChange` to control them. */
  open?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  onOpenChange?: ((open: boolean, details: AutocompleteOpenChangeDetails) => void) | undefined;
  onOpenChangeComplete?: ((open: boolean) => void) | undefined;
  /** Runs with the text on Enter with no suggestion highlighted, or on a pick with `submitOnSelect`. */
  onSubmit?: ((value: string, details: AutocompleteSubmitDetails) => void) | undefined;
  /** The suggestions as data, for loaded results or recent searches. Render them in `AutocompleteList` from its state. */
  items?: Loose<Ui.AutocompleteProps>["items"];
  /** Suggestions shown instead of `items` while the field is empty, like recent searches, with `openOnFocus`. */
  emptyItems?: Loose<Ui.AutocompleteProps>["emptyItems"];
  /**
   * How typing narrows the suggestions. By default Avenue's word search, as Combobox's: every word typed appears in
   * the suggestion or a keyword. A function of the item and the text; or `false` to keep every one in the order given,
   * the default with `status`, so a source's own ranking stands (Mapbox, a directory).
   */
  filter?: Loose<Ui.AutocompleteProps>["filter"];
  /**
   * For suggestions loaded as you type (AVE-207): ui-sdk's `useAsyncOptions` status. With it, the list says
   * "Searching…" while they load (never "nothing matches"), "Couldn't search. Try again." after a failure, and the
   * count once they arrive, read politely to screen readers.
   */
  status?: AsyncOptionsStatus | undefined;
  /** Runs when scrolling or the arrow keys reach the last suggestion, for the next page: `useAsyncOptions`' `loadMore`. */
  onLoadMore?: (() => void) | undefined;
  /** Whether the first suggestion is highlighted while typing, so Enter chooses it. Off: Enter keeps the typed text. */
  autoHighlight?: boolean | undefined;
  /** Whether the suggestions open on focus, before anything is typed (recent searches). */
  openOnFocus?: boolean | undefined;
  /** Whether choosing a suggestion submits, like a search box: `onSubmit` runs, then the form submits. */
  submitOnSelect?: boolean | undefined;
  /**
   * How the suggestions open. "auto" (default) opens a bottom sheet on a small touch screen, with the field in the
   * sheet's header and the keyboard closed until it is tapped, and a popover elsewhere (UX Engineer, AVE-39).
   */
  presentation?: Presentation | undefined;
  name?: string | undefined;
  form?: string | undefined;
  required?: boolean | undefined;
  disabled?: boolean | undefined;
  readOnly?: boolean | undefined;
  /** Opens, closes, reads and sets the field from anywhere: `createAutocompleteController()`. */
  controller?: AutocompleteController | undefined;
  children: ReactNode;
};

/**
 * A text field that suggests as you type, where any text is a valid value: a search box, an address, a name
 * (ui-sdk's Autocomplete). Choosing a suggestion fills the field. Use Combobox when the value must be one of the
 * options. Its suggestions can come from the app or load as you type, with ui-sdk's `useAsyncOptions`:
 *
 * ```tsx
 * const people = useAsyncOptions(searchDirectory, { debounce: 200 });
 * <Field>
 *   <FieldLabel>Resident</FieldLabel>
 *   <Autocomplete items={people.items} status={people.status} onValueChange={people.setQuery} onLoadMore={people.loadMore}>
 *     <AutocompleteInput icon={<SearchIcon />} placeholder="Search by name or address" />
 *     <AutocompleteContent>
 *       <AutocompleteStatus emptyMessage={(q) => `No residents match “${q}”.`} />
 *       <AutocompleteList>
 *         {(state) => (state.items as string[]).map((name) => <AutocompleteItem key={name} value={name}>{name}</AutocompleteItem>)}
 *       </AutocompleteList>
 *     </AutocompleteContent>
 *   </Autocomplete>
 * </Field>
 * ```
 *
 * Each suggestion marks the typed words in it, heavier, for the eye only (AVE-207). On a small touch screen the
 * suggestions open as a sheet with the field in its header, and the field has a Clear button (AVE-39, AVE-93).
 */
function Autocomplete({
  disabled,
  presentation = "auto",
  filter,
  status,
  value,
  defaultValue,
  onValueChange,
  children,
  ...props
}: AutocompleteProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  // The text, for the marks and for the field's stand-in while the input sits in the sheet's header.
  const [own, setOwn] = useState(defaultValue ?? "");
  const text = value ?? own;
  const shared = useMemo(() => ({ anchor, setAnchor, disabled: !!disabled, text }), [anchor, disabled, text]);
  const search = useMemo(() => ({ query: text, status }), [text, status]);
  const resolvedFilter = filter !== undefined ? filter : status !== undefined ? false : matchWords;
  return (
    <SharedContext value={shared}>
      <SearchContext value={search}>
        <Ui.Autocomplete
          presentation={presentation}
          filter={resolvedFilter}
          {...defined({ disabled, status, value, defaultValue })}
          {...defined(props)}
          onValueChange={(next, details) => {
            onValueChange?.(next, details);
            if (!details.canceled) setOwn(next);
          }}
        >
          {children}
        </Ui.Autocomplete>
      </SearchContext>
    </SharedContext>
  );
}

type InputProps = Omit<Loose<ComponentProps<typeof Ui.AutocompleteInput>>, "size" | "className"> & {
  size?: PickerSize | undefined;
  /** A leading icon (a magnifier, a pin). Decorative. */
  icon?: ReactNode | undefined;
  invalid?: boolean | undefined;
  /**
   * Names the phone's clear button. By default "Clear" and the field's label in lower case ("Clear resident"), read
   * from the input's label or `aria-label`.
   */
  clearLabel?: string | undefined;
  /** Classes for the whole field, not only the text input inside it. */
  className?: string | undefined;
};

/**
 * The field: the text input in Avenue's control surface, with an optional leading icon and, on a touch screen, a
 * Clear button that empties it in one tap and keeps focus in it (AVE-93). Clear shows only while there is text, and
 * never with a mouse, where the field looks as Combobox's does without its chevron. While the suggestions are a sheet,
 * ui-sdk moves the input into the sheet's header; the field behind keeps showing the text.
 */
function AutocompleteInput({ size, icon, invalid, clearLabel, placeholder, className, ref, ...props }: InputProps) {
  const { setAnchor, disabled, text } = useShared("AutocompleteInput");
  const inputRef = useRef<HTMLInputElement>(null);
  const [fieldName, setFieldName] = useState<string | undefined>();
  useLayoutEffect(() => {
    const element = inputRef.current;
    const label = element?.getAttribute("aria-label") ?? element?.labels?.[0]?.textContent ?? undefined;
    setFieldName(label?.trim().toLowerCase() || undefined);
  }, []);
  return (
    <div
      ref={setAnchor}
      data-slot="autocomplete"
      data-disabled={disabled || undefined}
      className={cn(fieldControl({ size }), "gap-0 pe-0 pointer-coarse:min-h-11", icon ? "ps-2" : "ps-0", className)}
    >
      {icon && (
        <span aria-hidden className="flex shrink-0 text-muted-foreground">
          {icon}
        </span>
      )}
      {/* While the suggestions are a sheet, ui-sdk moves the input into its header; this stand-in shows the text in
          the field behind it, as Combobox's shows its choice (AVE-76). Hidden from screen readers: the real field is
          in the sheet. */}
      <span
        aria-hidden
        data-slot="autocomplete-value"
        className={cn(
          "hidden min-w-0 flex-1 truncate px-2 [[data-slot=autocomplete]:not(:has(>input))>&]:block",
          !text && "text-muted-foreground",
        )}
      >
        {text || placeholder}
      </span>
      <Ui.AutocompleteInput
        ref={(element: HTMLInputElement | null) => {
          inputRef.current = element;
          if (typeof ref === "function") return ref(element);
          if (ref) ref.current = element;
        }}
        aria-invalid={invalid || undefined}
        {...defined({ placeholder })}
        {...defined(props)}
        className={cn(
          // w-full and min-w-0, as Combobox's input, so the field never sets a content-sized column's minimum (AVE-113).
          "h-full w-full min-w-0 flex-1 bg-transparent px-2 outline-none placeholder:text-placeholder disabled:cursor-not-allowed",
          sheetSearch,
        )}
      />
      {/* Phones only, as Combobox's (UX Engineer, AVE-93). Undoable (type it again), so no agent confirm. */}
      <Ui.AutocompleteClear
        aria-label={clearLabel ?? (fieldName ? `Clear ${fieldName}` : "Clear text")}
        className="relative hit-area hidden h-full w-11 shrink-0 items-center justify-center text-muted-foreground outline-none pointer-coarse:flex disabled:cursor-not-allowed"
      >
        <XIcon aria-hidden />
      </Ui.AutocompleteClear>
    </div>
  );
}

/**
 * The open suggestions: a popover as wide as the field, or a bottom sheet on a small touch screen, with the sheet's
 * handle. Put an `AutocompleteStatus` (for loaded suggestions) or an `AutocompleteEmpty`, and an `AutocompleteList`,
 * in it.
 */
function AutocompleteContent({
  side = "bottom",
  align = "start",
  sideOffset = 4,
  anchor: anchorProp,
  className,
  children,
  ...props
}: NodeChildren<Loose<ComponentProps<typeof Ui.AutocompleteContent>>>) {
  const { anchor } = useShared("AutocompleteContent");
  return (
    <Ui.AutocompleteContent
      anchor={anchorProp ?? anchor}
      side={side}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        listPopup,
        "not-sheet:has-data-empty:p-0 sheet:h-[calc(var(--visual-viewport-height,100dvh)*0.85)]",
        className,
      )}
      {...defined(props)}
    >
      <div aria-hidden data-slot="sheet-handle" className={listSheetHandle} />
      {children}
    </Ui.AutocompleteContent>
  );
}

/** What the list says while nothing matches. Hidden otherwise, and while suggestions load or after a failure. */
function AutocompleteEmpty({ className, ...props }: Loose<ComponentProps<typeof Ui.AutocompleteEmpty>>) {
  const { status } = use(SearchContext);
  return (
    <Ui.AutocompleteEmpty
      className={cn(
        "px-3 py-2 text-sm text-muted-foreground not-data-empty:hidden data-loading:hidden",
        status === "error" && "hidden",
        className,
      )}
      {...defined(props)}
    />
  );
}

type StatusProps = Omit<Loose<ComponentProps<typeof Ui.AutocompleteStatus>>, "children" | "className"> & {
  /** The words for each state. By default Avenue's; gets ui-sdk's status, the count shown and the text typed. */
  children?: ReactNode | ((state: SearchState) => ReactNode) | undefined;
  /** What it says when nothing matched, from the trimmed text. By default "Nothing matches “smi”." */
  emptyMessage?: ((query: string) => ReactNode) | undefined;
  className?: string | undefined;
};

/**
 * The state of suggestions loaded as you type, read politely to screen readers: "Searching…", "Nothing matches
 * “smi”.", "Couldn't search. Try again.", or the count (UX Engineer, AVE-207). It shows in the list while it is all
 * the list has to say; a count, or "Searching…" over the last suggestions, is only heard, so nothing moves under the
 * pointer. It says when nothing matched itself, so leave `AutocompleteEmpty` out beside it.
 */
function AutocompleteStatus({ children, emptyMessage, className, ...props }: StatusProps) {
  const { query } = use(SearchContext);
  return (
    <Ui.AutocompleteStatus
      {...defined(props)}
      className={(state) =>
        cn(searchMessageShows(state) ? "block px-2 py-1 text-sm text-muted-foreground" : "sr-only", className)
      }
    >
      {(state) => {
        const search = { status: state.status, loading: state.loading, count: state.count, query: query.trim() };
        if (typeof children === "function") return children(search);
        return children ?? searchMessage(search, emptyMessage);
      }}
    </Ui.AutocompleteStatus>
  );
}

/** The suggestions. In a sheet, the part that scrolls. Its children can be a function of its state (`state.items`). */
function AutocompleteList({ className, ...props }: Loose<ComponentProps<typeof Ui.AutocompleteList>>) {
  return <Ui.AutocompleteList className={cn("scroll-py-1 outline-none", listScroll, className)} {...defined(props)} />;
}

type ItemProps = NodeChildren<Loose<ComponentProps<typeof Ui.AutocompleteItem>>> & {
  /** Right-aligned muted text, e.g. "Unit 4". Display only. */
  meta?: ReactNode | undefined;
};

/**
 * One suggestion: its text, with the typed words marked, then `meta`. Give it `label` when the children aren't plain
 * text: the field gets it when chosen, and the search matches it. No check column: a suggestion fills the field, it
 * isn't a choice that stays ticked.
 */
function AutocompleteItem({ className, children, label, meta, ...props }: ItemProps) {
  const text = label ?? (typeof children === "string" ? children : undefined);
  const content = typeof children === "string" ? <AutocompleteItemText>{children}</AutocompleteItemText> : children;
  return (
    <ItemLabelContext value={text}>
      <Ui.AutocompleteItem
        className={cn(listItem, "grid-cols-[1fr]", meta != null && "grid-cols-[1fr_auto]", className)}
        {...defined({ label: text })}
        {...defined(props)}
      >
        <span className="min-w-0">{content}</span>
        {meta != null && <span className="ps-3 text-control text-muted-foreground tabular-nums">{meta}</span>}
      </Ui.AutocompleteItem>
    </ItemLabelContext>
  );
}

/**
 * A suggestion's text with each typed word marked, heavier, for the eye only: the option's name stays its plain text
 * (UX Engineer, AVE-207). Its children, or its item's `label`. An `AutocompleteItem` with plain text marks it already.
 * ui-sdk's own `AutocompleteItemText` marks only under its named filters, never under Avenue's word search or
 * `filter={false}`, so Avenue draws its own.
 */
function AutocompleteItemText({
  children,
  className,
  render,
  ...props
}: Omit<OwnPartProps<"span">, "children"> & { children?: string | undefined }) {
  const label = use(ItemLabelContext);
  const { query } = use(SearchContext);
  const text = children ?? label ?? "";
  const marked = query.trim() !== "" && markWords(text, query).some((segment) => segment.match);
  return renderElement(
    "span",
    mergeProps(
      {
        "data-slot": "autocomplete-item-label",
        "data-matched": marked ? "" : undefined,
        className,
        children: <MarkedText text={text} query={query} />,
      },
      defined(props),
    ),
    render,
  );
}

/** Suggestions that belong together, named by an `AutocompleteGroupLabel`. A search hides a group with no matches. */
function AutocompleteGroup(props: Loose<ComponentProps<typeof Ui.AutocompleteGroup>>) {
  return <Ui.AutocompleteGroup {...defined(props)} />;
}

/** A group's heading, in line with its suggestions' text (no check column to clear). */
function AutocompleteGroupLabel({ className, ...props }: Loose<ComponentProps<typeof Ui.AutocompleteGroupLabel>>) {
  return <Ui.AutocompleteGroupLabel className={cn(listGroupLabel, "ps-2", className)} {...defined(props)} />;
}

/** A line between suggestions or groups. */
function AutocompleteSeparator({ className, ...props }: Loose<ComponentProps<typeof Ui.AutocompleteSeparator>>) {
  return <Ui.AutocompleteSeparator className={cn(listSeparator, className)} {...defined(props)} />;
}

/** The field's label, tied to its input, drawn as `FieldLabel`, for a field that isn't in a `Field`. */
function AutocompleteLabel({ className, ...props }: Loose<ComponentProps<typeof Ui.AutocompleteLabel>>) {
  return <Ui.AutocompleteLabel className={cn("flex w-fit items-center gap-2 text-field leading-snug font-medium select-none data-disabled:opacity-50", className)} {...defined(props)} />;
}

export {
  Autocomplete,
  AutocompleteContent,
  AutocompleteEmpty,
  AutocompleteGroup,
  AutocompleteGroupLabel,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteItemText,
  AutocompleteLabel,
  AutocompleteList,
  AutocompleteSeparator,
  AutocompleteStatus,
};
