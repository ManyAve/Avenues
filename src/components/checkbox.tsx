import { Checkbox as CheckboxPrimitive, CheckboxIndicator } from "@ui-sdk/react/checkbox";
import { CheckIcon, MinusIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { useChoiceCardTitleId } from "#avenue/lib/choice-card-context";
import { cn } from "#avenue/lib/utils";
import { defined, type Loose } from "#avenue/lib/props";

/**
 * Ported from the app's app/ui/components/ui/checkbox.tsx (e01cc90). 16px box with the xs corner (4px, the app's
 * literal 4px). `checked="indeterminate"` (or `defaultChecked`) shows a dash: select-all with some rows chosen; a
 * press checks it. Its invisible hit area is the shared `hit-area`: 12px left and right and 8px up and down with a
  * mouse, at least 44px on phones. Inside a Field it is labelled by FieldLabel; in a ChoiceCard, by the card's title.
 * Unchecked, its outline is `control-outline`, not `input`, so it reaches 3:1 against the page and a card (WCAG
 * 1.4.11; a named departure from the app, AVE-38; its own token since AVE-183).
 *
 * `onCheckedChange` is typed `boolean | "indeterminate"`, because `checked` can be. A press always gives `true` or
 * `false` (a press on an indeterminate box checks it), so for a plain boolean write
 * `onCheckedChange={(checked) => setDone(checked === true)}` (AVE-108).
 */
function Checkbox({ className, ...props }: Loose<ComponentProps<typeof CheckboxPrimitive>>) {
  // In a ChoiceCard, named by the card's title alone.
  const titleId = useChoiceCardTitleId();
  return (
    <CheckboxPrimitive
      data-slot="checkbox"
      aria-labelledby={titleId}
      className={cn(
        "peer group/checkbox relative flex size-4 shrink-0 items-center justify-center rounded-xs border border-control-outline transition-colors outline-none group-has-disabled/field:opacity-50 group-has-[:focus-visible]/field-label:ring-0 group-has-[:focus-visible]/field-label:not-data-checked:border-control-outline hit-area [--hit-area-x:--spacing(3)] [--hit-area-y:--spacing(2)] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-disabled:cursor-not-allowed data-disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground group-has-[:focus-visible]/field-label:data-checked:border-primary dark:data-checked:bg-primary data-indeterminate:border-primary data-indeterminate:bg-primary data-indeterminate:text-primary-foreground dark:data-indeterminate:bg-primary",
        className,
      )}
      {...defined(props)}
    >
      <CheckboxIndicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-3.5"
      >
        <CheckIcon aria-hidden className="group-data-indeterminate/checkbox:hidden" />
        <MinusIcon aria-hidden className="hidden group-data-indeterminate/checkbox:block" />
      </CheckboxIndicator>
    </CheckboxPrimitive>
  );
}

export { Checkbox };
