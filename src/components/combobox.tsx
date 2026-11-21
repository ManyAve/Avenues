import * as Ui from "@ui-sdk/react/combobox";
import type {
  ComboboxController,
  ComboboxOpenChangeReason,
  ComboboxQueryChangeReason,
  ComboboxValueChangeReason,
} from "@ui-sdk/react/combobox";
import { CheckIcon, ChevronsUpDownIcon, XIcon } from "lucide-react";
import {
  createContext,
  use,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { report, type ChangeDetails } from "#avenue/lib/change";
import { controlSize, controlSurface } from "#avenue/lib/control";
import {
  fieldControl,
  flatItems,
  isGroup,
  isSeparator,
  listGroupLabel,
  listItem,
  listPopup,
  listScroll,
  listSeparator,
  listSheetHandle,
  entryKeys,
  toItem,
  valueKey,
  type ListData,
  type ListGroup,
  type ListItem,
  type ListSeparator,
  type PickerSize,
  type Presentation,
} from "#avenue/lib/picker";
import { defined, type Loose, type NodeChildren } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

export type { ListData, ListGroup, ListItem, ListSeparator };

/**
 * One choice in a Combobox's `items`: ui-sdk's item (`value`, `label`, `keywords`, `disabled`), plus two Avenue
 * additions the one-tag Combobox draws in the list.
 */
export type ComboboxItemData<T = string> = ListItem<T> & {
  /** Muted text after the label in the list, e.g. "$120.00 owing". Display only; the default search ignores it. */
  hint?: string | undefined;
  /** Right-aligned muted text in the list, e.g. "ID 1042". */
  meta?: string | undefined;
};

// ui-sdk treats an empty value as nothing chosen, so the "none" option carries its own value inside the component. A
// form gets "" for it instead, like a native select's empty option (see the hidden input below).
const NONE = "\u0000none";
const NO_ITEMS: readonly never[] = [];
type None = typeof NONE;

/** "" is the old "nothing chosen" (AVE-137); it still reads as null until both apps have moved off it. */
const chosen = <T,>(value: T | null | undefined): T | null => (value === "" || value === undefined ? null : value);

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Default search: every word typed appears in the label or a keyword (case- and accent-insensitive). */
function matchWords(item: ListItem<unknown>, query: string): boolean {
  const text = fold([item.label, ...(item.keywords ?? [])].join(" "));
  return fold(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => text.includes(w));
}

/** What `onValueChange` gets after the value: ui-sdk Combobox's own details (reason, event, source, `cancel()`). */
export type ComboboxValueChangeDetails = ChangeDetails<ComboboxValueChangeReason>;

/** What `onOpenChange` gets after the new state: ui-sdk Combobox's own details. */
export type ComboboxOpenChangeDetails = ChangeDetails<ComboboxOpenChangeReason>;

/** What `onQueryChange` gets after the new text: ui-sdk Combobox's own details. */
export type ComboboxQueryChangeDetails = ChangeDetails<ComboboxQueryChangeReason>;

/**
 * What the parts share through the root: the element the popup lines up with (the field, or a `ComboboxTrigger`),
 * whether the field is disabled, and whether it picks several values.
 */
type Shared = {
  anchor: HTMLElement | null;
  setAnchor: (element: HTMLElement | null) => void;
  disabled: boolean;
  multiple: boolean;
};
const SharedContext = createContext<Shared | null>(null);

/** True inside `ComboboxContent`: a `ComboboxInput` there is the popup's search field (ui-sdk's "Input in the Popup"). */
const InContentContext = createContext(false);

/** True inside `ComboboxChips`: a `ComboboxInput` there is the search after the chips, in the field `ComboboxChips` draws. */
const ChipsContext = createContext(false);

/** The value of the `ComboboxChip` a `ComboboxChipRemove` sits in, so the button can name itself after the chip. */
const ChipContext = createContext<{ value: unknown } | null>(null);

function useShared(part: string): Shared {
  const shared = use(SharedContext);
  if (!shared) throw new Error(`${part} goes inside Avenue's Combobox.`);
  return shared;
}

/** The props the root hands on to ui-sdk's Combobox, for one value or, with `multiple`, a list of them. */
type RootProps<V> = {
  multiple?: boolean | undefined;
  keepQuery?: boolean | undefined;
  maxSelected?: number | undefined;
  value?: V | readonly V[] | null | undefined;
  defaultValue?: V | readonly V[] | null | undefined;
  // Either a single value's callback or a list's: the public types below keep them apart.
  onValueChange?: ((value: never, details: ComboboxValueChangeDetails) => void) | undefined;
  open?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  onOpenChange?: ((open: boolean, details: ComboboxOpenChangeDetails) => void) | undefined;
  onOpenChangeComplete?: ((open: boolean) => void) | undefined;
  controller?: ComboboxController<V, boolean> | undefined;
  onQueryChange?: ((query: string, details: ComboboxQueryChangeDetails) => void) | undefined;
  filter?: ((item: ListItem<V>, query: string) => boolean | number) | undefined;
  itemToValue?: ((value: V) => string) | undefined;
  itemToLabel?: ((value: V) => string) | undefined;
  isItemEqualToValue?: ((itemValue: V, value: V) => boolean) | undefined;
  name?: string | undefined;
  form?: string | undefined;
  required?: boolean | undefined;
  disabled?: boolean | undefined;
  presentation?: Presentation | undefined;
  children?: ReactNode;
};

/** The root and its shared state, for both forms. */
function ComboboxRoot<V>({ disabled, presentation = "auto", filter, multiple, children, ...props }: RootProps<V>) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const shared = useMemo(
    () => ({ anchor, setAnchor, disabled: !!disabled, multiple: !!multiple }),
    [anchor, disabled, multiple],
  );
  // ui-sdk types the value by `Multiple`; the public props below already tie `multiple` to a list value and callback,
  // so the root hands them on as one shape.
  const options = {
    ...defined({ disabled, multiple }),
    ...(filter ? { filter: filter as (item: Ui.ListItem<V>, query: string) => boolean | number } : {}),
    ...defined(props),
  } as Ui.ComboboxProps<V, boolean>;
  return (
    <SharedContext value={shared}>
      <Ui.Combobox<V, boolean> autoHighlight presentation={presentation} {...options}>
        {children}
      </Ui.Combobox>
    </SharedContext>
  );
}

