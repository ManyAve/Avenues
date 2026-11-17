import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@ui-sdk/react/collapsible";
import { mergeProps, renderElement } from "@ui-sdk/react/primitive";
import { XIcon } from "lucide-react";
import { createContext, useContext, type ComponentProps } from "react";
import { Button } from "#avenue/components/button";
import { defined, type Loose, type OwnPartProps } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

/**
 * The messenger-style windows pinned to the bottom right of a wide screen (AVE-135): Management's board chat windows
 * and Messages inbox, Neighbors' messages beside the feed. Each window has a header you press to fold it away, its
 * own actions and Close; windows sit side by side, the newest nearest the edge.
 *
 *   Dock                       the fixed bottom-right row; only the windows take pointer events
 *   └── DockWindow             one window: a named region, the open state (ui-sdk Collapsible)
 *       ├── DockWindowHeader   the 44px header row
 *       │   ├── DockWindowTrigger   the fold button (ui-sdk CollapsibleTrigger): leading, DockWindowTitle, DockWindowBadge
 *       │   ├── DockWindowActions   the app's own buttons (New chat, a menu), outside the fold button
 *       │   └── DockWindowClose     "Close <label>"
 *       └── DockWindowBody     the window's content (ui-sdk CollapsiblePanel, kept mounted)
 *
 * Behavior is ui-sdk's Collapsible: the header's fold button is a real button with aria-expanded and aria-controls,
 * Enter and Space fold and unfold it, and folding with focus inside the body puts focus back on it. Folded, the
 * body stays mounted and hidden, so a half-typed message survives and Tab skips it.
 *
 * A window is non-modal (APG): a `section` named by `label`, with no focus trap and no backdrop, so the page beside
 * it stays usable. Escape does nothing at window level; it belongs to the composer and to menus inside. Close only
 * reports the press (`onClose`): the app removes the window and moves focus to what opened it, such as its launcher.
 *
 * The look is Management's frame (app/ui/components/chat.tsx, DockWindow): 328px wide (`width="wide"`, 416px, for
 * the inbox), the top corners at xl, a border with none at the bottom edge, the popover fill and a large shadow; the
 * header 44px with a bottom border; open, `min(32rem, 100dvh - 4rem)` tall. Below 640px a window spans the width and
 * the windows stack (Management squeezes them side by side there).
 * Whether to show a dock on a phone at all is the app's call (Neighbors hides it below two panes).
 */

type DockWindowContextValue = { label: string };
const DockWindowContext = createContext<DockWindowContextValue>({ label: "" });

/**
 * The bottom-right row of windows. Put the newest window first: the row runs from the right edge. Below 640px, where
 * a window spans the width, the windows stack instead, the newest at the bottom, so none is squeezed.
 */
function Dock({ className, render, ...props }: OwnPartProps<"div">) {
  return renderElement(
    "div",
    mergeProps(
      {
        "data-slot": "dock",
        className: cn(
          "pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-row-reverse items-end justify-start gap-3 px-4 max-sm:flex-col-reverse max-sm:items-stretch max-sm:px-0",
          className,
        ),
      },
      defined(props),
    ),
    render,
  );
}

export type DockWindowWidth = "default" | "wide";

const widthLook: Record<DockWindowWidth, string> = {
  default: "w-82",
  wide: "w-104",
};

export type DockWindowProps = Loose<Omit<ComponentProps<typeof Collapsible>, "render">> & {
  /** The window's name, unique on the page: the other person, the group or "Chat". Names the region and Close. */
  label: string;
  /** `wide` is the inbox's 416px; `default` is a chat window's 328px. */
  width?: DockWindowWidth | undefined;
};

/**
 * One docked window. Open by default; control it with `open` and `onOpenChange` (Management keeps each window's
 * folded state in its dock), or `defaultOpen`.
 */
function DockWindow({ label, width = "default", className, open, defaultOpen, ...props }: DockWindowProps) {
  return (
    <DockWindowContext.Provider value={{ label }}>
      <Collapsible
        render={<section aria-label={label} />}
        data-width={width}
        {...(open === undefined ? { defaultOpen: defaultOpen ?? true } : { open })}
        className={cn(
          "pointer-events-auto flex h-11 flex-col overflow-hidden rounded-t-xl border border-b-0 bg-popover text-popover-foreground shadow-lg data-open:h-[min(32rem,calc(100dvh-4rem))] max-sm:w-full",
          widthLook[width],
          className,
        )}
        {...defined(props)}
      />
    </DockWindowContext.Provider>
  );
}

