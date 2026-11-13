// A story that asks for a viewport (for example `globals: { viewport: { value: "phone" } }`) must really run at
// that width under the story tests. If the option is renamed or the addon stops applying it, the story would
// otherwise run at the desktop width and its phone assertions could pass without testing a phone (AVE-34).

interface ViewportOption {
  styles?: { width?: string; height?: string };
}

/** The problem with the viewport a story ran at, or undefined when it ran at the width it asked for. */
export function viewportProblem(
  asked: unknown,
  options: Record<string, ViewportOption> | undefined,
  actualWidth: number,
): string | undefined {
  const value = typeof asked === "object" && asked !== null ? (asked as { value?: unknown }).value : asked;
  if (typeof value !== "string" || value === "") return undefined;
  const option = options?.[value];
  if (!option) return `the story asks for viewport "${value}", which isn't one of the preview's viewport options`;
  const width = Number.parseFloat(option.styles?.width ?? "");
  if (!Number.isFinite(width)) return undefined;
  if (Math.round(actualWidth) !== Math.round(width)) {
    return `the story asks for viewport "${value}" (${width}px wide) but ran ${Math.round(actualWidth)}px wide`;
  }
  return undefined;
}

/** Runs after each story under the story tests only (Playwright sets navigator.webdriver). */
export function runViewportCheck(globals: Record<string, unknown>, parameters: Record<string, unknown>): void {
  if (typeof navigator === "undefined" || !navigator.webdriver) return;
  const viewport = parameters["viewport"] as { options?: Record<string, ViewportOption>; disabled?: boolean } | undefined;
  // A story that turns the viewport off (a desktop-window case) runs at the default width whatever the project's
  // global asks for; the `touch` project asks for the phone on every story (AVE-22).
  if (viewport?.disabled) return;
  const problem = viewportProblem(globals["viewport"], viewport?.options, document.documentElement.clientWidth);
  if (problem) throw new Error(`Viewport check: ${problem}.`);
}
