import { Radio, RadioGroup as RadioGroupPrimitive, RadioIndicator } from "@ui-sdk/react/radio";
import type { ComponentProps } from "react";
import { useChoiceCardTitleId } from "#avenue/lib/choice-card-context";
import { cn } from "#avenue/lib/utils";

/**
 * shadcn's radio group (base-nova), built on ui-sdk's Radio. The app has no radio group of its own yet, so the look
 * follows Avenue's Checkbox: a 16px circle with a `muted-foreground` outline (3:1 or better on the page and a card,
 * AVE-38), filled with `primary` and a `primary-foreground`
 * dot when chosen, and the same invisible hit area (12px left and right, 8px up and down). One Tab stop for the
 * group; the arrow keys move and choose together (AVE-33).
 *
 * Name the group with a FieldLegend in a FieldSet (`aria-labelledby`), or `aria-label`. Each item is named by the
 * FieldLabel of its own Field, or by a ChoiceCard's title.
 */
function RadioGroup({ className, ...props }: ComponentProps<typeof RadioGroupPrimitive>) {
  return <RadioGroupPrimitive className={cn("grid w-full gap-3", className)} {...props} />;
}

function RadioGroupItem({ className, ...props }: ComponentProps<typeof Radio>) {
  // In a ChoiceCard, named by the card's title alone.
  const titleId = useChoiceCardTitleId();
  return (
    <Radio
      aria-labelledby={titleId}
      className={cn(
        "peer group/radio relative flex aspect-square size-4 shrink-0 items-center justify-center rounded-full border border-muted-foreground transition-colors outline-none group-has-disabled/field:opacity-50 group-has-[:focus-visible]/field-label:ring-0 group-has-[:focus-visible]/field-label:not-data-checked:border-muted-foreground hit-area [--hit-area-x:--spacing(3)] [--hit-area-y:--spacing(2)] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-disabled:cursor-not-allowed data-disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground group-has-[:focus-visible]/field-label:data-checked:border-primary dark:data-checked:bg-primary",
        className,
      )}
      {...props}
    >
      <RadioIndicator className="flex size-4 items-center justify-center">
        <span aria-hidden className="size-2 rounded-full bg-primary-foreground" />
      </RadioIndicator>
    </Radio>
  );
}

export { RadioGroup, RadioGroupItem };
