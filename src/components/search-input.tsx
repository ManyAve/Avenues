import { Search } from "lucide-react";
import { useEffect, useRef, type ComponentProps } from "react";
import { Input } from "#avenue/components/input";
import { Kbd } from "#avenue/components/kbd";
import { cn } from "#avenue/lib/utils";

const editable = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || target.closest("input, textarea, select, [contenteditable='true']") !== null);

/** Widgets that type ahead: a key typed in an open list, menu, grid or tree belongs to them (AVE-62). */
const typesAhead = (target: EventTarget | null) =>
  target instanceof Element && target.closest("[role=listbox], [role=menu], [role=grid], [role=tree]") !== null;

/**
 * ManyAve's compact search field with a leading icon (the app's app/ui/components/SearchInput.tsx at e01cc90), on
 * Avenue's Input (ui-sdk input).
 *
 * `kbd` is a one-key shortcut, such as "/". The field binds it itself, so the hint never shows a key that does
 * nothing: pressing it anywhere outside a text field, or a list, menu, grid or tree that types ahead, focuses the
 * search. The hint is hidden where the main pointer is touch, since there's usually no keyboard, and the key is
 * announced through aria-keyshortcuts.
 *
 * Turn-off rule (WCAG 2.1.4, AVE-62): a one-key shortcut must be possible to turn off, because a speech-input
 * user's stray "slash" would move their focus. An app that passes `kbd` must offer a "Keyboard shortcuts" setting
 * (on by default) and pass `kbd` only while it is on; leaving `kbd` out removes the binding and the hint.
 *
 * Changes from the app: AVE-29 text (16px below 768px so iOS does not zoom, 14px from 768px up, from Input).
 * AVE-2: md height (32px, was 30 or 29) to share the toolbar row; `filled` takes the md
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
      if (editable(event.target) || typesAhead(event.target)) return;
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
          "ps-7",
          kbd && "pe-8 pointer-coarse:pe-2",
          // The filled tint (the toolbar search, AVE-63): 8% of the foreground over the background, so it follows the
          // theme. `muted` is lighter in light mode (L 0.977 vs 0.930), so not it. One field draws it: a literal, not a
          // token (docs/tokens.md; AVE-184 retired --color-field-filled). dark: repeats it to beat the field surface's
          // own dark background (controlSurface).
          filled &&
            "border-border bg-[color:color-mix(in_oklab,var(--foreground)_8%,var(--background))] dark:bg-[color:color-mix(in_oklab,var(--foreground)_8%,var(--background))]",
        )}
        {...props}
      />
      {kbd && (
        <Kbd aria-hidden className="pointer-events-none absolute end-2 pointer-coarse:hidden">
          {kbd}
        </Kbd>
      )}
    </div>
  );
}

export { SearchInput };
