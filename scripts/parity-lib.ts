/**
 * The pure half of `bun run parity` (AVE-10): the pair map's types, the style comparison and the verdict.
 * scripts/parity.ts does the building and the capturing; this file has no I/O, so scripts/parity.test.ts can
 * test every way a pair can pass or fail without a browser.
 */

/** A difference the pair map allows between the app's capture and Avenue's. */
export interface Allowance {
  /**
   * The property that may differ: a computed-style name, `height`, `width`, or `parts` (a part on one side
   * only). `*` matches any run of letters and dashes: `padding-*`, `border-*-radius`.
   */
  prop: string;
  /** Which part (`root`, or a part name as the report shows it); default: any. */
  where?: string;
  /** The app's value, when only that exact change is allowed. */
  app?: string;
  /** Avenue's value, when only that exact change is allowed. */
  avenue?: string;
  /**
   * Why, in one of three forms:
   * - `AVE-2 §<n>: …` an agreed fix: a spacing or corner rule Zack asked for. Two other merged design
   *   decisions count as agreed: `AVE-13: …` (dark colours raised to reach 4.5:1 contrast), `AVE-29: …`
   *   (control text is 14px from 768px up on both type scales) and `AVE-8: …` (the UI Designer's check on a
   *   selected chip, for WCAG 1.4.1).
   * - `AVE-<id>: …` a filed bug: the run passes while it is open, and the report lists it as known.
   * - `app: <file>: …` the app's story, not its component, draws this: the screen passes its own classes to
   *   the primitive (a card's shadow, a dialog's sections), so Avenue's component doesn't need to match it,
   *   and the screen keeps those classes when it moves to Avenue. Name the app file that adds them.
   */
  because: string;
}

/** One comparison: an app story, an Avenue story, and what in each to capture. */
export interface Pair {
  /** The app story id, from the app Storybook's index.json. */
  app: string;
  /** Playwright selector for the element to capture in the app story (default: the story root's first child). */
  appCrop?: string;
  /** Playwright selector for the element to capture in the Avenue story. */
  avenueCrop?: string;
  /** Storybook args for the Avenue story, `key:value;key:value`, so it can show the app's text. */
  avenueArgs?: string;
  /** What this pair checks, in a few words; shown in the report. */
  label?: string;
  /** Compare the captured element alone, without its height: for containers whose size follows their content. */
  frame?: boolean;
  /** Leave focus where the story put it: for a tooltip, which focus holds open. */
  keepFocus?: boolean;
  allow?: Allowance[];
}

/** An Avenue story with nothing in the app to compare with. The reason needs UI Designer sign-off on AVE-10. */
export interface Unpaired {
  none: string;
}

export type PairEntry = Pair[] | Unpaired;

export const COMBOS = [
  { theme: "light", typeScale: "web" },
  { theme: "dark", typeScale: "web" },
  { theme: "light", typeScale: "desktop" },
  { theme: "dark", typeScale: "desktop" },
] as const;
export type Combo = (typeof COMBOS)[number];

export function comboName(c: Combo): string {
  return `${c.theme}-${c.typeScale}`;
}

/**
 * The computed-style properties compared on the captured element and each of its visible parts: everything
 * that sets how a part looks. Size comes from the part's box, not from here: its height always, its width
 * only when both captures show the same text (otherwise the width just follows the text).
 */
export const STYLE_PROPS = [
  "display",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "border-top-color",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-bottom-right-radius",
  "border-bottom-left-radius",
  "background-color",
  "color",
  "font-family",
  "font-size",
  "font-weight",
  "line-height",
  "letter-spacing",
  "box-shadow",
  "opacity",
  "column-gap",
  "row-gap",
] as const;

const TYPE_PROPS = new Set(["font-family", "font-size", "font-weight", "line-height", "letter-spacing"]);
const BORDER_WIDTHS = ["border-top-width", "border-right-width", "border-bottom-width", "border-left-width"];

/** One visible part of a captured element (the element itself first), as the browser computed it. */
export interface Part {
  tag: string;
  slot: string | null;
  /** The part's own text, not its children's. */
  text: string;
  width: number;
  height: number;
  style: Record<string, string>;
}

export interface Difference {
  /** Which part: `root`, or `<slot or tag> <n>`. */
  where: string;
  prop: string;
  app: string;
  avenue: string;
  /** The allowance that covers it, if any. */
  because?: string;
}

function norm(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** A value as it looks: a shadow of only transparent layers is no shadow, `normal` gap is 0. */
export function looks(prop: string, value: string): string {
  const v = norm(value);
  if (prop === "box-shadow") {
    const layers = v.split(/,(?![^(]*\))/).map((l) => l.trim());
    const seen = layers.filter((l) => l !== "none" && !/^rgba\([^)]*,\s*0\)/.test(l) && !/^transparent/.test(l));
    return seen.length === 0 ? "none" : seen.join(", ");
  }
  if ((prop === "column-gap" || prop === "row-gap") && v === "normal") return "0px";
  // Pills: any corner of 9999px or more renders as a full pill, whatever the exact number.
  if (prop.endsWith("-radius")) {
    const px = Number.parseFloat(v);
    if (px >= 9999) return "pill";
  }
  return v;
}

