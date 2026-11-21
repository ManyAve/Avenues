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
   *   selected chip, for WCAG 1.4.1). Each parity card closed by keeping Avenue's look counts too, for the
   *   UI Designer to confirm after the merge: `AVE-58: …` (the disclosure trigger is a sized, focusable button),
   *   `AVE-70: …` (the page title keeps the heading token's line) and `AVE-72: …` (the inline message keeps its icon).
   *   Three UI Designer decisions from the after-merge reviews count too: `AVE-78: …` (the sorted column shows its
   *   direction), `AVE-84: …` (picker icons follow the control size) and `AVE-89: …` (an inline message is a field
   *   error's size). `AVE-50: …` (the chosen segment carries a check, as the chip does) counts too, and so does
   *   `AVE-99: …` (in dark an outline button's fill is the card's surface, not the darker page), and `AVE-117: …`
   *   (Tabs scroll inside their list, so each tab keeps room for its focus ring there).
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
  /**
   * The app commit to compare with, for a part the app first drew after APP_BASELINE (scripts/parity-pairs.ts), so it
   * has no look from before Avenue. Pin a commit where the app still draws the captured element itself, never one
   * where it draws Avenue's (AVE-141), and say why.
   */
  at?: { commit: string; why: string };
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
  "font-style",
  "text-decoration-line",
  "text-transform",
  // Lined-up digits (tabular-nums) change a number's width without changing its size (AVE-216).
  "font-variant-numeric",
  // Read from a field's ::placeholder, not getPropertyValue; empty on anything that isn't a field (AVE-216).
  "placeholder-color",
  "box-shadow",
  "outline-style",
  "outline-width",
  "transform",
  "fill",
  "stroke",
  "opacity",
  "column-gap",
  "row-gap",
] as const;

const TYPE_PROPS = new Set([
  "font-family",
  "font-size",
  "font-weight",
  "line-height",
  "letter-spacing",
  "font-style",
  "text-decoration-line",
  "text-transform",
  "font-variant-numeric",
]);
const BORDER_WIDTHS = ["border-top-width", "border-right-width", "border-bottom-width", "border-left-width"];

/** One visible part of a captured element (the element itself first), as the browser computed it. */
export interface Part {
  /** Its place in the capture's part list, also written on the element as `data-parity-i`. */
  index?: number;
  tag: string;
  slot: string | null;
  /** An icon's drawing (AVE-77): its lucide name, or a short signature of its shapes. Only on an svg. */
  glyph?: string;
  /** An icon's inner markup, so an allowed icon can be drawn on the other side before pixels judge. Only on an svg. */
  markup?: string;
  /** The part's own text, not its children's. */
  text: string;
  /** A field's value and placeholder (AVE-77): text a field shows that isn't a text node. */
  value?: string;
  placeholder?: string;
  /** How the part sets its text in its box (AVE-77). Not compared; it decides whether Avenue's root may take the app's width. */
  align?: string;
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
  /** The parts it was found on (Part.index), so an allowed value can be applied to the app's part (AVE-77). */
  appIndex?: number;
  avenueIndex?: number;
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
  // Only two fields that both show a placeholder have one to compare (AVE-216).
  if (prop === "placeholder-color") return !!a.placeholder && !!b.placeholder;
  if (prop === "column-gap" || prop === "row-gap") return flexOrGrid(a) || flexOrGrid(b);
  if (prop === "border-top-color") return bordered(a) || bordered(b);
  if (prop === "outline-width") return [a, b].some((p) => (p.style["outline-style"] ?? "none") !== "none");
  // A field's value and placeholder are text too, though not a text node (AVE-77).
  const hasText = [a, b].some((p) => p.text !== "" || !!p.value || !!p.placeholder);
  if (TYPE_PROPS.has(prop)) return hasText;
  if (prop === "color") return hasText || a.tag === "svg" || b.tag === "svg";
  // An icon's look: lucide draws with stroke = currentColor and no fill; a swapped or filled icon shows here.
  if (prop === "fill" || prop === "stroke") return a.tag === "svg" || b.tag === "svg";
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
      if (av !== bv) out.push({ where, prop, app: av, avenue: bv, ...indices(a, b) });
    }
    const textFollows = !sameText && (multiLine(a) || multiLine(b));
    if (!(frame && i === 0) && !textFollows && Math.round(a.height) !== Math.round(b.height)) {
      out.push({ where, prop: "height", app: `${Math.round(a.height)}px`, avenue: `${Math.round(b.height)}px`, ...indices(a, b) });
    }
    // An icon's width never follows text, so it is compared even where the texts differ.
    const icon = a.tag === "svg" && b.tag === "svg";
    // A different drawing is a different icon, whatever its size and colour (AVE-77).
    if (icon && a.glyph !== undefined && b.glyph !== undefined && a.glyph !== b.glyph) {
      out.push({ where, prop: "glyph", app: a.glyph, avenue: b.glyph, ...indices(a, b) });
    }
    if ((sameText || icon) && !frame && Math.round(a.width) !== Math.round(b.width)) {
      out.push({ where, prop: "width", app: `${Math.round(a.width)}px`, avenue: `${Math.round(b.width)}px`, ...indices(a, b) });
    }
  }
  return out;
}