type InputProps = Omit<Loose<ComponentProps<typeof Ui.ComboboxInput>>, "size" | "className"> & {
  size?: PickerSize | undefined;
  /** A leading icon (house, globe). Decorative. */
  icon?: ReactNode | undefined;
  invalid?: boolean | undefined;
  /** Names the chevron button for screen readers ("Show households"). */
  triggerLabel?: string | undefined;
  /**
   * Names the phone's clear button. By default "Clear" and the field's label in lower case ("Clear household"),
   * read from the input's label or `aria-label`.
   */
  clearLabel?: string | undefined;
  /** Classes for the whole field, not only the text input inside it. */
  className?: string | undefined;
};

/**
 * The closed field: the search input in Avenue's control surface, with an optional leading icon, the phone's clear
 * button and the chevron. Its list opens lined up with the whole field.
 *
 * Inside `ComboboxContent` it is the popup's search field instead (ui-sdk's "Input in the Popup", opened by a
 * `ComboboxTrigger`): the text input alone, in the control surface, with no icon, clear button or chevron.
 *
 * Icons are the app's 14px (its time-zone picker, AVE-59): the leading icon, the chevron and the check. The leading
 * icon sits 8px from the edge where the app's sits 10px, the AVE-2 section 1 step inside a control.
 */
function ComboboxInput(props: InputProps) {
  const inContent = use(InContentContext);
  const inChips = use(ChipsContext);
  if (inContent) return <PopupInput {...props} />;
  return inChips ? <ChipsInput {...props} /> : <FieldInput {...props} />;
}

/** The search field inside the popup: the input alone, 32px, in Avenue's control surface (44px on a touch screen). */
function PopupInput({ size, icon: _icon, invalid, triggerLabel: _trigger, clearLabel: _clear, className, ...props }: InputProps) {
  useShared("ComboboxInput");
  return (
    <Ui.ComboboxInput
      aria-invalid={invalid || undefined}
      {...defined(props)}
      className={cn(controlSurface, controlSize({ size: size ?? "md" }), "py-1 pointer-coarse:min-h-11", className)}
    />
  );
}

// In a sheet, ui-sdk moves the field's input into the sheet's header, where it is a 44px search field of its own.
const sheetSearch =
  "sheet:h-11 sheet:w-full sheet:rounded-lg sheet:border sheet:border-input sheet:px-3 sheet:text-base sheet:transition-colors sheet:focus-visible:border-ring sheet:focus-visible:ring-3 sheet:focus-visible:ring-ring/20 forced-colors:sheet:focus-visible:outline-2 forced-colors:sheet:focus-visible:outline-offset-2 forced-colors:sheet:focus-visible:outline-solid dark:sheet:bg-input/30";

function FieldInput({
  size,
  icon,
  invalid,
  triggerLabel = "Show options",
  clearLabel,
  placeholder,
  className,
  onFocus,
  onMouseUp,
  onBlur,
  ref,
  ...props
}: InputProps) {
  const { setAnchor, disabled, multiple } = useShared("ComboboxInput");
  // Focus selects the whole label so typing replaces it; the click that focused must not undo that selection.
  const focusing = useRef(false);
  // The clear button's name follows the field's own label, which a Field gives the input after it mounts.
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
      <Ui.ComboboxValue>
        {({ label }) => (
          <span
            aria-hidden
            data-slot="combobox-value"
            className={cn(
              "hidden min-w-0 flex-1 truncate px-2 [[data-slot=combobox]:not(:has(>input))>&]:block",
              !label && "text-muted-foreground",
            )}
          >
            {label || placeholder}
          </span>
        )}
      </Ui.ComboboxValue>
      <Ui.ComboboxInput
        ref={(element: HTMLInputElement | null) => {
          inputRef.current = element;
          if (typeof ref === "function") return ref(element);
          if (ref) ref.current = element;
        }}
        aria-invalid={invalid || undefined}
        {...defined({ placeholder })}
        {...defined(props)}
        onFocus={(e) => {
          focusing.current = true;
          const input = e.currentTarget;
          // With `multiple` the text is only the search, never a chosen label, so focus leaves it as it is: typing
          // goes on from the text kept after a pick (`keepQuery`) rather than replacing it.
          if (multiple) return onFocus?.(e);
          // On a phone, selected text brings up the system's copy and select handles, so the cursor goes to the end
          // instead; with a mouse or keyboard, the whole label is selected so typing replaces it (AVE-76).
          if (input.ownerDocument.defaultView?.matchMedia("(pointer: coarse)").matches) {
            input.setSelectionRange(input.value.length, input.value.length);
          } else input.select();
          onFocus?.(e);
        }}
        onMouseUp={(e) => {
          if (focusing.current) e.preventDefault();
          focusing.current = false;
          onMouseUp?.(e);
        }}
        onBlur={(e) => {
          focusing.current = false;
          onBlur?.(e);
        }}
        className={cn(
          // w-full: a text field's default width (about 20 characters) is also its smallest, so in a column sized by
          // its content (a grid's automatic column) it set that column's minimum and widened a card past a phone. A
          // percentage width lets the browser shrink it to nothing there, while a row sized by its content still gets
          // the default width (AVE-113). flex-1 sizes it inside the group either way, so nothing else moves.
          "h-full w-full min-w-0 flex-1 bg-transparent px-2 outline-none placeholder:text-placeholder disabled:cursor-not-allowed",
          sheetSearch,
        )}
      />
      {/* On a phone the cursor lands after the chosen label instead of selecting it (AVE-76), so typing would add to
          it; Clear empties the field and the search in one tap, keeps focus in it, and shows only while there is
          something to clear. ui-sdk's own Escape brings the choice back while the list is open. With a mouse,
          select-on-focus does this job, so the button never shows there and the desktop look is unchanged
          (UX Engineer, AVE-93). Undoable, so no agent confirm. */}
      <Ui.ComboboxClear
        aria-label={clearLabel ?? (fieldName ? `Clear ${fieldName}` : "Clear choice")}
        className="relative hit-area hidden h-full w-11 shrink-0 items-center justify-center text-muted-foreground outline-none pointer-coarse:flex disabled:cursor-not-allowed"
      >
        <XIcon aria-hidden />
      </Ui.ComboboxClear>
      <Ui.ComboboxTrigger
        aria-label={triggerLabel}
        className="flex h-full w-8 shrink-0 items-center pointer-coarse:w-11 justify-center text-muted-foreground outline-none disabled:cursor-not-allowed"
      >
        <ChevronsUpDownIcon aria-hidden />
      </Ui.ComboboxTrigger>
    </div>
  );
}

