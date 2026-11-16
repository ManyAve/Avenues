import { Button as ButtonPrimitive } from "@ui-sdk/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { useId, type ComponentProps, type ReactNode } from "react";
import { controlShape } from "#avenue/lib/control";
import { cn } from "#avenue/lib/utils";
import { defined, type Loose } from "#avenue/lib/props";

/**
 * Ported from the app's app/ui/components/ui/button.tsx (e01cc90). Colours and states are unchanged.
 * AVE-2 sizes: xs 24 and sm 28 with the md corner (8px), default 32 and lg 40 with the lg corner (10px);
 * the app's `page` size (31px, 6px corner) folds into default. Buttons are never pills.
 * Size is listed before variant so the `text` variant's own height and padding win the merge.
 * Labels use text-control, 14px on both scales (AVE-29). The `text` variant is running text, not a control label, so
 * it keeps text-sm.
 */
const buttonVariants = cva(
  "group/button relative hit-area inline-flex shrink-0 items-center justify-center border border-transparent bg-clip-padding text-control font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 data-disabled:opacity-50 data-disabled:active:translate-y-0 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      size: {
        default: `${controlShape({ size: "md" })} gap-1 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2`,
        xs: `${controlShape({ size: "xs" })} gap-1 px-2 [&_svg:not([class*='size-'])]:size-3`,
        sm: `${controlShape({ size: "sm" })} gap-1 px-2 [&_svg:not([class*='size-'])]:size-3.5`,
        lg: `${controlShape({ size: "lg" })} gap-1 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2`,
        icon: `${controlShape({ size: "md" })} w-control-md`,
        "icon-xs": `${controlShape({ size: "xs" })} w-control-xs [&_svg:not([class*='size-'])]:size-3`,
        "icon-sm": `${controlShape({ size: "sm" })} w-control-sm`,
        "icon-lg": `${controlShape({ size: "lg" })} w-control-lg`,
      },
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        // Dark (AVE-99): the page is darker than a card, so a `bg-background` fill read as a hole on every card. The fill
        // is the card's own surface (one step lighter than the page), and hover goes one step lighter again, because
        // `muted` is the card's colour in dark and would show no change.
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:bg-card dark:hover:bg-accent dark:aria-expanded:bg-accent",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive-subtle-foreground hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        // Dark: the primary text colour is 3.2:1 on the dark page, so links use the subtle-foreground tone there (4.5:1+).
        link: "text-primary underline-offset-4 hover:underline dark:text-primary-subtle-foreground",
        /**
         * The app's hand-made `textAction` (16 raw buttons): an inline text action that reads as a link but does
         * something on the page. Sits in running text at the text's own height; the shared hit area grows it
         * invisibly without moving anything.
         */
        text: "h-auto rounded-xs border-0 px-0 text-sm text-start font-normal whitespace-normal text-primary-subtle-foreground underline underline-offset-3 hover:text-foreground active:not-aria-[haspopup]:translate-y-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

type ButtonProps = Loose<ComponentProps<typeof ButtonPrimitive>> &
  VariantProps<typeof buttonVariants> & {
    /**
     * Why the action is unavailable. Disables the button but keeps it focusable, shows the reason as one muted
     * line under it (UX.md: "show the action disabled, with one muted line under it"), and links the two with
     * aria-describedby so a screen reader reads the reason with the button. Replaces title tooltips on
     * disabled buttons, which keyboard and touch users never see.
     */
    disabledReason?: ReactNode | undefined;
  };

function Button({ className, variant = "default", size = "default", disabledReason, ...props }: ButtonProps) {
  const reasonId = useId();
  const button = (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...defined(props)}
      {...(disabledReason
        ? {
            disabled: true,
            focusableWhenDisabled: true,
            "aria-describedby": [props["aria-describedby"], reasonId].filter(Boolean).join(" "),
          }
        : {})}
    />
  );
  if (!disabledReason) return button;
  return (
    <span data-slot="button-with-reason" className="inline-flex flex-col items-start gap-1">
      {button}
      <span id={reasonId} data-slot="button-reason" className="text-meta text-muted-foreground">
        {disabledReason}
      </span>
    </span>
  );
}

export { Button, buttonVariants, type ButtonProps };