function indices(a: Part, b: Part): Pick<Difference, "appIndex" | "avenueIndex"> {
  return { ...(a.index === undefined ? {} : { appIndex: a.index }), ...(b.index === undefined ? {} : { avenueIndex: b.index }) };
}

/** What to change on each side so pixels can judge what the allowances don't explain (AVE-77). */
export interface Reconciliation {
  /** Avenue's value of an allowed difference, set inline on the app's part. */
  styles: { index: number; prop: string; value: string }[];
  /** The app's own text for an Avenue part that shows different text. */
  texts: { index: number; text: string }[];
  /** The app's drawing for an Avenue icon whose different drawing is allowed. */
  icons: { index: number; markup: string }[];
  /** The app's value for an Avenue field (input, textarea) that shows a different one. */
  values?: { index: number; value: string; placeholder: string }[] | undefined;
  /**
   * A frame (AVE-77): both sides hide everything inside the root, and Avenue's root takes the app's size, so the
   * pixels judge the box alone: its border, corners, fill and shadow. Its contents are their own pairs.
   */
  frame?: { width: number; height: number } | undefined;
}

const BORDER_COLORS = ["border-top-color", "border-right-color", "border-bottom-color", "border-left-color"];

/**
 * Makes the two captures comparable pixel by pixel (AVE-77). Every allowed difference is a value Avenue chose on
 * purpose, so the app's part takes Avenue's value; every part that shows different text takes the app's text. Any
 * pixel still different after that is something no allowance explains. Height and width aren't set: they follow
 * from the rest. Returns null when there's nothing to do, or when a difference is unexplained already (the verdict is
 * decided without pixels then).
 */