/**
 * A button that opens the list, for a combobox whose search field sits inside the popup (ui-sdk's "Input in the
 * Popup"): a table filter's pill, a "Streets" button. The list lines up with it. It has no look of its own: give it
 * `render`, like `render={<Button variant="outline" />}`, and show the choice in it with `ComboboxValue`. A
 * `ComboboxInput` in the field brings its own chevron, so it needs none of this.
 */
function ComboboxTrigger({ ref, ...props }: Loose<ComponentProps<typeof Ui.ComboboxTrigger>>) {
  const { setAnchor } = useShared("ComboboxTrigger");
  return (
    <Ui.ComboboxTrigger
      ref={(element: HTMLButtonElement | null) => {
        setAnchor(element);
        if (typeof ref === "function") return ref(element);
        if (ref) ref.current = element;
      }}
      {...defined(props)}
    />
  );
}

/** The chosen value as text, or a function of it (`{ value, labels, label }`). Draws no element of its own. */
function ComboboxValue(props: Loose<ComponentProps<typeof Ui.ComboboxValue>>) {
  return <Ui.ComboboxValue {...defined(props)} />;
}

/**
 * The search after the chips, inside `ComboboxChips`: the text input alone, on the chips' line. The field around it
 * (surface, focus ring, chevron) is `ComboboxChips`'s. 24px with a mouse, so a line of chips keeps one height; 44px on
 * a touch screen, as every text field there.
 */
function ChipsInput({ size: _size, icon: _icon, invalid, triggerLabel: _trigger, clearLabel: _clear, className, ...props }: InputProps) {
  return (
    <Ui.ComboboxInput
      aria-invalid={invalid || undefined}
      {...defined(props)}
      className={cn(
        // min-w-24: room for a short placeholder ("Add a street…"), after which the input wraps to a line of its own.
        "h-6 w-full min-w-24 flex-1 bg-transparent px-1 outline-none placeholder:text-placeholder disabled:cursor-not-allowed pointer-coarse:h-11",
        sheetSearch,
        className,
      )}
    />
  );
}

type ChipsProps = Loose<ComponentProps<typeof Ui.ComboboxChips>> & {
  size?: PickerSize | undefined;
  /** Names the chevron button for screen readers ("Show streets"). */
  triggerLabel?: string | undefined;
  /** Classes for the whole field, not only the chips' line inside it. */
  className?: string | undefined;
};

/**
 * A multi-pick field with its search in the field (ui-sdk's "Multiple"): the chosen values as chips, then the search,
 * in Avenue's field surface with the chevron at the end. The field grows a line at a time as the chips wrap. Put a
 * `ComboboxValue` that draws one `ComboboxChip` per value, and a `ComboboxInput`, inside it:
 *
 * ```tsx
 * <Combobox multiple value={streets} onValueChange={setStreets} itemToLabel={streetName}>
 *   <ComboboxChips triggerLabel="Show streets">
 *     <ComboboxValue>{({ value }) => (value as string[]).map((v) => <ComboboxChip key={v} value={v} />)}</ComboboxValue>
 *     <ComboboxInput aria-label="Streets" placeholder="Add a street…" />
 *   </ComboboxChips>
 *   <ComboboxContent>…</ComboboxContent>
 * </Combobox>
 * ```
 *
 * ui-sdk gives it its keys: Backspace in the empty search removes the last chip, and the arrow keys move between the
 * chips. There is no phone Clear button here, as the one-value field has: each chip has its own remove button.
 *
 * Sizes as the one-value field: md 32px, sm 28px, with mouse lines of 24px (4px apart); on a touch screen each line is
 * 44px, so every chip's remove button keeps a 44px tap that touches no other.
 */
function ComboboxChips({ size, triggerLabel = "Show options", className, children, ...props }: ChipsProps) {
  const { setAnchor, disabled } = useShared("ComboboxChips");
  return (
    <div
      ref={setAnchor}
      data-slot="combobox"
      data-disabled={disabled || undefined}
      className={cn(
        fieldControl({ size }),
        // The field grows with its lines: a fixed height becomes a minimum, with the line's padding above and below.
        "h-auto gap-0 ps-1 pe-0 pointer-coarse:min-h-11 pointer-coarse:py-0",
        size === "sm" ? "min-h-control-sm py-px" : "min-h-control-md py-[3px]",
        className,
      )}
    >
      <ChipsContext value={true}>
        <Ui.ComboboxChips
          {...defined(props)}
          // gap-controls: 16px between chips on a phone, so the remove buttons' 44px taps never meet (AVE-22).
          className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1 gap-y-1 pointer-coarse:gap-x-controls pointer-coarse:gap-y-0 pointer-coarse:pe-3"
        >
          {children}
        </Ui.ComboboxChips>
      </ChipsContext>
      <Ui.ComboboxTrigger
        aria-label={triggerLabel}
        className="flex w-8 shrink-0 items-center justify-center self-stretch text-muted-foreground outline-none disabled:cursor-not-allowed pointer-coarse:w-11"
      >
        <ChevronsUpDownIcon aria-hidden />
      </Ui.ComboboxTrigger>
    </div>
  );
}

