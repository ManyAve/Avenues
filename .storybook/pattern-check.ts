// AVE-18: a story tagged `pattern:<name>` (for example `tags: ["pattern:dialog"]`) runs ui-sdk's
// accessibility pattern check after its play function: roles, names, states, references between parts
// and the pattern's keyboard behavior. Open a dialog or menu in `play` before the check runs.
// scripts/component-patterns.ts says which components need which pattern; check:story-coverage
// enforces it.
//
// The check presses keys, so it only runs under the story tests (Playwright sets navigator.webdriver),
// not while someone is looking at the story in Storybook.
import { checkPattern, type Pattern } from "@ui-sdk/core/testing";

const PREFIX = "pattern:";

export function patternsFromTags(tags: readonly string[] | undefined): string[] {
  return (tags ?? []).filter((t) => t.startsWith(PREFIX)).map((t) => t.slice(PREFIX.length));
}

export async function runPatternChecks(tags: readonly string[] | undefined, root: unknown): Promise<void> {
  const patterns = patternsFromTags(tags);
  if (patterns.length === 0) return;
  if (typeof navigator === "undefined" || !navigator.webdriver) return;
  // `parameters.patternRoot` (a CSS selector) narrows where the check looks; by default the whole
  // body, because dialogs and menus render outside the story's canvas.
  const element =
    typeof root === "string" ? document.querySelector<HTMLElement>(root) : (document.body as HTMLElement);
  if (!element) throw new Error(`patternRoot "${String(root)}" matched nothing`);
  for (const pattern of patterns) {
    await checkPattern(element, pattern as Pattern);
  }
}
