import { mergeProps, renderElement } from "@ui-sdk/react/primitive";
import { useId, type ComponentProps, type ReactNode } from "react";
import { Field, FieldContent, FieldDescription, FieldLabel } from "#avenue/components/field";
import { ChoiceCardContext, useChoiceCardTitleId } from "#avenue/lib/choice-card-context";
import { cn } from "#avenue/lib/utils";
import { defined, type OwnPartProps } from "#avenue/lib/props";

/**
 * A choice card (AVE-33, made API in AVE-37): a whole card that is the label of one Radio or Checkbox, with
 * a title and one line. A tap anywhere on the card chooses. It is a control, so its corner is `lg` (10px, never the
 * card's 14), with 16px padding; put cards in a RadioGroup (one Tab stop, the arrows move and choose) or a
 * FieldGroup (each its own Tab stop). Chosen: the shared `chosen` border and fill (AVE-50), with the radio or
 * checkbox still drawn, so the state never rests on colour alone. The app has no choice cards, so this departs from
 * no screen. A press shrinks the card a touch (`press`, AVE-212), as a Button does.
 *
 * ```tsx
 * <ChoiceCard disabled={!canRent}>
 *   <Radio value="rent" />
 *   <ChoiceCardContent>
 *     <ChoiceCardTitle><KeyRoundIcon aria-hidden />I rent</ChoiceCardTitle>
 *     <ChoiceCardDescription>You see the wall, events and listings.</ChoiceCardDescription>
 *   </ChoiceCardContent>
 * </ChoiceCard>
 * ```
 *
 * Why it is a part and not classes: the card is the control's label, so the control's name would be all of the
 * card's text, and the line would be read twice (once in the name, again as the description Field adds). ChoiceCard
 * names the control by its title alone (`aria-labelledby`), so a screen writes no ids and can't forget it.
 */
function ChoiceCard({
  className,
  disabled,
  children,
  ...props
}: Omit<ComponentProps<typeof FieldLabel>, "children"> & { disabled?: boolean | undefined; children?: ReactNode }) {
  const titleId = `${useId()}-title`;
  return (
    <ChoiceCardContext.Provider value={titleId}>
      <FieldLabel
        className={cn(
          "press has-data-checked:chosen has-[>[data-slot=field]]:rounded-lg has-[>[data-slot=field]]:border has-[>[data-slot=field]]:not-has-[:disabled,[data-disabled]]:not-has-data-checked:hover:bg-muted/50 has-[>[data-slot=field]]:has-[:focus-visible]:border-ring has-[>[data-slot=field]]:has-[:focus-visible]:ring-3 has-[>[data-slot=field]]:has-[:focus-visible]:ring-ring/50 *:data-[slot=field]:p-4",
          "has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col",
          // `chosen` (AVE-50) also sets the text colour, but a chosen card's text stays as it was (an invalid field keeps
          // its own): the radio or checkbox carries the state.
          "has-data-checked:*:data-[slot=field]:not-data-invalid:text-foreground",
          // The 16px control is centred on the title's first line (AVE-2 §4, AVE-74): half the title's line height less
          // half the control, so 4px on the web scale's 24px line and 2px on the desktop scale's 20px. Field's own 1px
          // nudge fits neither. It stays on the first line when the title wraps.
          "[&>[data-slot=field]>[role=checkbox]]:mt-[calc((var(--text-compact--line-height)-1rem)/2)]! [&>[data-slot=field]>[role=radio]]:mt-[calc((var(--text-compact--line-height)-1rem)/2)]!",
          className,
        )}
        {...props}
      >
        <Field orientation="horizontal" disabled={!!disabled}>
          {children}
        </Field>
      </FieldLabel>
    </ChoiceCardContext.Provider>
  );
}

/** Holds the title and the line, beside the control. */
function ChoiceCardContent(props: ComponentProps<typeof FieldContent>) {
  return <FieldContent {...props} />;
}

/** The card's title, and its control's name. An icon before the text is drawn 16px and muted. */
function ChoiceCardTitle({ className, render, ...props }: OwnPartProps<"div">) {
  const titleId = useChoiceCardTitleId();
  return renderElement(
    "div",
    mergeProps(
      {
        "data-slot": "field-title",
        className: cn(
          "flex w-fit items-center gap-2 text-sm font-medium group-data-disabled/field:opacity-50 [&_svg]:size-4 [&_svg]:text-muted-foreground",
          className,
        ),
      },
      defined(props),
      { id: titleId },
    ),
    render,
  );
}

/** The card's one line. Field adds it to the control's description. For a disabled card, say why. */
function ChoiceCardDescription(props: ComponentProps<typeof FieldDescription>) {
  return <FieldDescription {...props} />;
}

export { ChoiceCard, ChoiceCardContent, ChoiceCardDescription, ChoiceCardTitle, useChoiceCardTitleId };
