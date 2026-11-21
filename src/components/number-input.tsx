import { announce } from "@ui-sdk/core";
import * as Ui from "@ui-sdk/react/number-input";
import type { NumberInputValueChangeReason } from "@ui-sdk/react/number-input";
import { MinusIcon, PlusIcon } from "lucide-react";
import { createContext, useContext, useId, useMemo, useSyncExternalStore, type ComponentProps, type ReactNode } from "react";
import { buttonVariants } from "#avenue/components/button";
import type { ChangeDetails } from "#avenue/lib/change";
import { controlSize, controlSurface } from "#avenue/lib/control";
import type { PickerSize } from "#avenue/lib/picker";
import { defined, type Loose, type NodeChildren, type OwnPartProps } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";
import { mergeProps, renderElement } from "@ui-sdk/react/primitive";

/** What `onValueChange` gets after the value: ui-sdk NumberInput's own details (reason, event, source, `cancel()`). */
export type NumberInputValueChangeDetails = ChangeDetails<NumberInputValueChangeReason>;

type UiProps = Loose<ComponentProps<typeof Ui.NumberInput>>;
type CommitDetails = Parameters<NonNullable<ComponentProps<typeof Ui.NumberInput>["onValueCommit"]>>[1];

/** What is counted, for the buttons' names and the bound line: "guest" and "guests", or one word for both. */
export type NumberInputNoun = string | { one: string; other: string };

type Counted = {
  noun: NumberInputNoun | undefined;
  min: number | undefined;
  max: number | undefined;
  value: number | null;
  locale: string | undefined;
  format: Intl.NumberFormatOptions | undefined;
  size: PickerSize;
  invalid: boolean | undefined;
  boundId: string;
};

const CountedContext = createContext<Counted | null>(null);

function useCounted(part: string) {
  const counted = useContext(CountedContext);
  if (!counted) throw new Error(`${part} must be inside a NumberInput.`);
  return counted;
}

const noop = () => () => {};

/**
 * The locale the words use: `locale`, or the page's `lang` once the page is interactive. Server markup and the first
 * client render use en-US, as ui-sdk's own formatting does, so hydration never disagrees.
 */
function useLocale(locale: string | undefined) {
  const page = useSyncExternalStore(
    noop,
    () => document.documentElement.lang || navigator.language,
    () => "en-US",
  );
  return locale ?? page;
}

/** The highest value a step can reach: `max`, or the last step below it when steps from `min` (or 0) miss it. */
function reachableMax(min: number | undefined, max: number | undefined, step: number | undefined) {
  if (max === undefined) return undefined;
  const from = min ?? 0;
  const size = step ?? 1;
  if (!(size > 0) || max < from) return max;
  const steps = Math.floor((max - from) / size + 1e-9);
  return Math.min(max, Number((from + steps * size).toPrecision(12)));
}

/** A className that may be a function of the part's state, with Avenue's classes first. */
function withClasses<S>(look: string, className: string | ((state: S) => string | undefined) | undefined) {
  return typeof className === "function" ? (state: S) => cn(look, className(state)) : cn(look, className);
}

/** "3 guests": the value in the field's own format, with what it counts. */
function countText({ noun, locale, format }: Pick<Counted, "noun" | "locale" | "format">, value: number) {
  const where = locale;
  const number = new Intl.NumberFormat(where, format).format(value);
  if (noun === undefined) return number;
  if (typeof noun === "string") return `${number} ${noun}`;
  const plural = new Intl.PluralRules(where).select(value) === "one" ? noun.one : noun.other;
  return `${number} ${plural}`;
}

function nounOther(noun: NumberInputNoun | undefined) {
  return noun === undefined ? undefined : typeof noun === "string" ? noun : noun.other;
}

/** Which bound the value sits at, if any; `max` here is the reachable one. A field whose bounds meet is at its max. */
function boundOf({ value, min, max }: Pick<Counted, "value" | "min" | "max">) {
  if (value === null) return undefined;
  if (max !== undefined && value >= max) return "max" as const;
  if (min !== undefined && value <= min) return "min" as const;
  return undefined;
}

export type NumberInputProps = NodeChildren<UiProps> & {
  /**
   * What the field counts, as `{ one: "guest", other: "guests" }` (or one word for both). It names the buttons
   * ("Increase guests", "Decrease guests"), so give two steppers on one screen different nouns, and words the bound line
   * ("At most 10 guests") and what a screen reader hears when a button is let go ("4 guests").
   */
  noun?: NumberInputNoun | undefined;
  /** md (32px, the default) or sm (28px, for a card or dialog header). Phones draw 44px at both. */
  size?: PickerSize | undefined;
  invalid?: boolean | undefined;
};

/**
 * A small count, typed or stepped (AVE-204), on ui-sdk's NumberInput: guests at an event, copies of a letter, units in
 * a request. Typing always works; the minus and plus buttons are an extra, out of the tab order (the field's arrow keys
 * do the same), and a held button repeats after a pause, at the same pace with reduced motion. At the minimum or the
 * maximum that button is disabled, and a muted line says why ("At most 10 guests"). What a screen reader hears after a
 * press is the new count, once, when the button is let go. Arrow keys, Page Up and Down, Home and End step it; it posts
 * the plain number under `name` (or its Field's).
 *
 * Not for money, years, IDs or phone numbers (UX Engineer, AVE-204): those are text fields (an Input with `inputMode`),
 * and money follows Avenue's Money rules. A held button can't count dollars and cents, and a stepper on an amount
 * invites off-by-one charges.
 *
 * With no children it draws the decrement button, the field, the increment button and the bound line. Its children
 * can be those parts instead: `NumberInputGroup` holding `NumberInputDecrement`, `NumberInputControl` and
 * `NumberInputIncrement`, then `NumberInputBound`.
 */