/** The label ui-sdk gives a chosen value: from `itemToLabel`, its item's label, or the value itself. */
function labelOf(state: { value: unknown; labels: string[] }, value: unknown): string {
  const values = Array.isArray(state.value) ? state.value : [];
  return state.labels[values.indexOf(value)] ?? String(value);
}

/**
 * One chosen value, as a chip in Badge's secondary look: a 20px pill of 12px text. Without children it shows the
 * value's label and its remove button; with children, they are the chip's whole content (ui-sdk's shape), so add a
 * `ComboboxChipRemove` yourself. ui-sdk marks it `data-disabled` while the combobox is disabled or read-only.
 */
function ComboboxChip<T = string>({
  value,
  className,
  children,
  ...props
}: NodeChildren<Loose<ComponentProps<typeof Ui.ComboboxChip<T>>>>) {
  const chip = useMemo(() => ({ value }), [value]);
  return (
    <ChipContext value={chip}>
      <Ui.ComboboxChip<T>
        value={value}
        className={cn(
          "inline-flex h-5 max-w-full min-w-0 shrink-0 items-center gap-0.5 rounded-full bg-secondary ps-2 pe-0.5 text-xs font-medium whitespace-nowrap text-secondary-foreground outline-none",
          // Mouse lines are 24px, touch lines 44px: the margin makes up the line, so a line of chips alone is as tall
          // as one with the search in it.
          "my-0.5 pointer-coarse:my-3",
          "focus-visible:ring-3 focus-visible:ring-ring/50 data-disabled:opacity-50",
          className,
        )}
        {...defined(props)}
      >
        {children ?? (
          <>
            <span className="min-w-0 truncate">
              <Ui.ComboboxValue>{(state) => labelOf(state, value)}</Ui.ComboboxValue>
            </span>
            <ComboboxChipRemove />
          </>
        )}
      </Ui.ComboboxChip>
    </ChipContext>
  );
}

/**
 * The button in a chip that removes its value: a 16px round button with an ✕, a 24px reach with a mouse and a 44px
 * tap on a touch screen (`hit-area`). Its name is "Remove" and the chip's label ("Remove Oak Lane"), so every chip's
 * button has its own; pass `aria-label` to say it otherwise. Undoable (pick it again), so no agent confirm.
 */
function ComboboxChipRemove({ className, children, "aria-label": label, ...props }: Loose<ComponentProps<typeof Ui.ComboboxChipRemove>>) {
  const chip = use(ChipContext);
  const button = (name: string | undefined) => (
    <Ui.ComboboxChipRemove
      aria-label={name}
      className={cn(
        "relative hit-area flex size-4 shrink-0 items-center justify-center rounded-full text-secondary-foreground/70 outline-none transition-colors hover:bg-foreground/10 hover:text-secondary-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none [&>svg]:size-3",
        className,
      )}
      {...defined(props)}
    >
      {children ?? <XIcon aria-hidden />}
    </Ui.ComboboxChipRemove>
  );
  if (label !== undefined || !chip) return button(label ?? "Remove");
  return <Ui.ComboboxValue>{(state) => button(`Remove ${labelOf(state, chip.value)}`)}</Ui.ComboboxValue>;
}

/**
 * The open list: a popover as wide as the whole field, or a bottom sheet on a small touch screen, with the sheet's
 * handle. Put a `ComboboxEmpty` and a `ComboboxList` in it.
 */
function ComboboxContent({
  side = "bottom",
  align = "start",
  sideOffset = 4,
  anchor: anchorProp,
  className,
  children,
  ...props
}: NodeChildren<Loose<ComponentProps<typeof Ui.ComboboxContent>>>) {
  const { anchor } = useShared("ComboboxContent");
  return (
    <Ui.ComboboxContent
      anchor={anchorProp ?? anchor}
      side={side}
      align={align}
      sideOffset={sideOffset}
      // A sheet keeps one height while the search narrows the list, within the part of the screen above the keyboard.
      className={cn(
        listPopup,
        "not-sheet:has-data-empty:p-0 sheet:h-[calc(var(--visual-viewport-height,100dvh)*0.85)]",
        className,
      )}
      {...defined(props)}
    >
      <div aria-hidden data-slot="sheet-handle" className={listSheetHandle} />
      <InContentContext value={true}>{children}</InContentContext>
    </Ui.ComboboxContent>
  );
}

/** What the list says while nothing matches. Hidden otherwise. */
function ComboboxEmpty({ className, ...props }: Loose<ComponentProps<typeof Ui.ComboboxEmpty>>) {
  return (
    <Ui.ComboboxEmpty
      className={cn("px-3 py-2 text-sm text-muted-foreground not-data-empty:hidden", className)}
      {...defined(props)}
    />
  );
}

/** The options. In a sheet, the part that scrolls. */
function ComboboxList({ className, ...props }: Loose<ComponentProps<typeof Ui.ComboboxList>>) {
  return <Ui.ComboboxList className={cn("scroll-py-1 outline-none", listScroll, className)} {...defined(props)} />;
}

type ComboboxItemProps<T> = NodeChildren<Loose<ComponentProps<typeof Ui.ComboboxItem<T>>>> & {
  /** Right-aligned muted text, e.g. "ID 1042". Display only; searching ignores it. */
  meta?: ReactNode | undefined;
};

/**
 * One choice: the check while it is chosen, then its children (a label, or a label and a second line), then `meta`.
 * Give it `label` when the children aren't plain text: the field shows it once chosen, and the search matches it.
 *
 * With `multiple` the check sits in a checkbox's box, drawn as Avenue's Checkbox is, so a row reads as one that
 * toggles. It stays a combobox option (`aria-selected`), not a checkbox: the one combobox holds the whole choice.
 */