const flexOrGrid = (p: Part) => /flex|grid/.test(p.style["display"] ?? "");
const bordered = (p: Part) => BORDER_WIDTHS.some((b) => Number.parseFloat(p.style[b] ?? "0") > 0);
const multiLine = (p: Part) => p.height > 1.6 * (Number.parseFloat(p.style["line-height"] ?? "") || p.height);

/** Whether `prop` affects how this pair of parts looks, so a difference in it is worth reporting. */
function matters(prop: string, a: Part, b: Part): boolean {
  if (prop === "display") return false;
  if (prop === "column-gap" || prop === "row-gap") return flexOrGrid(a) || flexOrGrid(b);
  if (prop === "border-top-color") return bordered(a) || bordered(b);
  const hasText = a.text !== "" || b.text !== "";
  if (TYPE_PROPS.has(prop)) return hasText;
  if (prop === "color") return hasText || a.tag === "svg" || b.tag === "svg";
  return true;
}

/** ui-sdk and Base UI name some of the same parts differently; this maps both to one name for matching. */
const SLOT_ALIASES: Record<string, string> = {
  "dropdown-menu-content": "menu-content",
  "dropdown-menu-item": "menu-item",
  "dropdown-menu-label": "menu-group-label",
  "dropdown-menu-group": "menu-group",
  "dropdown-menu-separator": "menu-separator",
  "toggle-group": "segmented-control",
  "toggle-group-item": "segmented-control-item",
  "dialog-overlay": "dialog-backdrop",
};
const slotName = (p: Part) => (p.slot ? (SLOT_ALIASES[p.slot] ?? p.slot) : null);
const label = (p: Part) => slotName(p) ?? p.tag;

/**
 * Pairs each app part with an Avenue part: the roots with each other, then by data-slot name, then by tag and
 * text, then by tag in order. Returns the matched pairs and the parts left over on each side.
 */
export function matchParts(app: Part[], avenue: Part[]): { pairs: [Part, Part][]; appOnly: Part[]; avenueOnly: Part[] } {
  const pairs: [Part, Part][] = [];
  if (app.length === 0 || avenue.length === 0) return { pairs, appOnly: app, avenueOnly: avenue };
  pairs.push([app[0]!, avenue[0]!]);
  const free = new Set(avenue.slice(1));
  const appOnly: Part[] = [];
  const take = (pred: (b: Part) => boolean) => {
    const hit = [...free].find(pred);
    if (hit) free.delete(hit);
    return hit;
  };
  for (const a of app.slice(1)) {
    const hit =
      (slotName(a) ? take((b) => slotName(b) === slotName(a)) : undefined) ??
      take((b) => !slotName(b) && b.tag === a.tag && b.text === a.text) ??
      take((b) => !slotName(b) && !slotName(a) && b.tag === a.tag);
    if (hit) pairs.push([a, hit]);
    else appOnly.push(a);
  }
  return { pairs, appOnly, avenueOnly: [...free] };
}

/**
 * Every visible difference between the two captures, part by part. `frame` compares the root alone and not
 * its height: for containers (cards, dialogs, panels) whose size and contents follow what the story puts in them.
 */
export function styleDifferences(app: Part[], avenue: Part[], sameText: boolean, frame = false): Difference[] {
  const out: Difference[] = [];
  const { pairs, appOnly, avenueOnly } = frame
    ? { pairs: [[app[0]!, avenue[0]!] as [Part, Part]], appOnly: [], avenueOnly: [] }
    : matchParts(app, avenue);
  if (appOnly.length + avenueOnly.length > 0) {
    const list = (ps: Part[]) => (ps.length ? ps.map(label).join(", ") : "none");
    out.push({ where: "root", prop: "parts", app: `only here: ${list(appOnly)}`, avenue: `only here: ${list(avenueOnly)}` });
  }
  const counts = new Map<string, number>();
  for (const [i, [a, b]] of pairs.entries()) {
    const name = label(b);
    const n = (counts.get(name) ?? 0) + 1;
    counts.set(name, n);
    const where = i === 0 ? "root" : `${name} ${n}`;
    for (const prop of STYLE_PROPS) {
      if (!matters(prop, a, b)) continue;
      // A frame is its box: border, corners, fill, padding, shadow. How it lays out its contents is the story's.
      if (frame && (prop === "column-gap" || prop === "row-gap")) continue;
      const av = looks(prop, a.style[prop] ?? "");
      const bv = looks(prop, b.style[prop] ?? "");
      if (av !== bv) out.push({ where, prop, app: av, avenue: bv });
    }
    const textFollows = !sameText && (multiLine(a) || multiLine(b));
    if (!(frame && i === 0) && !textFollows && Math.round(a.height) !== Math.round(b.height)) {
      out.push({ where, prop: "height", app: `${Math.round(a.height)}px`, avenue: `${Math.round(b.height)}px` });
    }
    if (sameText && !frame && Math.round(a.width) !== Math.round(b.width)) {
      out.push({ where, prop: "width", app: `${Math.round(a.width)}px`, avenue: `${Math.round(b.width)}px` });
    }
  }
  return out;
}

