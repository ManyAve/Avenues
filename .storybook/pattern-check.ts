// AVE-18: what the story tests prove about a component's accessibility, driven by story tags.
// scripts/component-patterns.ts says which kind each component needs; check:story-coverage enforces it.
//
// - `pattern:<name>` (for example `tags: ["pattern:combobox"]`): runs ui-sdk's `checkPattern` after the
//   play function: roles, names, states, references between parts and the pattern's keyboard behavior.
//   Open a dialog or menu in `play` first.
// - `agent`: takes a `createAgent` snapshot after the play function and fails when it finds no control,
//   or a control without a name, because an agent can't find an unnamed control (ui-sdk's agent test).
//   The play function still does the `act` steps for what the story wired.
//
// Both press keys or watch the page, so they only run under the story tests (Playwright sets
// navigator.webdriver), not while someone is looking at the story in Storybook.
import { checkPattern, type Pattern } from "@ui-sdk/core/testing";
import { createAgent } from "@ui-sdk/react/agent";

const PREFIX = "pattern:";

export function patternsFromTags(tags: readonly string[] | undefined): string[] {
  return (tags ?? []).filter((t) => t.startsWith(PREFIX)).map((t) => t.slice(PREFIX.length));
}

const underTest = () => typeof navigator !== "undefined" && navigator.webdriver;

// One bridge for the page: it has no destroy, and it reports components an earlier story removed as
// offPage, which the check below ignores.
let bridge: ReturnType<typeof createAgent> | undefined;

/** Unnamed or missing controls in an agent snapshot, as messages; empty when the snapshot is good. */
export function agentProblems(entries: readonly { ref: string; component: string; label?: string; offPage?: boolean }[]): string[] {
  const onPage = entries.filter((e) => !e.offPage && e.component !== "more");
  if (onPage.length === 0) return ["the agent snapshot found no ui-sdk control on the page"];
  return onPage.filter((e) => !e.label).map((e) => `${e.component} ${e.ref} has no name, so an agent can't find it`);
}

export async function runAccessibilityChecks(tags: readonly string[] | undefined, root: unknown): Promise<void> {
  if (!underTest()) return;
  const patterns = patternsFromTags(tags);
  if (patterns.length > 0) {
    // `parameters.patternRoot` (a CSS selector) narrows where the check looks; by default the whole
    // body, because dialogs and menus render outside the story's canvas.
    const element =
      typeof root === "string" ? document.querySelector<HTMLElement>(root) : (document.body as HTMLElement);
    if (!element) throw new Error(`patternRoot "${String(root)}" matched nothing`);
    for (const pattern of patterns) await checkPattern(element, pattern as Pattern);
  }
  if ((tags ?? []).includes("agent")) {
    bridge ??= createAgent();
    const problems = agentProblems(bridge.snapshot());
    if (problems.length > 0) throw new Error(`Agent test:\n- ${problems.join("\n- ")}`);
  }
}