/**
 * The header row: the fold button, then the actions and Close. On a phone the gap between them grows to 16px, so
 * their 44px tap areas don't overlap; with a mouse it is the app's 4px.
 */
function DockWindowHeader({ className, render, ...props }: OwnPartProps<"header">) {
  return renderElement(
    "header",
    mergeProps(
      {
        "data-slot": "dock-window-header",
        className: cn("flex h-11 shrink-0 items-center gap-1 border-b px-1 pointer-coarse:gap-controls", className),
      },
      defined(props),
    ),
    render,
  );
}

/**
 * The button that folds the window: everything in it is its name, so keep a leading avatar or icon `aria-hidden`
 * and say the unread count with DockWindowBadge.
 */
function DockWindowTrigger({ className, ...props }: Loose<ComponentProps<typeof CollapsibleTrigger>>) {
  return (
    <CollapsibleTrigger
      className={cn(
        "relative hit-area flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1 text-start outline-none select-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
      {...defined(props)}
    />
  );
}

/** The window's title in the fold button, cut short with an ellipsis when it doesn't fit. */
function DockWindowTitle({ className, render, ...props }: OwnPartProps<"span">) {
  return renderElement(
    "span",
    mergeProps(
      { "data-slot": "dock-window-title", className: cn("min-w-0 truncate text-control font-[600]", className) },
      defined(props),
    ),
    render,
  );
}

/** "99+" past 99, as both apps write it. */
function unreadText(count: number) {
  return count > 99 ? "99+" : String(count);
}

/**
 * The unread count after the title, a primary pill. Nothing shows at 0. The pill is hidden from screen readers and
 * the fold button's name reads "Ana Ruiz, 3 unread" instead of "Ana Ruiz 3"; `label` is the words after the number.
 */
function DockWindowBadge({
  count,
  label = "unread",
  className,
  render,
  ...props
}: OwnPartProps<"span"> & { count: number; label?: string | undefined }) {
  if (count <= 0) return null;
  return (
    <>
      <span className="sr-only">
        , {count} {label}
      </span>
      {renderElement(
        "span",
        mergeProps(
          {
            "data-slot": "dock-window-badge",
            "aria-hidden": true,
            className: cn(
              "inline-flex h-4.5 min-w-4.5 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-meta font-[600] text-primary-foreground tabular-nums",
              className,
            ),
            children: unreadText(count),
          },
          defined(props),
        ),
        render,
      )}
    </>
  );
}

/** The app's own header buttons (New chat, a menu), between the fold button and Close. */
function DockWindowActions({ className, render, ...props }: OwnPartProps<"div">) {
  return renderElement(
    "div",
    mergeProps(
      {
        "data-slot": "dock-window-actions",
        className: cn("flex shrink-0 items-center gap-1 pointer-coarse:gap-controls", className),
      },
      defined(props),
    ),
    render,
  );
}

/** Close, named "Close <label>" so two windows' Close buttons differ. The app removes the window in `onClick`. */
function DockWindowClose({ children, ...props }: Loose<ComponentProps<typeof Button>>) {
  const { label } = useContext(DockWindowContext);
  return (
    <Button variant="ghost" size="icon-sm" aria-label={`Close ${label}`} {...defined(props)}>
      {children ?? <XIcon />}
    </Button>
  );
}

/** The window's content. Folded, it stays mounted and hidden. Give it a MessageList and a composer, or a list. */
function DockWindowBody({ className, ...props }: Loose<Omit<ComponentProps<typeof CollapsiblePanel>, "keepMounted">>) {
  return (
    <CollapsiblePanel
      keepMounted
      className={cn("flex min-h-0 flex-1 flex-col data-closed:hidden", className)}
      {...defined(props)}
    />
  );
}

export {
  Dock,
  DockWindow,
  DockWindowActions,
  DockWindowBadge,
  DockWindowBody,
  DockWindowClose,
  DockWindowHeader,
  DockWindowTitle,
  DockWindowTrigger,
};
