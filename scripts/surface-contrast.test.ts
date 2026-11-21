import { describe, expect, test } from "bun:test";
import { converter, differenceCiede2000, parse, wcagContrast, type Color } from "culori";
import { readDeclarations } from "./css-tokens";
import { merge, substitute, THEME_SCOPES, toColour, type Vars } from "./native-tokens";

/**
 * The lifted surfaces (AVE-115, `data-surface="lifted"` in tokens.css) exist to hold these floors, which an app whose
 * cards carry no border needs: Neighbors' packages/design-tokens/check-contrast.ts holds the same ones, because earlier
 * releases shipped invisible card edges and skeletons that looked like empty boxes.
 *
 * `distinct` is CIEDE2000, for two surfaces that must read as different (one just-noticeable difference is about 1.0).
 * `contrast` is the WCAG ratio, for text that is read. Every value is computed, never estimated: OKLCH lightness is not
 * WCAG luminance, and the two disagree most on dark surfaces.
 */
const SURFACE = 3;
const REGION = 2;
const LIFT = 1.5;
const BODY = 4.5;
/** NEI-103's "visibly lighter than typed text": a placeholder at least 2:1 from foreground, so it can't pass for a value. */
const HINT = 2;
const CONTROL = 3;

type Pair = [kind: "distinct" | "contrast", fg: string, bg: string, floor: number, why: string];

const PAIRS: Pair[] = [
  ["distinct", "card", "background", LIFT, "a card lifts off the page"],
  ["distinct", "muted", "background", REGION, "a field's fill is seen on the page"],
  ["distinct", "muted", "card", SURFACE, "a field's fill and an inset fill are seen on a card"],
  ["distinct", "accent", "card", SURFACE, "a highlighted row is seen in a menu or list"],
  ["distinct", "accent", "popover", SURFACE, "a highlighted row is seen on its popover (AVE-215)"],
  ["distinct", "fill", "card", SURFACE, "a skeleton and a progress track are seen on a card"],
  ["distinct", "secondary", "card", SURFACE, "a secondary badge is seen on a card"],
  ["distinct", "border", "card", SURFACE, "a line inside a card renders"],
  ["distinct", "border", "background", SURFACE, "a line on the page renders"],
  ["contrast", "foreground", "background", BODY, "page text"],
  ["contrast", "card-foreground", "card", BODY, "card text"],
  ["contrast", "muted-foreground", "background", BODY, "secondary text on the page"],
  ["contrast", "muted-foreground", "card", BODY, "secondary text on a card"],
  ["contrast", "muted-foreground", "muted", BODY, "secondary text and a placeholder on a muted fill"],
  ["contrast", "accent-foreground", "accent", BODY, "text on a highlighted row"],
  ["contrast", "muted-foreground", "fill", BODY, "a quoted reply's text on its fill"],
  ["contrast", "placeholder", "foreground", HINT, "a placeholder reads dimmer than typed text (AVE-186)"],
  ["contrast", "placeholder", "muted", BODY, "a placeholder on a muted fill"],
  ["contrast", "placeholder", "card", BODY, "a placeholder in a field on a card"],
  ["contrast", "placeholder", "background", BODY, "a placeholder in a field on the page"],
];

/**
 * A checkbox's, radio's or switch's outline is its only shape, so it reaches WCAG 1.4.11's 3:1 on every surface it sits
 * on, in every theme and surface, lifted or not (AVE-38, AVE-183). ui-sdk asks the same of `--ui-input`, which reads it.
 */
const CONTROL_PAIRS: Pair[] = ["background", "card", "popover", "muted"].map((bg) => [
  "contrast",
  "control-outline",
  bg,
  CONTROL,
  `an unchecked checkbox, radio or switch is seen on ${bg}`,
]);

const tokens = readDeclarations(await Bun.file("src/styles/tokens.css").text());
const ciede = differenceCiede2000();

/** A theme's tokens, with an app's own overrides laid over them the way an app's later stylesheet wins. */
function themeVars(scopes: readonly string[], overrides: Record<string, string> = {}): Vars {
  const vars = merge(tokens, [...scopes]);
  for (const [name, value] of Object.entries(overrides)) vars.set(`--${name}`, value);
  return vars;
}