export function reconcile(app: Part[], avenue: Part[], diffs: Difference[], frame = false): Reconciliation | null {
  if (diffs.some((d) => d.because === undefined)) return null;
  if (frame) {
    // Only the root is compared: its own allowed values go on the app's root, its contents are hidden on both sides.
    const root = app[0];
    if (!root || !avenue[0]) return null;
    const styles: Reconciliation["styles"] = [];
    for (const d of diffs) {
      if (d.appIndex !== 0 || d.avenueIndex !== 0 || !(STYLE_PROPS as readonly string[]).includes(d.prop)) continue;
      const value = avenue[0].style[d.prop];
      if (value === undefined) continue;
      for (const prop of d.prop === "border-top-color" ? BORDER_COLORS : [d.prop]) styles.push({ index: 0, prop, value });
    }
    return { styles, texts: [], icons: [], frame: { width: root.width, height: root.height } };
  }
  // A part on one side only (an agreed check icon, a wrapping span) can't be applied to the other side, and the scale
  // variables are the whole page's; pixels would only find what the allowance already says.
  if (diffs.some((d) => d.prop === "parts" || d.where === ":root")) return null;
  const byIndex = new Map(avenue.map((p) => [p.index, p]));
  const appByIndex = new Map(app.map((p) => [p.index, p]));
  const styles: Reconciliation["styles"] = [];
  const icons: Reconciliation["icons"] = [];
  for (const d of diffs) {
    if (d.appIndex === undefined || d.avenueIndex === undefined) continue;
    if (d.prop === "glyph") {
      const markup = appByIndex.get(d.appIndex)?.markup;
      if (markup !== undefined) icons.push({ index: d.avenueIndex, markup });
      continue;
    }
    if (!(STYLE_PROPS as readonly string[]).includes(d.prop)) continue;
    const value = byIndex.get(d.avenueIndex)?.style[d.prop];
    if (value === undefined) continue;
    // The capture reads one border colour for all four sides, so an allowed colour goes on all four.
    for (const prop of d.prop === "border-top-color" ? BORDER_COLORS : [d.prop]) styles.push({ index: d.appIndex, prop, value });
  }
  const texts: Reconciliation["texts"] = [];
  for (const [a, b] of matchParts(app, avenue).pairs) {
    if (b.index !== undefined && a.text !== b.text && a.text !== "" && b.text !== "") texts.push({ index: b.index, text: a.text });
  }
  const values: NonNullable<Reconciliation["values"]> = [];
  for (const [a, b] of matchParts(app, avenue).pairs) {
    if (b.index === undefined || a.value === undefined || b.value === undefined) continue;
    if (a.value !== b.value || a.placeholder !== b.placeholder) {
      values.push({ index: b.index, value: a.value, placeholder: a.placeholder ?? "" });
    }
  }
  return styles.length + texts.length + icons.length + values.length > 0 ? { styles, texts, icons, values } : null;
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
  return /^AVE-2 §\d/.test(because) || /^AVE-(8|13|29|50|58|70|72|78|84|89|99|117|120|130|162|183|186|208|210):/.test(because);
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
export function mapProblems(
  map: Record<string, PairEntry>,
  avenueStories: string[],
  appStories: string[] | ((pair: Pair) => string[]),
): string[] {
  const problems: string[] = [];
  const all = new Set(typeof appStories === "function" ? [] : appStories);
  const appHas = (pair: Pair) => (typeof appStories === "function" ? appStories(pair).includes(pair.app) : all.has(pair.app));
  const avenue = new Set(avenueStories);
  for (const id of avenueStories) {
    if (!(id in map)) problems.push(`${id} has no pair and no recorded reason`);
  }
  for (const [id, entry] of Object.entries(map)) {
    if (!avenue.has(id)) problems.push(`${id} is in the pair map but isn't an Avenue story`);
    if (Array.isArray(entry)) {
      if (entry.length === 0) problems.push(`${id} has an empty pair list`);
      for (const pair of entry) {
        if (!appHas(pair)) problems.push(`${id} pairs with ${pair.app}, which isn't an app story${pair.at ? ` at ${pair.at.commit.slice(0, 8)}` : ""}`);
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

/** The most edge pixels a sub-pixel offset may account for: a curved control's outline, not a changed glyph. */
export const SUBPIXEL_MAX = 32;

/**
 * Whether the pixel diff decides this comparison, and if not, why it was judged on styles only. Pixels decide
 * only where they can: the same text on both sides (else every glyph differs), not a frame (its contents are
 * their own pairs), and no style difference at all (an allowed padding or height change moves every pixel after
 * it, so changed pixels prove nothing either way). A few edge pixels from a different sub-pixel offset are
 * forgiven, up to SUBPIXEL_MAX.
 */
export function pixelJudgement(o: {
  sameText: boolean;
  frame: boolean;
  differences: Difference[];
  changed: number;
  subpixel: boolean;
}): { judged: true } | { judged: false; why: string } {
  if (o.frame) return { judged: false, why: "a frame: its contents are compared by their own pairs" };
  if (!o.sameText) return { judged: false, why: "the two show different text" };
  // A part on one side only (a wrapping span) is a difference only if it shows.
  if (o.differences.some((d) => d.prop !== "parts")) return { judged: false, why: "an allowed difference moves the pixels" };
  if (o.subpixel && o.changed > 0 && o.changed <= SUBPIXEL_MAX) {
    return { judged: false, why: `${o.changed} edge pixels from a different sub-pixel offset` };
  }
  return { judged: true };
}