function ComboboxItem<T = string>({ value, className, children, label, meta, ...props }: ComboboxItemProps<T>) {
  const { multiple } = useShared("ComboboxItem");
  const text = label ?? (typeof children === "string" ? children : undefined);
  return (
    <Ui.ComboboxItem<T>
      value={value}
      className={cn(listItem, multiple && "group/combobox-item", meta != null && "grid-cols-[1rem_1fr_auto]", className)}
      {...defined({ label: text })}
      {...defined(props)}
    >
      {multiple ? (
        // data-[selected], not data-selected: Avenue's shadcn.css reads `data-selected:` as [data-selected="true"],
        // and ui-sdk sets it empty.
        <span
          aria-hidden
          className="col-start-1 flex size-4 shrink-0 items-center justify-center rounded-xs border border-control-outline transition-colors group-data-[selected]/combobox-item:border-primary group-data-[selected]/combobox-item:bg-primary group-data-[selected]/combobox-item:text-primary-foreground dark:bg-input/30 dark:group-data-[selected]/combobox-item:bg-primary"
        >
          <Ui.ComboboxItemIndicator className="grid place-content-center [&>svg]:size-3.5">
            <CheckIcon aria-hidden />
          </Ui.ComboboxItemIndicator>
        </span>
      ) : (
        <Ui.ComboboxItemIndicator className="col-start-1 flex">
          <CheckIcon aria-hidden className="size-3.5" />
        </Ui.ComboboxItemIndicator>
      )}
      <span className="col-start-2 min-w-0">{children}</span>
      {meta != null && <span className="col-start-3 ps-3 text-control text-muted-foreground tabular-nums">{meta}</span>}
    </Ui.ComboboxItem>
  );
}

/** Items that belong together, named by a `ComboboxGroupLabel`. A search hides a group once none of its items match. */
function ComboboxGroup(props: Loose<ComponentProps<typeof Ui.ComboboxGroup>>) {
  return <Ui.ComboboxGroup {...defined(props)} />;
}

/** A group's heading, in line with its items' text. */
function ComboboxGroupLabel({ className, ...props }: Loose<ComponentProps<typeof Ui.ComboboxGroupLabel>>) {
  return <Ui.ComboboxGroupLabel className={cn(listGroupLabel, className)} {...defined(props)} />;
}

/** A line between items or groups. */
function ComboboxSeparator({ className, ...props }: Loose<ComponentProps<typeof Ui.ComboboxSeparator>>) {
  return <Ui.ComboboxSeparator className={cn(listSeparator, className)} {...defined(props)} />;
}

/** The props both forms share: the value, the search and the form. */
interface ComboboxSharedProps<T, Item extends ComboboxItemData<T>> {
  /**
   * The chosen value, or null for none. Pass it with `onValueChange` to control the field, or leave it out
   * and use `defaultValue`. "" still means none, deprecated (AVE-137) and removed once both apps
   * have moved off it (AVE-154).
   */
  value?: T | null | undefined;
  /** The value chosen at first, when `value` is left out. A form reset returns to it. */
  defaultValue?: T | null | undefined;
  /**
   * Gets the new value, or null when the choice is cleared (the "none" option, or the phone's Clear), and ui-sdk's
   * details. `details.cancel()` keeps the old choice. A form reset reports reason "reset" (AVE-145).
   */
  onValueChange?: ((value: T | null, details: ComboboxValueChangeDetails) => void) | undefined;
  /**
   * Replaces the default word search (every word in the label or a keyword). True keeps an item; a number keeps it
   * and ranks it (higher first), e.g. the household matcher that puts an exact spreadsheet ID first.
   */
  filter?: ((item: Item, query: string) => boolean | number) | undefined;
  /** For object values: the string a value is known and posted by. Strings are themselves, objects their `value` or `id`. */
  itemToValue?: ((value: T) => string) | undefined;
  /** For object values: the text a value shows in the field. */
  itemToLabel?: ((value: T) => string) | undefined;
  /** For object values: whether an item's value is the chosen one, when they aren't the same object. */
  isItemEqualToValue?: ((itemValue: T, value: T) => boolean) | undefined;
  /** The name the chosen value posts under in a form. "None" posts "", and nothing chosen posts nothing. */
  name?: string | undefined;
  /** The id of a form to post with, when the field isn't inside it. */
  form?: string | undefined;
  /** Blocks the form's submit until something is chosen, with the browser's own message. */
  required?: boolean | undefined;
  disabled?: boolean | undefined;
  /**
   * How the list opens. "auto" (default) opens a bottom sheet on a small touch screen, with the search field in the
   * sheet's header and the keyboard closed until it is tapped, and a popover elsewhere, decided each time it opens;
   * "sheet" or "popover" always (UX Engineer, AVE-39).
   */
  presentation?: Presentation | undefined;
}

/** ui-sdk's open state and search text, which the parts form hands on as they are. */
interface ComboboxPartsOnlyProps<T> {
  /** Whether the list is open. Pass it with `onOpenChange` to control it. */
  open?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  /** Gets the new state and ui-sdk's details; `details.cancel()` keeps it as it was. */
  onOpenChange?: ((open: boolean, details: ComboboxOpenChangeDetails) => void) | undefined;
  /** Runs once the list has finished opening or closing, after its animation. */
  onOpenChangeComplete?: ((open: boolean) => void) | undefined;
  /** Gets the search text as it changes, and ui-sdk's details. */
  onQueryChange?: ((query: string, details: ComboboxQueryChangeDetails) => void) | undefined;
  /** Opens, closes, reads and sets the combobox from anywhere: `createComboboxController()` from `@ui-sdk/react/combobox`. */
  controller?: ComboboxController<T, boolean> | undefined;
  children: ReactNode;
  items?: undefined;
}

/** Built from parts: `Combobox` holds the value, and its children are `ComboboxInput` and `ComboboxContent`. */
type ComboboxPartsProps<T, Item extends ComboboxItemData<T>> = ComboboxSharedProps<T, Item> &
  ComboboxPartsOnlyProps<T> & {
    multiple?: false | undefined;
    keepQuery?: undefined;
    maxSelected?: undefined;
  };

/**
 * Built from parts, picking several values (ui-sdk's `multiple`): the value is a list. Choosing an item toggles it and
 * keeps the list open, and each item shows a checkbox's box.
 */
type ComboboxMultiplePartsProps<T, Item extends ComboboxItemData<T>> = ComboboxMultipleValueProps<T, Item> &
  ComboboxPartsOnlyProps<T>;