function measure(scopes: readonly string[], pairs: Pair[] = PAIRS, overrides: Record<string, string> = {}) {
  const vars = themeVars(scopes, overrides);
  const colour = (role: string): Color => toColour(substitute(`var(--${role})`, vars));
  return pairs.map(([kind, fg, bg, floor, why]) => {
    const value = kind === "distinct" ? ciede(colour(fg), colour(bg)) : wcagContrast(colour(fg), colour(bg));
    return { pair: `${fg} on ${bg}`, value: Math.round(value * 100) / 100, floor, why };
  });
}

const below = (scopes: readonly string[], pairs: Pair[] = PAIRS, overrides: Record<string, string> = {}) =>
  measure(scopes, pairs, overrides)
    .filter((r) => r.value < r.floor)
    .map((r) => `${r.pair} ${r.value} < ${r.floor}: ${r.why}`);

describe("lifted surfaces (AVE-115)", () => {
  test("light lifted holds every floor", () => {
    expect(below(THEME_SCOPES.liftedLight)).toEqual([]);
  });

  test("dark lifted holds every floor", () => {
    expect(below(THEME_SCOPES.liftedDark)).toEqual([]);
  });

  test("the default surfaces are the ones that miss, so lifted is still needed", () => {
    // If the defaults ever hold these floors, data-surface="lifted" has no job left: retire it instead of keeping two sets.
    expect(below(THEME_SCOPES.light).length).toBeGreaterThan(0);
    expect(below(THEME_SCOPES.dark)).toEqual([
      "muted on card 0 < 3: a field's fill and an inset fill are seen on a card",
    ]);
  });
});

describe("placeholder (AVE-186)", () => {
  const placeholderMisses = (scopes: readonly string[]) => below(scopes).filter((miss) => miss.startsWith("placeholder "));

  for (const [theme, scopes] of Object.entries(THEME_SCOPES)) {
    test(`${theme}: a placeholder is 2:1 from typed text and 4.5:1 on muted, card and page`, () => {
      expect(placeholderMisses(scopes)).toEqual([]);
    });
  }

  test("dark muted-foreground would miss, so the placeholder needs its own colour there", () => {
    const vars = merge(tokens, [...THEME_SCOPES.dark]);
    const ratio = wcagContrast(parse(substitute("var(--muted-foreground)", vars))!, parse(substitute("var(--foreground)", vars))!);
    expect(ratio).toBeLessThan(HINT);
  });
});

describe("control outlines (AVE-183)", () => {
  for (const [theme, scopes] of Object.entries(THEME_SCOPES)) {
    test(`${theme}: control-outline reaches 3:1 on every surface`, () => {
      expect(below(scopes, CONTROL_PAIRS)).toEqual([]);
    });
  }

  test("ui-sdk's --ui-input is the control outline", async () => {
    const theme = await Bun.file("src/styles/ui-sdk-theme.css").text();
    expect(theme).toMatch(/--ui-input:\s*var\(--control-outline\)/);
  });
});

/**
 * AVE-209: the highlighted row (accent, a faint primary tint) sits beside the chosen look (primary-subtle, AVE-50) in a
 * Select or Combobox, so it must never pass for it: clearly apart, and lighter in light and darker in dark, so the tint
 * is always the quieter of the two. And the tint is a tint: it leans to primary's hue, not grey.
 */
/**
 * AVE-215: an app's own popover surface. Neighbors paints its light cards and popovers off-white (onyx-25 on an onyx-50
 * page, its NEI-203 surfaces); a tint mixed into white sat 2.9 off that card, under the floor, until accent was mixed
 * into var(--popover). Any app that sets --popover gets a highlight made from it.
 */
const OFF_WHITE = {
  background: "var(--color-onyx-50)",
  card: "var(--color-onyx-25)",
  popover: "var(--color-onyx-25)",
};
const THEMES: Record<string, [scopes: readonly string[], overrides?: Record<string, string>]> = {
  ...Object.fromEntries(Object.entries(THEME_SCOPES).map(([theme, scopes]) => [theme, [scopes]])),
  offWhitePopover: [THEME_SCOPES.light, OFF_WHITE],
};

