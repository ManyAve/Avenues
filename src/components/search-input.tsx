import { Search } from "lucide-react";
import { useEffect, useRef, type ComponentProps } from "react";
import { Input } from "#avenue/components/input";
import { cn } from "#avenue/lib/utils";

const editable = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || target.closest("input, textarea, select, [contenteditable='true']") !== null);

/**
 * ManyAve's compact search field with a leading icon (the app's app/ui/components/SearchInput.tsx at e01cc90), on
 * Avenue's Input (ui-sdk input).
 *
 * `kbd` is a one-key shortcut, such as "/". The field binds it itself, so the hint never shows a key that does
 * nothing: pressing it anywhere outside a text field focuses the search. The hint is hidden where the main
 * pointer is touch, since there's usually no keyboard, and the key is announced through aria-keyshortcuts.
 *
 * Changes from the app, all AVE-2: md height (32px, was 30 or 29) to share the toolbar row; `filled` takes the md
 * control corner (10px, was 5px literal); the hint takes the xs corner (4px, was 3px).
 */
function SearchInput({
  kbd,
  filled,
  className,
  ref,
  ...props
}: ComponentProps<typeof Input> & {
  kbd?: string | undefined;
  /** Toolbar look: a tinted fill and a light border. */
  filled?: boolean | undefined;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!kbd) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== kbd || event.metaKey || event.ctrlKey || event.altKey || event.defaultPrevented) return;
      if (editable(event.target)) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [kbd]);

  return (
    <div
      data-slot="search-input"
      className={cn("relative inline-flex min-w-[178px] items-center text-muted-foreground", className)}
    >
      <Search aria-hidden className="pointer-events-none absolute start-2 size-3.5" />
      <Input
        type="search"
        ref={(node: HTMLInputElement | null) => {
          inputRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        aria-keyshortcuts={kbd}
        className={cn(
          "ps-7 text-control md:text-control",
          kbd && "pe-8 pointer-coarse:pe-2",
          filled && "border-border bg-[color-mix(in_oklab,var(--foreground)_8%,var(--background))] dark:bg-[color-mix(in_oklab,var(--foreground)_8%,var(--background))]",
        )}
        {...props}
      />
      {kbd && (
        <kbd
          aria-hidden
          className="pointer-events-none absolute end-2 rounded-xs border px-1 text-meta pointer-coarse:hidden"
        >
          {kbd}
        </kbd>
      )}
    </div>
  );
}

export { SearchInput };
