// AVE-92: two controls an agent can't tell apart by name.
//
// ui-sdk's agent bridge finds a control by whole words in its name, regardless of case, accents and order
// (node_modules/@ui-sdk/react/docs/agents.md, "Name a component"), and fails a step whose words fit two controls.
// So mirrored names such as "A–Z" and "Z–A", or "High–low" and "Low–high", are one name to an agent, though they
// read as two to a person (AVE-79). After each Components or Composites story this collects the name of every
// control, enabled or not, in each open popup and in the page, reduces each to its words, and fails when two
// different names reduce to the same words in one place.
//
// Names that are exactly the same (a Remove button on every row) are left alone: the bridge tells those apart by
// their row text, and a story shows them on purpose.
import { CONTROL_SELECTOR, MEASURED_TITLES } from "./touch-targets";

/** The words of a name, as the bridge compares them: lowercase, accents and punctuation dropped, in sorted order. */
export function nameWords(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu)
      ?.sort()
      .join(" ") ?? ""
  );
}

/** The name as written, with only case and spacing evened out, to tell a repeated name from a mirrored one. */
function written(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

export interface NamedControl {
  /** Where the control sits, said for a person: an open popup's role and name, or "the page". */
  scope: string;
  /** Tells apart two popups that read the same; defaults to `scope`. */
  scopeKey?: string;
  name: string;
}

/** Pairs of different names in one scope that an agent reads as the same words, as messages; empty when none. */
export function nameClashes(controls: readonly NamedControl[]): string[] {
  const groups = new Map<string, Set<string>>();
  const said = new Map<string, string>();
  for (const { scope, scopeKey = scope, name } of controls) {
    const words = nameWords(name);
    if (!words) continue;
    const key = `${scopeKey}\u0000${words}`;
    said.set(scopeKey, scope);
    const names = groups.get(key) ?? new Set<string>();
    if (![...names].some((n) => written(n) === written(name))) names.add(name);
    groups.set(key, names);
  }
  const out: string[] = [];
  for (const [key, names] of groups) {
    if (names.size < 2) continue;
    const scope = said.get(key.split("\u0000")[0]!)!;
    const list = [...names].map((n) => `"${n}"`).join(" and ");
    out.push(`${list} in ${scope} are the same words to an agent; make them differ by a word (AGENTS.md rule 9)`);
  }
  return out;
}

const POPUP = "[role=menu], [role=listbox], [role=dialog], [role=alertdialog], [popover]";

function text(el: Element | null): string {
  return el instanceof HTMLElement ? el.innerText : (el?.textContent ?? "");
}

/** The accessible name, enough for Avenue's controls: aria-labelledby, aria-label, a label, then the text inside. */
export function controlName(el: HTMLElement): string {
  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    const name = labelledBy
      .split(/\s+/)
      .map((id) => text(document.getElementById(id)))
      .join(" ")
      .trim();
    if (name) return name;
  }
  const label = el.getAttribute("aria-label")?.trim();
  if (label) return label;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    const labels = [...(el.labels ?? [])].map(text).join(" ").trim();
    if (labels) return labels;
    return el.getAttribute("placeholder")?.trim() ?? "";
  }
  return text(el).replace(/\s+/g, " ").trim();
}

// Disabled controls count too: the bridge lists them in its snapshot (with `disabled: true`) and still matches them by
// name, so a disabled "A–Z" makes an enabled "Z–A" ambiguous.
function shown(el: HTMLElement): boolean {
  if (el.closest("[inert], [aria-hidden=true]")) return false;
  const style = getComputedStyle(el);
  return style.display !== "none" && style.visibility !== "hidden";
}

function describeScope(popup: Element | null): string {
  if (!popup) return "the page";
  const role = popup.getAttribute("role") ?? popup.getAttribute("data-slot") ?? "popup";
  const name = popup.getAttribute("aria-label") ?? text(document.getElementById(popup.getAttribute("aria-labelledby") ?? ""));
  return name ? `the ${role} "${name.trim()}"` : `a ${role}`;
}

/** Every shown control's name, with the open popup it sits in. */
export function namedControls(root: ParentNode = document.body): NamedControl[] {
  const popups: (Element | null)[] = [];
  return [...root.querySelectorAll<HTMLElement>(CONTROL_SELECTOR)].filter(shown).map((el) => {
    const popup = el.closest(POPUP);
    if (!popups.includes(popup)) popups.push(popup);
    // Two popups that read the same are still two places.
    return { scope: describeScope(popup), scopeKey: String(popups.indexOf(popup)), name: controlName(el) };
  });
}

export function runNameClashCheck(title: string): void {
  if (typeof navigator === "undefined" || !navigator.webdriver) return;
  if (!MEASURED_TITLES.some((prefix) => title.startsWith(prefix))) return;
  const problems = nameClashes(namedControls());
  if (problems.length > 0) throw new Error(`Control names an agent can't tell apart:\n- ${problems.join("\n- ")}`);
}
