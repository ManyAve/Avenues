"use client";

import { createParts, mergeProps, renderElement, usePart, usePrimitive, type PartProps } from "@ui-sdk/react/primitive";
import { ArrowDownIcon, CheckIcon, CircleAlertIcon, LoaderCircleIcon, RefreshCwIcon } from "lucide-react";
import {
  createContext,
  use,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { Button } from "#avenue/components/button";
import { sourceOf, type ChangeSource } from "#avenue/lib/change";
import { isThenable, rejectionText } from "#avenue/lib/pending";
import { defined, type Loose, type NodeChildren, type OwnPartProps } from "#avenue/lib/props";
import { pullToRefresh } from "#avenue/lib/pull-to-refresh";
import { cn } from "#avenue/lib/utils";

// ui-sdk 0.1 beta types definePrimitive's `options` as `Record | undefined`, which createParts' `Primitive` refuses
// under exactOptionalPropertyTypes; this one always has options, so narrow it. Remove when ui-sdk fixes the type.
const typed = pullToRefresh as typeof pullToRefresh & { options: NonNullable<typeof pullToRefresh.options> };
const parts = createParts(typed, { content: "div" });

/** Where the last refresh got to: none yet, running, done, or failed. */
export type PullToRefreshStatus = "idle" | "running" | "updated" | "failed";

/** What a refresh that rejects without a sentence of its own says. */
export const REFRESH_FAILED = "Couldn't refresh. Try again.";

type Refresh = {
  /** Runs the app's refresh, or joins the one running. Resolves when it settles, whether it worked or not. */
  refresh: (source?: ChangeSource) => Promise<void>;
  status: PullToRefreshStatus;
  /** What the status line says now. */
  message: string;
};

const RefreshContext = createContext<Refresh | null>(null);

/**
 * The refresh of the `PullToRefresh` around it, for a control of the app's own, like a `MenuItem` in the page's menu:
 * `onClick={() => refresh()}`. Its `status` and `message` say where the last one got to.
 */
export function usePullToRefresh(): Refresh {
  const refresh = use(RefreshContext);
  if (!refresh) throw new Error("Avenue: usePullToRefresh must be called inside a <PullToRefresh>.");
  return refresh;
}

export type PullToRefreshProps = Loose<Omit<PartProps<"div">, "children">> & {
  /**
   * Reloads the list. Return a Promise: the spinner and the status line follow it, "Updated" when it resolves, and its
   * rejection's sentence (or "Couldn't refresh. Try again.") when it rejects. `source` is how it was asked for (a
   * finger's pull reads "touch", the button "keyboard", "mouse" or "agent").
   */
  onRefresh: (details: { source: ChangeSource }) => unknown;
  /** No pull and no refresh while true. */
  disabled?: boolean | undefined;
  /** The page's header or toolbar with its `PullToRefreshTrigger`, the `PullToRefreshStatus`, and the `PullToRefreshContent`. */
  children?: ReactNode | undefined;
};

/**
 * Pull a list down to reload it (AVE-200), for apps installed on a phone's home screen, where the browser's own pull to
 * refresh is gone. The behavior is the `pull-to-refresh` primitive (src/lib/pull-to-refresh.ts) on ui-sdk core's
 * `bindDrag`, `rubberBand` and `solveSpring`; the app's `onRefresh` returns a Promise that drives the progress, as a
 * ui-sdk Button's `onClick` does (AVE-150).
 *
 *   PullToRefresh              root: runs the refresh, holds its status
 *   ├── PullToRefreshTrigger   the Refresh button, in the page's toolbar or header
 *   ├── PullToRefreshStatus    the polite status line: "Refreshing…", "Updated", "Couldn't refresh. Try again."
 *   └── PullToRefreshContent   the list a finger pulls, with its indicator at the top
 *
 * The UX Engineer's verdict on AVE-200 is built in:
 *
 * - Only a finger pulls, and only from the top: the pull starts when the list and the page are scrolled to their top and
 *   the finger moves down first, so it never fights a scroll. With a mouse nothing moves.
 * - Never the only way: `PullToRefreshTrigger` (or `usePullToRefresh` for a menu item) is the Refresh for keyboards,
 *   screen readers, switches and agents, on phones too.
 * - Never silent: the status line says how it ended, and the spinner turns into a tick or a warning before the list
 *   goes back, so it never just stops.
 * - Reduced motion: the list doesn't move or spring. A plain line along its top fills as the finger pulls, and a loading
 *   line shows while it refreshes.
 */
export function PullToRefresh({ onRefresh, disabled, className, children, ...props }: PullToRefreshProps) {
  const [state, setState] = useState<{ status: PullToRefreshStatus; message: string }>({
    status: "idle",
    message: "",
  });
  const running = useRef<Promise<void> | null>(null);
  const latest = useRef(onRefresh);
  useLayoutEffect(() => {
    latest.current = onRefresh;
  });
  // Set once the content is drawn; a pull's refresh lets it go when it settles.
  const finish = useRef<() => void>(() => {});

  const refresh = useCallback(
    (source: ChangeSource = "programmatic"): Promise<void> => {
      if (running.current) return running.current;
      if (disabled) return Promise.resolve();
      let result: unknown;
      try {
        result = latest.current({ source });
      } catch (error) {
        result = Promise.reject(error);
      }
      if (!isThenable(result)) {
        setState({ status: "updated", message: "Updated" });
        return Promise.resolve();
      }
      setState({ status: "running", message: "Refreshing…" });
      const run = Promise.resolve(result).then(
        () => setState({ status: "updated", message: "Updated" }),
        (error: unknown) => setState({ status: "failed", message: rejectionText(error, REFRESH_FAILED) }),
      );
      running.current = run.finally(() => {
        running.current = null;
        finish.current();
      });
      return running.current;
    },
    [disabled],
  );

  const handle = usePrimitive(typed, {
    refreshing: state.status === "running",
    disabled,
    onPull: ({ event }) => {
      void refresh(sourceOf(event));
      return running.current !== null;
    },
  });
  useLayoutEffect(() => {
    finish.current = () => handle.api.finish();
  });

  const context = useMemo<Refresh & { handle: typeof handle }>(
    () => ({ refresh, status: state.status, message: state.message, handle }),
    [refresh, state, handle],
  );

  return (
    <RefreshContext value={context}>
      {usePart(handle, "root", {}, { ...defined(props), className: cn("flex flex-col", className), children }, "div")}
    </RefreshContext>
  );
}

function useRefresh(part: string) {
  const refresh = use(RefreshContext);
  if (!refresh) throw new Error(`Avenue: <${part}> must sit inside a <PullToRefresh>.`);
  return refresh as Refresh & { handle: Parameters<typeof usePart>[0] };
}

export type PullToRefreshContentProps = NodeChildren<Loose<PartProps<"div">>>;

/**
 * The list a finger pulls. It moves down with the pull (`--pull-y`), resisting the farther it goes, and its indicator
 * shows above it: an arrow that turns as the pull nears the point of release, a spinner while the refresh runs, then a
 * tick or a warning. Under reduced motion it stays put, and a line along its top shows the pull and the loading instead.
 */
export function PullToRefreshContent({ className, children, ...props }: PullToRefreshContentProps) {
  const { status } = useRefresh("PullToRefreshContent");
  return (
    <parts.Content
      className={cn(
        "group/pull relative translate-y-(--pull-y) motion-reduce:translate-y-0 data-pulling:select-none",
        className,
      )}
      {...defined(props)}
    >
      <PullIndicator status={status} />
      {children}
    </parts.Content>
  );
}

/** The spinner above the list (or, under reduced motion, the line along its top). Decoration: the status line speaks. */
function PullIndicator({ status }: { status: PullToRefreshStatus }) {
  const Icon =
    status === "running"
      ? LoaderCircleIcon
      : status === "updated"
        ? CheckIcon
        : status === "failed"
          ? CircleAlertIcon
          : ArrowDownIcon;
  return (
    <div aria-hidden data-slot="pull-to-refresh-indicator" className="pointer-events-none">
      {/* Full motion: the icon above the list, shown as the list comes down. */}
      <div className="absolute inset-x-0 bottom-full flex h-12 items-center justify-center opacity-(--pull-progress) motion-reduce:hidden">
        <span className="flex size-8 items-center justify-center rounded-full bg-background text-muted-foreground shadow-popover">
          <Icon
            className={cn(
              "size-4",
              status === "idle" &&
                "rotate-0 transition-transform duration-fast group-data-armed/pull:rotate-180 motion-reduce:transition-none",
              status === "running" && "animate-spin motion-reduce:animate-none",
              status === "failed" && "text-destructive-subtle-foreground",
            )}
          />
        </span>
      </div>
      {/* Reduced motion: a still line along the top, filled by the pull, faint and full while it loads. */}
      <div className="absolute inset-x-0 top-0 hidden h-1 bg-fill motion-reduce:group-data-pulled/pull:block motion-reduce:group-data-refreshing/pull:block">
        <div className="h-full w-[calc(var(--pull-progress)*100%)] bg-primary group-data-refreshing/pull:w-full group-data-refreshing/pull:bg-primary/40" />
      </div>
    </div>
  );
}

export type PullToRefreshTriggerProps = Omit<ComponentProps<typeof Button>, "onClick" | "children"> & {
  /** The button's words. "Refresh" unless the page already has a Refresh, when it names what reloads: "Refresh notices". */
  children?: ReactNode | undefined;
};

/**
 * The Refresh button: the same refresh as the pull, for a keyboard, a screen reader, a mouse and an agent. Pressed while
 * a refresh runs, it waits for that one. Its icon spins while any refresh runs; the status line says how it ended, so
 * the button says nothing of its own (`pendingAnnouncement=""`).
 */
export function PullToRefreshTrigger({ children = "Refresh", variant = "outline", ...props }: PullToRefreshTriggerProps) {
  const { refresh, status } = useRefresh("PullToRefreshTrigger");
  return (
    <Button
      variant={variant}
      pendingAnnouncement=""
      {...defined(props)}
      onClick={(_event, { source }) => refresh(source)}
    >
      <RefreshCwIcon aria-hidden className={cn(status === "running" && "animate-spin motion-reduce:animate-none")} />
      {children}
    </Button>
  );
}

export type PullToRefreshStatusProps = Loose<Omit<OwnPartProps<"p">, "children" | "role">>;

/**
 * The polite status line (`role="status"`), empty until the first refresh: "Refreshing…", then "Updated" or the
 * failure's sentence, which stays until the next refresh. Put it where a person looks after a pull, under the page's
 * header; `className="sr-only"` keeps it for screen readers only.
 */
export function PullToRefreshStatus({ className, render, ...props }: PullToRefreshStatusProps) {
  const { status, message } = useRefresh("PullToRefreshStatus");
  return renderElement(
    "p",
    mergeProps(
      {
        role: "status",
        "data-slot": "pull-to-refresh-status",
        "data-status": status,
        className: cn(
          "min-h-(--text-meta--line-height) text-meta text-muted-foreground data-[status=failed]:text-destructive-subtle-foreground",
          className,
        ),
        children: message,
      },
      defined(props),
    ),
    render,
  );
}
