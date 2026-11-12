import { mergeProps, renderElement, type PartProps } from "@ui-sdk/react/primitive"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "#avenue/lib/utils";

/**
 * Ported from the app's app/ui/components/ui/badge.tsx (e01cc90). 20px tall; the 4xl corner (retired in Avenue)
 * becomes rounded-full, which renders the same pill. The icon-side padding moves from 6px to 4px.
 * ManyAve's Status and Count (AVE-8) build on this. Pass `render` to make it a link.
 */

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive-subtle-foreground focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        // Dark: as Button link, the subtle-foreground tone, because primary text is 3.2:1 on the dark page.
        link: "text-primary underline-offset-4 hover:underline dark:text-primary-subtle-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: PartProps<"span"> & VariantProps<typeof badgeVariants>) {
  return renderElement(
    "span",
    mergeProps({ "data-slot": "badge", "data-variant": variant, className: cn(badgeVariants({ variant }), className) }, props),
    render,
  )
}

export { Badge, badgeVariants }