function covers(allowance: Allowance, d: Difference): boolean {
  const glob = new RegExp(`^${allowance.prop.split("*").map((x) => x.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join("[\\w-]*")}$`);
  if (!glob.test(d.prop)) return false;
  if (allowance.where !== undefined && allowance.where !== d.where) return false;
  if (allowance.app !== undefined && looks(d.prop, allowance.app) !== d.app) return false;
  if (allowance.avenue !== undefined && looks(d.prop, allowance.avenue) !== d.avenue) return false;
  return true;
}

export function isAgreedFix(because: string): boolean {
  return /^AVE-2 §\d/.test(because) || /^AVE-(8|13|29):/.test(because);
}

export function isAppLocal(because: string): boolean {
  return /^app: \S+\.tsx?\b/.test(because);
}

export function isKnownBug(because: string): boolean {
  return /^AVE-(?!2 )\d+\b/.test(because) && !isAgreedFix(because);
}

/** Marks each difference with the allowance that explains it. */
export function explain(diffs: Difference[], allow: Allowance[] = []): Difference[] {
  return diffs.map((d) => {
    const hit = allow.find((a) => covers(a, d));
    return hit ? { ...d, because: hit.because } : d;
  });
}

export type Verdict = "same" | "agreed-fix" | "app-local" | "known-bug" | "unexplained" | "error";

/**
 * A pair's verdict in one combination. `pixelsDiffer` is only meaningful when both captures show the same
 * text: pixels that differ while every compared style matches are still unexplained.
 */
export function verdict(all: Difference[], pixelsDiffer: boolean, sameText = false): Verdict {
  // Same text and not one pixel different: a part that exists on one side only (a wrapping span) shows nothing.
  const diffs = sameText && !pixelsDiffer ? all.filter((d) => d.prop !== "parts") : all;
  if (diffs.some((d) => d.because === undefined)) return "unexplained";
  if (diffs.length === 0) return pixelsDiffer ? "unexplained" : "same";
  if (diffs.some((d) => isKnownBug(d.because!))) return "known-bug";
  if (diffs.some((d) => isAppLocal(d.because!))) return "app-local";
  return "agreed-fix";
}

/** Problems in the pair map itself: stories with no entry, entries for stories that don't exist, bad reasons. */
export function mapProblems(map: Record<string, PairEntry>, avenueStories: string[], appStories: string[]): string[] {
  const problems: string[] = [];
  const app = new Set(appStories);
  const avenue = new Set(avenueStories);
  for (const id of avenueStories) {
    if (!(id in map)) problems.push(`${id} has no pair and no recorded reason`);
  }
  for (const [id, entry] of Object.entries(map)) {
    if (!avenue.has(id)) problems.push(`${id} is in the pair map but isn't an Avenue story`);
    if (Array.isArray(entry)) {
      if (entry.length === 0) problems.push(`${id} has an empty pair list`);
      for (const pair of entry) {
        if (!app.has(pair.app)) problems.push(`${id} pairs with ${pair.app}, which isn't an app story`);
        for (const a of pair.allow ?? []) {
          if (!isAgreedFix(a.because) && !isKnownBug(a.because) && !isAppLocal(a.because)) {
            problems.push(`${id}: allowance for ${a.prop} must start "AVE-2 §<n>:", "AVE-8:", "AVE-13:", "AVE-29:", "AVE-<id>:" or "app: <file>:", not "${a.because}"`);
          }
        }
      }
    } else if (entry.none.trim().length < 20) {
      problems.push(`${id} is unpaired without a written reason`);
    }
  }
  return problems;
}

/** The Avenue stories the map must cover: every component and composite story. */
export function storiesToPair(ids: string[]): string[] {
  return ids.filter((id) => id.startsWith("components-") || id.startsWith("composites-")).sort();
}

/** The `:root { … }` custom properties in a stylesheet's first `:root` block, by name. */
export function rootVariables(css: string): Record<string, string> {
  const block = /:root\s*\{([^}]*)\}/.exec(css.replace(/\/\*[\s\S]*?\*\//g, ""));
  const out: Record<string, string> = {};
  for (const m of block?.[1]?.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g) ?? []) out[m[1]!] = m[2]!.trim();
  return out;
}

/**
 * Whether two captures started at the same sub-pixel offset. Chrome shades a curved edge from where the element
 * really sits, so the same switch at y = 32.0 and y = 467.8 differs by a few edge pixels with every style equal.
 */
export function sameOffset(a: [number, number], b: [number, number]): boolean {
  return Math.abs(a[0] - b[0]) < 0.01 && Math.abs(a[1] - b[1]) < 0.01;
}
