// AVE-22: every control a phone user can reach must take a 44 x 44px tap.
//
// The `touch` story-test project runs the stories with a coarse pointer (Playwright's hasTouch), and after each
// story this taps, in effect, a grid of points over the 44 x 44px square centred on every enabled control (or the
// control's own box, where that is bigger). Each point must land on that control: on the control itself, inside
// it, or on a label that belongs to it. That one measure catches both failures the card names: a hit area under
// 44px (the point lands on the page around it) and two hit areas that overlap (the point lands on the neighbour).
//
// It hit-tests with document.elementFromPoint, the same test the browser runs for a real tap, so it measures what
// the shared hit-area rule (src/lib/hit-area.ts) actually produced, not what its classes say.

export const TOUCH_TARGET = 44;

/**
 * What a person can tap: native controls, links, and every ARIA widget role ui-sdk gives a part. Only Avenue's and
 * ui-sdk's parts are measured (they all carry data-slot); a plain <button> a story adds as scaffolding, such as a
 * "before the group" focus probe, is not an Avenue control.
 */
const CONTROL_ROLES = [
  "button",
  "a[href]",
  "input:not([type=hidden])",
  "select",
  "textarea",
  "summary",
  ...[
    "button",
    "link",
    "checkbox",
    "switch",
    "radio",
    "tab",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
    "option",
    "slider",
    "combobox",
    "spinbutton",
    "textbox",
  ].map((role) => `[role=${role}]`),
];
const CONTROL_SELECTOR = CONTROL_ROLES.map((selector) => `${selector}[data-slot]`).join(", ");

/** Story groups whose stories are measured: the components and the composites built from them. */
export const MEASURED_TITLES = ["Components/", "Composites/"];

export interface TouchProblem {
  control: string;
  size: string;
  missed: number;
  sampled: number;
  landedOn: string[];
}

function describe(el: Element): string {
  const name =
    el.getAttribute("aria-label") ??
    (el instanceof HTMLElement ? el.innerText.trim().split("\n")[0]?.slice(0, 40) : "") ??
    "";
  const slot = el.getAttribute("data-slot");
  const role = el.getAttribute("role");
  return `<${el.tagName.toLowerCase()}${slot ? ` data-slot="${slot}"` : ""}${role ? ` role="${role}"` : ""}>${name ? ` "${name}"` : ""}`;
}

/** Disabled, hidden, inert or visually-hidden controls can't be tapped, so they aren't measured. */
function isTappable(el: HTMLElement): boolean {
  if (el.matches(":disabled, [aria-disabled=true], [data-disabled]")) return false;
  if (el.closest("[inert], [aria-hidden=true]")) return false;
  const style = getComputedStyle(el);
  if (style.visibility === "hidden" || style.display === "none" || style.pointerEvents === "none") return false;
  const rect = el.getBoundingClientRect();
  // Visually-hidden form inputs that mirror a ui-sdk part (1px, clipped) are not what a finger hits.
  if (rect.width <= 2 || rect.height <= 2) return false;
  if (style.clipPath !== "none" && style.clipPath.startsWith("inset(50%")) return false;
  return true;
}

/** A point "lands on" a control when it hits the control, something inside it, or a label that names it. */
function landsOn(hit: Element | null, control: HTMLElement): boolean {
  if (!hit) return false;
  if (hit === control || control.contains(hit)) return true;
  const label = hit.closest("label");
  if (label && (label.control === control || label.contains(control) || label.htmlFor === control.id)) return true;
  const labelledBy = control.getAttribute("aria-labelledby")?.split(/\s+/) ?? [];
  // ui-sdk's Field labels its control by id and forwards a press on the label to it.
  return labelledBy.some((id) => {
    const labelEl = document.getElementById(id);
    return labelEl?.tagName === "LABEL" && (labelEl === hit || labelEl.contains(hit));
  });
}

/**
 * An open popup (menu, popover, tooltip, dialog) drawn over part of a control is meant to cover it, so a point on a
 * popup the control isn't inside is not a miss. A point on the popup the control sits in still counts: that is a
 * menu item's own row, and its neighbours.
 */
