import { Check, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "#avenue/lib/utils";

// Building blocks for the Foundations pages. Story-only: nothing here is exported from the package.
// Page, Section and Code come from the token stories (../tokens/token-docs) so both sections look alike.

/** One rule, stated in a sentence, with an optional reason underneath. */
export function Rule({ children, why }: { children: ReactNode; why?: ReactNode }) {
  return (
    <li className="flex flex-col gap-1">
      <span className="text-compact">{children}</span>
      {why ? <span className="text-meta text-muted-foreground">{why}</span> : null}
    </li>
  );
}

export function Rules({ children }: { children: ReactNode }) {
  return <ul className="flex max-w-prose list-none flex-col gap-3 p-0">{children}</ul>;
}

function Example({
  kind,
  caption,
  children,
  className,
}: {
  kind: "do" | "dont";
  caption: ReactNode;
  children: ReactNode;
  className?: string | undefined;
}) {
  const isDo = kind === "do";
  const Icon = isDo ? Check : X;
  return (
    <figure className="m-0 flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card">
      <div className={cn("flex min-h-32 flex-1 items-center justify-center bg-background p-inset", className)}>
        {children}
      </div>
      <figcaption
        className={cn("flex gap-group border-t-2 px-inset py-row-y", isDo ? "border-t-success" : "border-t-destructive")}
      >
        <Icon
          aria-hidden="true"
          className={cn("mt-0.5 size-4 shrink-0", isDo ? "text-success-subtle-foreground" : "text-destructive-subtle-foreground")}
        />
        <span className="flex flex-col gap-inline">
          <span className="text-control font-semibold">{isDo ? "Do" : "Don't"}</span>
          <span className="text-meta text-muted-foreground">{caption}</span>
        </span>
      </figcaption>
    </figure>
  );
}

/** A do and a don't side by side (stacked on narrow screens), each with a caption saying why. */
export function DoDont({
  doCaption,
  dontCaption,
  good,
  bad,
  frameClassName,
}: {
  doCaption: ReactNode;
  dontCaption: ReactNode;
  good: ReactNode;
  bad: ReactNode;
  frameClassName?: string | undefined;
}) {
  return (
    <div className="grid max-w-4xl grid-cols-1 gap-inset md:grid-cols-2">
      <Example kind="do" caption={doCaption} className={frameClassName}>
        {good}
      </Example>
      <Example kind="dont" caption={dontCaption} className={frameClassName}>
        {bad}
      </Example>
    </div>
  );
}

/** Points to the token page that holds the values, so Foundations explains use without repeating the scales. */
export function SeeTokens({ children }: { children: ReactNode }) {
  return <p className="max-w-prose text-meta text-muted-foreground">Values: {children}.</p>;
}

/** Fictional household rows used across the pages. Never real association data. */
export const households = [
  { address: "14 Alder Lane", owner: "R. Okafor", amount: "$240.00", status: "paid" },
  { address: "3 Birch Court", owner: "M. Lindqvist", amount: "$240.00", status: "owing" },
  { address: "27 Cedar Row", owner: "J. Abara", amount: "$120.00", status: "partial" },
  { address: "9 Dogwood Way", owner: "S. Patel", amount: "−$40.00", status: "credit" },
  { address: "61 Elm Street", owner: "T. Novak", amount: "$240.00", status: "processing" },
] as const;
