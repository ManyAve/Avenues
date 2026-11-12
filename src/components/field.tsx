import * as FieldPrimitive from "@ui-sdk/react/field";
import { cva, type VariantProps } from "class-variance-authority";
import { createContext, useContext, type ComponentProps, type ReactNode } from "react";
import { cn } from "#avenue/lib/utils";

/**
 * Ported from the app's app/ui/components/ui/field.tsx (e01cc90), with the app's Label folded in.
 * Built on ui-sdk's Field, so the wiring is Field's job, not each screen's: FieldLabel labels the control,
 * FieldDescription and FieldError are added to its aria-describedby, and `invalid` sets aria-invalid on the control
 * and shows FieldError. Off-grid steps move to the 4px grid (AVE-2): 6px to 8px, 10px to 12px,
 * and the 2px gap between label and description to 4px.
 */

function FieldSet({ className, ...props }: ComponentProps<typeof FieldPrimitive.FieldSet>) {
  return (
    <FieldPrimitive.FieldSet
      data-slot="field-set"
      className={cn(
        "flex flex-col gap-4 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3",
        className,
      )}
      {...props}
    />
  );
}

function FieldLegend({
  className,
  variant = "legend",
  ...props
}: ComponentProps<typeof FieldPrimitive.FieldLegend> & { variant?: "legend" | "label" | undefined }) {
  return (
    <FieldPrimitive.FieldLegend
      // A native <legend> sits outside the fieldset's flex flow; a div keeps the app's spacing and still names the set.
      render={<div />}
      data-slot="field-legend"
      data-variant={variant}
      className={cn(
        "mb-2 font-medium data-[variant=label]:text-sm data-[variant=legend]:text-base",
        className,
      )}
      {...props}
    />
  );
}

function FieldGroup({ className, ...props }: ComponentProps<typeof FieldPrimitive.FieldGroup>) {
  return (
    <FieldPrimitive.FieldGroup
      data-slot="field-group"
      className={cn(
        "group/field-group @container/field-group flex w-full flex-col gap-5 data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-4",
        className,
      )}
      {...props}
    />
  );
}

// On a phone (coarse pointer), a field holding a checkbox or switch is at least 44px tall, so a list of them keeps
// each control's 44px hit area its own (AVE-22). Desktop is unchanged.
const fieldVariants = cva(
  "group/field flex w-full gap-2 data-invalid:text-destructive-subtle-foreground pointer-coarse:has-[>[role=checkbox]]:min-h-11 pointer-coarse:has-[>[role=switch]]:min-h-11",
  {
  variants: {
    orientation: {
      vertical: "flex-col *:not-[[popover]]:w-full [&>.sr-only]:w-auto",
      horizontal:
        "flex-row items-center has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio],[role=switch]]:mt-px",
      responsive:
        "flex-col *:not-[[popover]]:w-full @md/field-group:flex-row @md/field-group:items-center @md/field-group:*:not-[[popover]]:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:*:data-[slot=field-label]:flex-auto [&>.sr-only]:w-auto @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio],[role=switch]]:mt-px",
    },
  },
  defaultVariants: { orientation: "vertical" },
  },
);

/**
 * One labelled control. Pass `invalid` (with a FieldError child) to mark it invalid; `disabled` dims the label and
 * disables the control. ui-sdk also runs native constraint validation (required, type=email, ...): errors show
 * once a submit finds the control invalid, then update as the value changes.
 */
/** Whether a part sits inside a Field that the screen marked invalid. */
const FieldContext = createContext<{ invalid: boolean } | null>(null);

function Field({
  className,
  orientation = "vertical",
  ...props
}: ComponentProps<typeof FieldPrimitive.Field> & VariantProps<typeof fieldVariants>) {
  return (
    <FieldContext.Provider value={{ invalid: !!props.invalid }}>
      <FieldPrimitive.Field
        data-slot="field"
        data-orientation={orientation}
        className={cn(fieldVariants({ orientation }), className)}
        {...props}
      />
    </FieldContext.Provider>
  );
}

function FieldContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="field-content"
      className={cn("group/field-content flex flex-1 flex-col gap-1 leading-snug", className)}
      {...props}
    />
  );
}

/** The control's label (the app's Label, folded in). For a card that is a whole label, use ChoiceCard. */
function FieldLabel({ className, ...props }: ComponentProps<typeof FieldPrimitive.FieldLabel>) {
  return (
    <FieldPrimitive.FieldLabel
      data-slot="field-label"
      className={cn(
        "group/field-label peer/field-label flex w-fit items-center gap-2 text-sm leading-snug font-medium select-none group-data-disabled/field:pointer-events-none group-data-disabled/field:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

function FieldTitle({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="field-title"
      className={cn(
        "flex w-fit items-center gap-2 text-sm font-medium group-data-disabled/field:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

/** Describes the field's control, or the field set it sits in. */
function FieldDescription({ className, ...props }: ComponentProps<typeof FieldPrimitive.FieldDescription>) {
  return (
    <FieldPrimitive.FieldDescription
      data-slot="field-description"
      className={cn(
        "text-left text-sm leading-normal font-normal text-muted-foreground group-has-data-horizontal/field:text-balance [[data-variant=legend]+&]:-mt-2",
        "last:mt-0 nth-last-2:-mt-1",
        "[&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary",
        className,
      )}
      {...props}
    />
  );
}

function FieldSeparator({ children, className, ...props }: ComponentProps<"div"> & { children?: ReactNode }) {
  return (
    <div
      data-slot="field-separator"
      data-content={!!children}
      className={cn("relative -my-2 h-5 text-sm", className)}
      {...props}
    >
      <div aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-border" />
      {children && (
        <span
          className="relative mx-auto block w-fit bg-background px-2 text-muted-foreground"
          data-slot="field-separator-content"
        >
          {children}
        </span>
      )}
    </div>
  );
}

/**
 * The error line. Shown while the field is invalid (the Field's `invalid` prop, or a failed native check; narrow
 * that with `match`, e.g. match="valueMissing"), and joined to the control's aria-describedby while shown.
 * Pass `errors` to list several messages (duplicates are dropped).
 */
function FieldError({
  className,
  children,
  errors,
  ...props
}: ComponentProps<typeof FieldPrimitive.FieldError> & {
  errors?: Array<{ message?: string | undefined } | undefined> | undefined;
}) {
  // A Field the screen marked invalid always shows its error; otherwise ui-sdk shows it on a failed native check.
  const invalid = useContext(FieldContext)?.invalid;
  let content: typeof children = children;
  if (!content && errors?.length) {
    const unique = [...new Set(errors.map((error) => error?.message).filter(Boolean))] as string[];
    content =
      unique.length === 1 ? (
        unique[0]
      ) : (
        <ul className="ml-4 flex list-disc flex-col gap-1">
          {unique.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      );
  }
  return (
    <FieldPrimitive.FieldError
      // role=alert announces the message when it appears; aria-describedby repeats it when the control is focused.
      role="alert"
      data-slot="field-error"
      className={cn("text-sm font-normal text-destructive-subtle-foreground", className)}
      {...(invalid && props.match === undefined ? { match: true } : {})}
      {...props}
    >
      {content}
    </FieldPrimitive.FieldError>
  );
}

export {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
};