describe("the highlight follows the popover (AVE-215)", () => {
  const HIGHLIGHT_PAIRS = PAIRS.filter(([, fg, bg]) => fg === "accent" || bg === "accent");
  for (const [theme, [scopes, overrides]] of Object.entries(THEMES)) {
    test(`${theme}: a highlighted row is seen on its popover and card, and its text reads`, () => {
      expect(below(scopes, HIGHLIGHT_PAIRS, overrides)).toEqual([]);
    });
  }

  test("accent is mixed from the popover, not a fixed colour", () => {
    const declared = tokens.filter((d) => d.name === "--accent");
    expect(declared.length).toBeGreaterThan(0);
    for (const d of declared) expect(d.value).toMatch(/^color-mix\(in oklab, var\(--primary\) [\d.]+%, var\(--popover\)\)$/);
  });

  test("an off-white popover moves the highlight with it", () => {
    const hex = (overrides?: Record<string, string>) =>
      substitute("var(--accent)", themeVars(THEME_SCOPES.light, overrides));
    expect(toColour(hex(OFF_WHITE))).not.toEqual(toColour(hex()));
  });
});

describe("highlighted is never chosen (AVE-209)", () => {
  const APART = 5;
  for (const [theme, [scopes, overrides]] of Object.entries(THEMES)) {
    test(`${theme}: accent is ${APART} apart from primary-subtle and quieter than it`, () => {
      const vars = themeVars(scopes, overrides);
      const ok = (role: string) => converter("oklch")(toColour(substitute(`var(--${role})`, vars)))!;
      const [accent, chosen, surface] = [ok("accent"), ok("primary-subtle"), ok("popover")];
      expect(ciede(accent, chosen)).toBeGreaterThan(APART);
      // Quieter: nearer the popover than the chosen fill is.
      expect(ciede(accent, surface)).toBeLessThan(ciede(chosen, surface));
      // On Avenue's own popovers, nearer in lightness too. Not on an app's off-white one: primary-subtle is a fixed
      // colour, a touch darker than onyx-25, so there the two sit at one lightness and the tint's lower chroma (below)
      // and its distance (above) are what keep it the quieter (AVE-215).
      if (!overrides) expect(Math.abs(accent.l - surface.l)).toBeLessThan(Math.abs(chosen.l - surface.l));
      expect(accent.c).toBeLessThan(chosen.c);
      expect(Math.abs((accent.h ?? 0) - (ok("primary").h ?? 0))).toBeLessThan(15);
    });
  }
});

/**
 * The floating edge (AVE-208) is translucent: `color-mix(in oklab, <ink> N%, transparent)`, a 1px ring the browser
 * paints over whatever is under that pixel. It must still read on both sides of it: the popup's own fill, and the page,
 * card or muted fill it opens over (on a lifted page a white menu opens over a white card, and the edge is what shows
 * where the menu ends). Composited the way a browser does, in sRGB.
 */
const FLOATING_UNDER = ["popover", "card", "background", "muted"] as const;
const toRgb = converter("rgb");

function floatingEdgeOver(vars: Map<string, string>, under: string) {
  const value = substitute("var(--border-floating)", vars);
  const mix = /^color-mix\(in oklab,\s*(.+?)\s+([\d.]+)%,\s*transparent\)$/.exec(value);
  if (!mix) throw new Error(`--border-floating is not a translucent colour-mix: ${value}`);
  const ink = toRgb(parse(mix[1]!))!;
  const base = toRgb(parse(substitute(`var(--${under})`, vars)))!;
  const a = Number(mix[2]) / 100;
  const over = (k: "r" | "g" | "b") => a * ink[k] + (1 - a) * base[k];
  return { edge: { mode: "rgb", r: over("r"), g: over("g"), b: over("b") } as Color, base };
}

describe("floating edge (AVE-208)", () => {
  for (const [theme, scopes] of Object.entries(THEME_SCOPES)) {
    test(`${theme}: border-floating is ${SURFACE} from every surface a popup sits on or over`, () => {
      const vars = merge(tokens, [...scopes]);
      const misses = FLOATING_UNDER.map((under) => {
        const { edge, base } = floatingEdgeOver(vars, under);
        return { under, value: Math.round(ciede(edge, base) * 100) / 100 };
      }).filter((r) => r.value < SURFACE);
      expect(misses).toEqual([]);
    });
  }
});