/** The value, callback and limits of a multi-pick, for both forms. */
type ComboboxMultipleValueProps<T, Item extends ComboboxItemData<T>> = Omit<
  ComboboxSharedProps<T, Item>,
  "value" | "defaultValue" | "onValueChange"
> & {
    multiple: true;
    /** The chosen values, in the order they were chosen. Pass it with `onValueChange` to control the field. */
    value?: readonly T[] | undefined;
    /** The values chosen at first, when `value` is left out. A form reset returns to them. */
    defaultValue?: readonly T[] | undefined;
    /** Gets the new list and ui-sdk's details. `details.cancel()` keeps the old list. */
    onValueChange?: ((value: T[], details: ComboboxValueChangeDetails) => void) | undefined;
    /**
     * Whether the search keeps its text after a pick, so several matches of "oak" go in a row. True by default in
     * Avenue (ui-sdk's default is false, which empties it): a multi-pick is usually several of the same search.
     */
    keepQuery?: boolean | undefined;
    /** How many values can be chosen. Once reached, the other items are disabled. */
    maxSelected?: number | undefined;
  };

/** The one-tag Combobox: Avenue draws the field and the list from `items`. */
type ComboboxWrapperProps<T, Item extends ComboboxItemData<T>> = ComboboxSharedProps<T, Item> &
  Pick<InputProps, "size" | "icon" | "id" | "aria-label" | "aria-describedby" | "triggerLabel" | "clearLabel" | "invalid" | "placeholder" | "className"> & {
    children?: undefined;
    /**
     * The choices, in ui-sdk's shape: `{ value, label, keywords?, disabled? }` (plus Avenue's `hint` and `meta`), a
     * plain string, a group `{ type: "group", label, items }` or a separator `{ type: "separator" }`. A value may be
     * an object, with `itemToValue` and `itemToLabel`.
     */
    items?: ListData<NoInfer<T>, Item> | undefined;
    /** Adds a first option that clears the choice (Documents' "Neighborhood"). Without it, null shows `placeholder`. */
    noneLabel?: string | undefined;
    /** What the list says when nothing matches. Gets the trimmed query. */
    emptyMessage?: ((query: string) => ReactNode) | undefined;
    multiple?: undefined;
    keepQuery?: undefined;
    maxSelected?: undefined;
  };

/**
 * The one-tag Combobox picking several values: Avenue draws the chosen values as chips in the field, with the search
 * after them, and the list from `items` (ui-sdk's "Multiple", wrapped as its "Wrap the Parts" guide wraps a part set).
 */
type ComboboxWrapperMultipleProps<T, Item extends ComboboxItemData<T>> = ComboboxMultipleValueProps<T, Item> &
  Pick<InputProps, "id" | "aria-label" | "aria-describedby" | "invalid" | "placeholder"> &
  Pick<ChipsProps, "size" | "triggerLabel" | "className"> &
  Pick<ComboboxWrapperProps<T, Item>, "items" | "emptyMessage"> & {
    children?: undefined;
    /** No "none" option: an empty list is none. */
    noneLabel?: undefined;
    /** The chips' field has no leading icon: the chips start where the icon would sit. */
    icon?: undefined;
    /** No Clear button: each chip has its own remove button. */
    clearLabel?: undefined;
    /** The open state and search stay inside the one-tag form, as in the one-value form. */
    open?: undefined;
    controller?: undefined;
  };

/** Picking several values (ui-sdk's `multiple`), from parts or in one tag. */
type ComboboxMultipleProps<T, Item extends ComboboxItemData<T>> =
  | ComboboxMultiplePartsProps<T, Item>
  | ComboboxWrapperMultipleProps<T, Item>;

export type ComboboxProps<T = string, Item extends ComboboxItemData<T> = ComboboxItemData<T>> =
  | ComboboxPartsProps<T, Item>
  | ComboboxMultipleProps<T, Item>
  | ComboboxWrapperProps<T, Item>;

/**
 * A field that searches as you type, for long lists (households, time zones). Arrow keys and Enter choose; Escape,
 * or leaving the field, closes the list and puts the current choice back in the field. Built on ui-sdk's Combobox.
 *
 * Two forms, as ui-sdk's Combobox has (AVE-146). With `items` and no children it is one tag: Avenue draws the field
 * and the list, with groups, separators, a "none" option and the empty message. With children it is the root of
 * ui-sdk's composition, and the children are the parts:
 *
 * ```tsx
 * <Combobox value={owner} onValueChange={setOwner} itemToValue={(o) => o.id} itemToLabel={(o) => o.name}>
 *   <ComboboxInput icon={<UserIcon />} triggerLabel="Show owners" />
 *   <ComboboxContent>
 *     <ComboboxEmpty>No owner matches.</ComboboxEmpty>
 *     <ComboboxList>
 *       {owners.map((o) => <ComboboxItem key={o.id} value={o} label={o.name}>…</ComboboxItem>)}
 *     </ComboboxList>
 *   </ComboboxContent>
 * </Combobox>
 * ```
 *
 * With `multiple` the value is a list (ui-sdk's "Multiple"), and `onValueChange` gets the new list and ui-sdk's details.
 * In one tag, Avenue draws the chosen values as chips in the field, each with its own "Remove …" button, and the
 * search after them; Backspace in the empty search removes the last chip. On a small touch screen the list opens as a
 * sheet, and a pick keeps it open:
 *
 * ```tsx
 * <Field>
 *   <FieldLabel>Streets</FieldLabel>
 *   <Combobox multiple items={streets} value={chosen} onValueChange={setChosen} placeholder="Add a street…" />
 * </Field>
 * ```
 *
 * From parts, its search can sit in the field with `ComboboxChips`, or inside the popup, opened by a `ComboboxTrigger`
 * that shows the choice, as a table filter's long list does:
 *
 * ```tsx
 * <Combobox multiple value={streets} onValueChange={setStreets}>
 *   <ComboboxTrigger render={<Button variant="outline" />}>
 *     <ComboboxValue>{({ label }) => label || "Any street"}</ComboboxValue>
 *   </ComboboxTrigger>
 *   <ComboboxContent className="w-64">
 *     <ComboboxInput aria-label="Search streets" placeholder="Search…" />
 *     <ComboboxList>…</ComboboxList>
 *   </ComboboxContent>
 * </Combobox>
 * ```
 */
