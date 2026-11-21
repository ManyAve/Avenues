import { mergeProps, renderElement } from "@ui-sdk/react/primitive";
import { defined, type OwnPartProps } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

/**
 * A key on the keyboard, written the way a shortcut hint shows it: "/", "⌘K" (AVE-210). Avenue's mono (`font-mono`) at the meta step
 * (Avenue's 14px floor; never smaller), inside the faint floating edge from AVE-208.
 *
 * It is the `kbd` element, so screen readers that announce it can. A hint that only repeats a control's
 * `aria-keyshortcuts` should be `aria-hidden`, as SearchInput's is.
 */
function Kbd({ className, render, ...props }: OwnPartProps<"kbd">) {
  return renderElement(
    "kbd",
    mergeProps(
      {
        "data-slot": "kbd",
        className: cn(
          "inline-flex items-center rounded-xs border border-border-floating px-1 font-mono text-meta text-muted-foreground",
          className,
        ),
      },
      defined(props),
    ),
    render,
  );
}

export { Kbd };