export function NumberInput({
  noun,
  size = "md",
  invalid,
  className,
  children,
  onValueCommit,
  ...props
}: NumberInputProps) {
  const boundId = useId();
  const { min, step, format } = props;
  const max = reachableMax(min, props.max, step);
  const locale = useLocale(props.locale);
  const commit = (value: number | null, details: CommitDetails) => {
    onValueCommit?.(value, details);
    if (value !== null && (details.reason === "increment-press" || details.reason === "decrement-press")) {
      announce(countText({ noun, locale, format }, value));
    }
  };
  return (
    <Ui.NumberInput
      data-size={size}
      className={withClasses("flex flex-col items-start gap-1", className)}
      onValueCommit={commit}
      {...defined(props)}
    >
      {(state) => (
        <CountedContext.Provider value={{ noun, min, max, value: state.value, locale, format, size, invalid, boundId }}>
          {children ?? (
            <>
              <NumberInputGroup>
                <NumberInputDecrement />
                <NumberInputControl />
                <NumberInputIncrement />
              </NumberInputGroup>
              <NumberInputBound />
            </>
          )}
        </CountedContext.Provider>
      )}
    </Ui.NumberInput>
  );
}

/** The row: the two buttons and the field, `gap-controls` apart (16px on phones, so their 44px areas never meet). */
export function NumberInputGroup({ className, ...props }: Loose<ComponentProps<typeof Ui.NumberInputGroup>>) {
  return (
    <Ui.NumberInputGroup
      className={withClasses("flex items-center gap-controls", className)}
      {...defined(props)}
    />
  );
}

/**
 * The field: Input's look, the number centred in tabular figures. 44px tall on a phone, like every text field, since
 * an input can't carry the invisible hit area (AVE-22). Inside a Field it is the field's control.
 */
export function NumberInputControl({ className, ...props }: Loose<ComponentProps<typeof Ui.NumberInputControl>>) {
  const { size, invalid } = useCounted("NumberInputControl");
  return (
    <Ui.NumberInputControl
      data-size={size}
      aria-invalid={invalid || undefined}
      className={withClasses(
        cn(controlSurface, controlSize({ size }), "w-16 py-1 text-center tabular-nums pointer-coarse:min-h-11"),
        className,
      )}
      {...defined(props)}
    />
  );
}

type StepProps = Loose<ComponentProps<typeof Ui.NumberInputIncrement>>;

function stepButtonClass(size: PickerSize, className: StepProps["className"]) {
  // A phone draws the button at 44px, the field's own height there, so the row lines up (AVE-22: grow on coarse only).
  const look = cn(
    buttonVariants({ variant: "outline", size: size === "sm" ? "icon-sm" : "icon-md" }),
    "motion-reduce:transition-none pointer-coarse:size-11",
  );
  return withClasses(look, className);
}

function useStepButton(direction: "increase" | "decrease", props: StepProps) {
  const counted = useCounted(direction === "increase" ? "NumberInputIncrement" : "NumberInputDecrement");
  const bound = boundOf(counted);
  const atBound = direction === "increase" ? bound === "max" : bound === "min";
  const noun = nounOther(counted.noun);
  const name = direction === "increase" ? "Increase" : "Decrease";
  return {
    "aria-label": noun ? `${name} ${noun}` : name,
    ...(atBound ? { "aria-describedby": counted.boundId } : {}),
    ...defined(props),
    className: stepButtonClass(counted.size, props.className),
  };
}

/** Steps down once, then repeats while held. Named "Decrease <noun>"; disabled at the minimum. */
export function NumberInputDecrement({ children, ...props }: StepProps) {
  const own = useStepButton("decrease", props);
  return <Ui.NumberInputDecrement {...own}>{children ?? <MinusIcon aria-hidden="true" />}</Ui.NumberInputDecrement>;
}

/** Steps up once, then repeats while held. Named "Increase <noun>"; disabled at the maximum. */
export function NumberInputIncrement({ children, ...props }: StepProps) {
  const own = useStepButton("increase", props);
  return <Ui.NumberInputIncrement {...own}>{children ?? <PlusIcon aria-hidden="true" />}</Ui.NumberInputIncrement>;
}

/**
 * Why a button is off: "At most 10 guests" at the maximum, "At least 1 guest" at the minimum, one muted line under the
 * row, and the disabled button's description. Nothing between the bounds. Children replace the words, as a function
 * of which bound it is.
 */
export function NumberInputBound({
  className,
  children,
  render,
  ...props
}: Omit<OwnPartProps<"p">, "children" | "id"> & {
  children?: ((bound: "min" | "max") => ReactNode) | undefined;
}) {
  const counted = useCounted("NumberInputBound");
  const bound = boundOf(counted);
  const words = useMemo(() => {
    if (!bound) return null;
    if (children) return children(bound);
    const limit = bound === "max" ? counted.max! : counted.min!;
    return `${bound === "max" ? "At most" : "At least"} ${countText(counted, limit)}`;
  }, [bound, children, counted]);
  if (!words) return null;
  return renderElement(
    "p",
    mergeProps(
      {
        "data-slot": "number-input-bound",
        "data-bound": bound,
        className: cn("text-meta text-muted-foreground", className),
        children: words,
      },
      // The disabled button is described by this id, so the part keeps its own.
      { ...defined(props), id: counted.boundId },
    ),
    render,
  );
}
