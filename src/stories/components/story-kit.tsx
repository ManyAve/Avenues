import type { ReactNode } from "react";

// Layout helpers for the component stories. Story-only: nothing here is exported from the package.

/**
 * A labelled row of examples: the label column names the variant, size or state. The examples sit `gap-controls`
 * apart (8px, 16px on a phone), the same gap a screen puts between controls, so the touch test measures real
 * spacing. On a phone the row is at least 44px tall, like any stacked row of controls (AVE-22).
 */
export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] items-center gap-4 pointer-coarse:min-h-11">
      <span className="text-meta text-muted-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-controls">{children}</div>
    </div>
  );
}

/** A column of rows with a little air between them, on the page background. */
export function Rows({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-4 p-inset">{children}</div>;
}