// The multiple form is its own signature, first, so a value list infers its item type (string, not string[]): in one
// union the single form's `value?: T` would claim the list as T.
export function Combobox<Item extends ComboboxItemData<any> = ComboboxItemData, T = Item["value"]>(
  props: ComboboxMultipleProps<T, Item>,
): ReactNode;
export function Combobox<Item extends ComboboxItemData<any> = ComboboxItemData, T = Item["value"]>(
  props: ComboboxProps<T, Item>,
): ReactNode;
export function Combobox<Item extends ComboboxItemData<any> = ComboboxItemData, T = Item["value"]>(
  props: ComboboxProps<T, Item>,
) {
  if (props.multiple && props.children === undefined) {
    return <ComboboxFromItemsMultiple<T, Item> {...(props as ComboboxWrapperMultipleProps<T, Item>)} />;
  }
  if (props.multiple) {
    const { children, filter, keepQuery = true, ...rest } = props;
    return (
      <ComboboxRoot<T>
        keepQuery={keepQuery}
        {...(filter ? { filter: (item: ListItem<T>, query: string) => filter(item as Item, query) } : {})}
        {...rest}
      >
        {children}
      </ComboboxRoot>
    );
  }
  if (props.children !== undefined) {
    const { children, value, defaultValue, onValueChange, filter, ...rest } = props;
    return (
      <ComboboxRoot<T>
        {...(value !== undefined ? { value: chosen(value) } : {})}
        {...(defaultValue !== undefined ? { defaultValue: chosen(defaultValue) } : {})}
        {...(onValueChange ? { onValueChange } : {})}
        {...(filter ? { filter: (item: ListItem<T>, query: string) => filter(item as Item, query) } : {})}
        {...rest}
      >
        {children}
      </ComboboxRoot>
    );
  }
  return <ComboboxFromItems<T, Item> {...(props as ComboboxWrapperProps<T, Item>)} />;
}

/** The list's rows from `items`, for both one-tag forms: groups and their labels, separators, and each item. */
function rowsFrom<T, Item extends ComboboxItemData<T>>(items: ListData<T, Item>, keyOf: (value: T) => string): ReactNode[] {
  const item = (entry: Item | (T & string)) => {
    const option = toItem<T, Item>(entry);
    return (
      <ComboboxItem<T>
        key={keyOf(option.value)}
        value={option.value}
        label={option.label}
        meta={option.meta}
        {...defined({ keywords: option.keywords, disabled: option.disabled || undefined })}
      >
        <span>{option.label}</span>
        {option.hint && <span className="text-muted-foreground"> · {option.hint}</span>}
      </ComboboxItem>
    );
  };
  const keys = entryKeys(items, keyOf);
  return items.map((entry, i) =>
    isSeparator(entry) ? (
      <ComboboxSeparator key={keys[i]} />
    ) : isGroup(entry) ? (
      <ComboboxGroup key={keys[i]}>
        {entry.label !== undefined && <ComboboxGroupLabel>{entry.label}</ComboboxGroupLabel>}
        {entry.items.map(item)}
      </ComboboxGroup>
    ) : (
      item(entry)
    ),
  );
}

const defaultEmptyMessage = (query: string): ReactNode =>
  query ? `Nothing matches “${query}”.` : "Nothing to choose from yet.";

