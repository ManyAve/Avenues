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
export const CONTROL_SELECTOR = CONTROL_ROLES.map((selector) => `${selector}[data-slot]`).join(", ");

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
 * popup the control isn't inside is not a miss. A point on the popup the control sits in still counts: that is a menu
 * item's own row, and its neighbours.
 */
const POPUP = "[role=menu], [role=listbox], [role=dialog], [role=alertdialog], [role=tooltip], [data-slot$=-arrow]";
/**
 * The layer a modal lays over the page: its backdrop, and the full-screen viewport around a sheet (the drawer's, and a
 * Select's or Combobox's presenting as a sheet, AVE-39). It covers
 * the controls behind the modal, so a point on it is not a miss for them, even before ui-sdk has made the page behind
 * inert (the Drawer's Bottom on desktop story flaked on that timing, AVE-67). For a control inside a dialog it is a
 * miss: the control's 44px area runs past the dialog's edge, where a tap closes the dialog (AVE-65).
 */
const MODAL_LAYER =
  "[data-slot$=-backdrop], [data-slot=drawer-viewport], [data-slot=select-viewport], [data-slot=combobox-viewport]";
const MODAL = "[role=dialog], [role=alertdialog]";
function coveredByOtherPopup(hit: Element | null, control: HTMLElement): boolean {
  if (!hit) return false;
  const popup = hit.closest(POPUP);
  if (popup) return !popup.contains(control);
  // A sheet's own viewport holds the sheet (a Select or Combobox list is a listbox, not a dialog): for a control in
  // that sheet a point on the viewport is past the sheet's edge, so it is a miss like a dialog's backdrop.
  const layer = hit.closest(MODAL_LAYER);
  return !!layer && !layer.contains(control) && !control.closest(MODAL);
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
    // Bring a control that is scrolled out of sight (off the screen, or under a scroll container's edge or a sticky
    // footer) into view, but leave one a finger can already reach where it is: scrolling that to the centre also
    // scrolls the container it sits in (a dialog's body), which can move it away from an edge its 44px area runs past
    // and hide the miss (AVE-65).
    const placed = control.getBoundingClientRect();
    if (!landsOn(document.elementFromPoint(placed.left + placed.width / 2, placed.top + placed.height / 2), control)) {
      control.scrollIntoView({ block: "center", inline: "center" });
    }
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

/**
 * Mouse minimums (UX Engineer, AVE-22): the reach a control had before the shared rule, kept so a later change can't
 * quietly shrink it. Each is the extension past the control's padding box on each side, [x, y]; every other control
 * needs at least 24 x 24px (WCAG 2.2 target size). Selectors name the control by its data-slot.
 */
export const FINE_MINIMUMS: readonly { selector: string; extend: readonly [number, number]; why: string }[] = [
  { selector: "[data-slot=checkbox]", extend: [12, 8], why: "a register row checkbox has no visible label to click" },
  { selector: "[data-slot=switch]", extend: [12, 8], why: "as before AVE-22" },
  { selector: "[data-slot=radio]", extend: [12, 8], why: "as Checkbox: a radio's reach past its 16px dot" },
  {
    selector: "[data-slot=dialog-close], [data-slot=drawer-close]",
    extend: [8, 8],
    why: "the 24px close button (Dialog, Drawer) keeps a 40px reach",
  },
  { selector: "[data-slot=toast-action]", extend: [8, 8], why: "the toast's text action keeps its 8px reach" },
  { selector: "[data-slot=tooltip-trigger][aria-label]", extend: [8, 8], why: "the 16px help button keeps a 32px reach" },
];
export const FINE_FLOOR = 24;

/** The box a pointer can hit: the control's own box, or its hit-area ::after where that is bigger, in each direction. */
function hitBox(control: HTMLElement): { width: number; height: number } {
  const rect = control.getBoundingClientRect();
  const after = getComputedStyle(control, "::after");
  if (after.content === "none" || after.position !== "absolute") return { width: rect.width, height: rect.height };
  return {
    width: Math.max(rect.width, parseFloat(after.width) || 0),
    height: Math.max(rect.height, parseFloat(after.height) || 0),
  };
}

/**
 * With a mouse (the four fine-pointer projects): every control's hit box is at least 24 x 24px, and the controls in
 * FINE_MINIMUMS keep their reach. Sizes only: desktop galleries may let reaches touch, as they did before.
 */
export function fineTargetProblems(root: ParentNode = document.body): string[] {
  const problems: string[] = [];
  for (const control of root.querySelectorAll<HTMLElement>(CONTROL_SELECTOR)) {
    if (!isTappable(control)) continue;
    const box = hitBox(control);
    const rule = FINE_MINIMUMS.find((r) => control.matches(r.selector));
    // The extension is measured from the padding box (inside the border), as `after:-inset-*` was before.
    const needWidth = rule ? control.clientWidth + 2 * rule.extend[0] : FINE_FLOOR;
    const needHeight = rule ? control.clientHeight + 2 * rule.extend[1] : FINE_FLOOR;
    if (box.width + 0.5 < needWidth || box.height + 0.5 < needHeight) {
      problems.push(
        `${describe(control)}: hit area ${Math.round(box.width)} x ${Math.round(box.height)}px, needs ${Math.round(needWidth)} x ${Math.round(needHeight)}px${rule ? ` (${rule.why})` : " (WCAG 2.2 target size)"}`,
      );
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