const POPUP = "[role=menu], [role=listbox], [role=dialog], [role=alertdialog], [role=tooltip], [data-slot$=-arrow]";
function coveredByOtherPopup(hit: Element | null, control: HTMLElement): boolean {
  const popup = hit?.closest(POPUP);
  return !!popup && !popup.contains(control);
}

/**
 * Points on a 5 x 5 grid over the area: its edges, centre lines and quarter lines, without the four corners (21
 * points). A fingertip is round, and a rounded control's own corner isn't part of it, so the corners would count
 * the control's radius as a miss. Edge points sit 1.5px in: the extension is sized from the control's padding box,
 * so a 1px border leaves a 1px sliver along it, and no tap is that precise.
 */
const EDGE = 1.5;
function samplePoints(left: number, top: number, width: number, height: number): [number, number][] {
  const steps = [0, 0.25, 0.5, 0.75, 1];
  const points: [number, number][] = [];
  for (const fx of steps) {
    for (const fy of steps) {
      if ((fx === 0 || fx === 1) && (fy === 0 || fy === 1)) continue;
      const x = Math.min(Math.max(left + fx * width, left + EDGE), left + width - EDGE);
      const y = Math.min(Math.max(top + fy * height, top + EDGE), top + height - EDGE);
      points.push([x, y]);
    }
  }
  return points;
}

/** Measures every tappable control under `root`; returns the ones a 44px tap can miss. */
export function touchTargetProblems(root: ParentNode = document.body): TouchProblem[] {
  const problems: TouchProblem[] = [];
  const controls = [...root.querySelectorAll<HTMLElement>(CONTROL_SELECTOR)].filter(isTappable);
  for (const control of controls) {
    // Nested matches (an <a role=button> inside a <button>) are measured once, as the outer control.
    if (controls.some((other) => other !== control && other.contains(control))) continue;
    control.scrollIntoView({ block: "center", inline: "center" });
    const rect = control.getBoundingClientRect();
    const width = Math.max(rect.width, TOUCH_TARGET);
    const height = Math.max(rect.height, TOUCH_TARGET);
    const left = rect.left + rect.width / 2 - width / 2;
    const top = rect.top + rect.height / 2 - height / 2;
    const points = samplePoints(left, top, width, height);
    const missedOn = new Set<string>();
    let missed = 0;
    for (const [x, y] of points) {
      // Past the screen's edge there is nothing to tap, and a finger stops at the edge: not a miss.
      if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
      const hit = document.elementFromPoint(x, y);
      if (landsOn(hit, control)) continue;
      if (coveredByOtherPopup(hit, control)) continue;
      missed += 1;
      missedOn.add(hit ? describe(hit) : "outside the page");
    }
    if (missed > 0) {
      problems.push({
        control: describe(control),
        size: `${Math.round(rect.width)} x ${Math.round(rect.height)}px`,
        missed,
        sampled: points.length,
        landedOn: [...missedOn],
      });
    }
  }
  return problems;
}

export function formatTouchProblems(problems: readonly TouchProblem[]): string {
  return problems
    .map(
      (p) =>
        `${p.control} (${p.size}): ${p.missed} of ${p.sampled} taps in its ${TOUCH_TARGET} x ${TOUCH_TARGET}px area missed it, landing on ${p.landedOn.join(", ")}`,
    )
    .join("\n- ");
}

/**
 * Runs after every story in the `touch` project. Fails when the browser isn't actually emulating a coarse pointer
 * (so a broken setup can't pass silently), or when any control's tap area is short or overlaps another's.
 */
export function runTouchTargetCheck(pointer: unknown, title: string): void {
  if (pointer !== "coarse") return;
  if (!matchMedia("(pointer: coarse)").matches) {
    throw new Error("Touch target check: the touch project is running without a coarse pointer (hasTouch is off).");
  }
  if (!MEASURED_TITLES.some((prefix) => title.startsWith(prefix))) return;
  const problems = touchTargetProblems();
  if (problems.length > 0) {
    throw new Error(`Touch targets under ${TOUCH_TARGET} x ${TOUCH_TARGET}px on a phone:\n- ${formatTouchProblems(problems)}`);
  }
}
