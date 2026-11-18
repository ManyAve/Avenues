import type { ReactNode } from "react";

/** Two reasons are the same line when they're the same text, or the same node. */
export function sameReason(a: ReactNode, b: ReactNode) {
  return a === b || (typeof a === "string" && typeof b === "string" && a.trim() === b.trim());
}

/** One reason line under a row of buttons: it starts under button `from` and covers `span` buttons that share it. */
export type ReasonRun = { from: number; span: number; reason: ReactNode; key: string };

/**
 * The reason lines under a row of buttons: one line for each run of neighbouring buttons that share a reason, so a
 * reason shows once however many buttons it disables (AVE-160). The toolbar and the selection bar lay these out on a
 * grid's second row, each line spanning its run's columns, so no two lines ever print over each other (AVE-162).
 */
export function reasonRuns(row: readonly { id: string; disabledReason?: ReactNode }[]) {
  const runs: ReasonRun[] = [];
  row.forEach((action, index) => {
    if (!action.disabledReason) return;
    const last = runs.at(-1);
    if (last && last.from + last.span === index && sameReason(last.reason, action.disabledReason)) last.span += 1;
    else runs.push({ from: index, span: 1, reason: action.disabledReason, key: action.id });
  });
  return runs;
}

/** The run, if any, whose line describes button `index`. */
export function runAt(runs: readonly ReasonRun[], index: number) {
  return runs.find((run) => index >= run.from && index < run.from + run.span);
}