/** The one-tag Combobox, drawn from its items with Avenue's parts. */
function ComboboxFromItems<T, Item extends ComboboxItemData<T>>({
  items: itemsProp,
  value,
  defaultValue,
  onValueChange,
  name,
  form,
  required,
  noneLabel,
  placeholder,
  emptyMessage = defaultEmptyMessage,
  filter = matchWords,
  itemToValue,
  itemToLabel,
  isItemEqualToValue,
  disabled,
  presentation = "auto",
  ...input
}: ComboboxWrapperProps<T, Item>) {
  const items: ListData<T, Item> = itemsProp ?? NO_ITEMS;
  const keyOf = useMemo(() => valueKey(itemToValue), [itemToValue]);
  const byKey = useMemo(() => new Map(flatItems(items).map((o) => [keyOf(o.value), o])), [items, keyOf]);
  // Uncontrolled, the field still tracks its value, for the form reset below.
  const [own, setOwn] = useState(() => chosen(defaultValue));
  const current = value !== undefined ? chosen(value) : own;
  // ui-sdk is always handed the value, with Avenue's "none" option in place of null where there is one.
  const toRoot = (v: T | null): T | None | null =>
    v !== null ? (byKey.has(keyOf(v)) ? v : null) : noneLabel ? NONE : null;
  const selected = toRoot(current);
  // The app hears it first, as ui-sdk's callbacks do; a canceled change leaves the field's own value alone. ui-sdk is
  // always handed the value, so it can't drop a canceled change itself.
  const change = (next: T | null, details: ComboboxValueChangeDetails) => {
    onValueChange?.(next, details);
    if (!details.canceled) setOwn(next);
  };
  const [query, setQuery] = useState("");
  // Finds the form the field posts with, for its reset.
  const probe = useRef<HTMLSpanElement>(null);
  // ui-sdk is always handed the value (it refuses `value` and `defaultValue` together), so a form reset is answered
  // here: the field goes back to `defaultValue`, and a controlled field hears it through onValueChange.
  const reset = useEffectEvent(() => {
    // A controlled field with no default of its own keeps its value: the app decides what a reset means there.
    if (value !== undefined && defaultValue === undefined) return;
    const target = chosen(defaultValue);
    const same = target === null || current === null ? target === current : keyOf(target) === keyOf(current);
    if (!same && report(onValueChange, target, { reason: "reset" })) setOwn(target);
  });
  useEffect(() => {
    const element = probe.current;
    const owner = form ? element?.ownerDocument.getElementById(form) : element?.closest("form");
    if (!(owner instanceof HTMLFormElement)) return;
    const onReset = () => reset();
    owner.addEventListener("reset", onReset);
    return () => owner.removeEventListener("reset", onReset);
  }, [form]);

  // The "none" option's private value passes through the app's own object-value functions untouched.
  const objectProps = defined({
    itemToValue: itemToValue && ((v: T | None) => (v === NONE ? NONE : itemToValue(v as T))),
    itemToLabel: itemToLabel && ((v: T | None) => (v === NONE ? (noneLabel ?? "") : itemToLabel(v as T))),
    isItemEqualToValue:
      isItemEqualToValue &&
      ((a: T | None, b: T | None) => (a === NONE || b === NONE ? a === b : isItemEqualToValue(a as T, b as T))),
  });

  const rows = rowsFrom(items, keyOf);

  return (
    <ComboboxRoot<T | None>
      value={selected}
      onValueChange={(next: T | None | null, details: ComboboxValueChangeDetails) => {
        if (next !== null) change(next === NONE ? null : (next as T), details);
        // The phone's Clear clears the choice as well as the search (AVE-93); Escape while the list is open asks for
        // it back. Clearing the text by typing is still typing, not a choice, so that request is refused.
        else if (details.reason === "clear-press") change(null, details);
        else details.cancel();
      }}
      onQueryChange={(next: string, details: { reason: string; cancel: () => void }) => {
        // ui-sdk empties the text on a form reset, as it would return to its own empty default; the reset listener
        // above has put the field's default value back, and with it its label, so the text stays.
        if (details.reason === "reset") details.cancel();
        else setQuery(next);
      }}
      filter={(entry: ListItem<T | None>, text: string) => {
        if (entry.value === NONE) return text.trim() === "";
        const option = byKey.get(keyOf(entry.value as T));
        return option ? filter(option, text) : false;
      }}
      presentation={presentation}
      // While the none option is chosen, ui-sdk would post its private value, so it gets no name and the hidden input
      // below posts "" in its place.
      {...defined({ disabled, name: selected === NONE ? undefined : name, form, required })}
      {...objectProps}
    >
      <span ref={probe} hidden />
      {name && selected === NONE && (
        <input type="hidden" name={name} value="" disabled={disabled} {...defined({ form })} />
      )}
      <ComboboxInput placeholder={placeholder} {...input} />
      <ComboboxContent>
        <ComboboxEmpty>{emptyMessage(query.trim())}</ComboboxEmpty>
        <ComboboxList>
          {noneLabel && (
            <ComboboxItem<T | None> value={NONE} label={noneLabel}>
              <span className="text-muted-foreground">{noneLabel}</span>
            </ComboboxItem>
          )}
          {rows}
        </ComboboxList>
      </ComboboxContent>
    </ComboboxRoot>
  );
}

/**
 * The one-tag Combobox picking several values, drawn from its items with the chips parts: each chosen value is a
 * `ComboboxChip` with its own "Remove …" button, then the search, then the chevron. ui-sdk keeps the value, the form's
 * entries (one per value) and its reset, so nothing here stands in for them as the one-value form must for "none".
 *
 * Labels come from `items` unless `itemToLabel` says otherwise, so the chips are named before the list has ever
 * opened. On a small touch screen the list is ui-sdk's sheet: the search moves into its header, the chips stay in the
 * field behind it, and a pick keeps the sheet open, as a pick keeps the popover open.
 */
function ComboboxFromItemsMultiple<T, Item extends ComboboxItemData<T>>({
  items: itemsProp,
  emptyMessage = defaultEmptyMessage,
  filter = matchWords,
  itemToValue,
  itemToLabel,
  keepQuery = true,
  presentation = "auto",
  size,
  triggerLabel,
  className,
  placeholder,
  id,
  invalid,
  "aria-label": ariaLabel,
  "aria-describedby": describedBy,
  noneLabel: _none,
  icon: _icon,
  clearLabel: _clear,
  open: _open,
  controller: _controller,
  children: _children,
  multiple: _multiple,
  ...props
}: ComboboxWrapperMultipleProps<T, Item>) {
  const items: ListData<T, Item> = itemsProp ?? NO_ITEMS;
  const keyOf = useMemo(() => valueKey(itemToValue), [itemToValue]);
  const byKey = useMemo(() => new Map(flatItems(items).map((o) => [keyOf(o.value), o])), [items, keyOf]);
  const labelFor = useMemo(
    () => itemToLabel ?? ((v: T) => byKey.get(keyOf(v))?.label ?? String(v)),
    [itemToLabel, byKey, keyOf],
  );
  const [query, setQuery] = useState("");
  const rows = rowsFrom(items, keyOf);
  return (
    <ComboboxRoot<T>
      multiple
      keepQuery={keepQuery}
      presentation={presentation}
      itemToLabel={labelFor}
      onQueryChange={(next: string) => setQuery(next)}
      filter={(entry: ListItem<T>, text: string) => {
        const option = byKey.get(keyOf(entry.value));
        return option ? filter(option, text) : false;
      }}
      {...defined({ itemToValue })}
      {...props}
    >
      <ComboboxChips {...defined({ size, triggerLabel, className })}>
        <ComboboxValue>
          {({ value }) => (value as T[]).map((v) => <ComboboxChip<T> key={keyOf(v)} value={v} />)}
        </ComboboxValue>
        <ComboboxInput
          {...defined({ id, invalid, placeholder, "aria-label": ariaLabel, "aria-describedby": describedBy })}
        />
      </ComboboxChips>
      <ComboboxContent>
        <ComboboxEmpty>{emptyMessage(query.trim())}</ComboboxEmpty>
        <ComboboxList>{rows}</ComboboxList>
      </ComboboxContent>
    </ComboboxRoot>
  );
}

export {
  ComboboxChip,
  ComboboxChipRemove,
  ComboboxChips,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxSeparator,
  ComboboxTrigger,
  ComboboxValue,
};
