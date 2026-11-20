import { describe, expect, test } from "bun:test";
import { differenceCiede2000, parse, wcagContrast, type Color } from "culori";
import { readDeclarations } from "./css-tokens";
import { merge, substitute, THEME_SCOPES } from "./native-tokens";

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
  ["distinct", "accent", "card", SURFACE, "a hover fill and a skeleton are seen on a card"],
  ["distinct", "secondary", "card", SURFACE, "a secondary badge is seen on a card"],
  ["distinct", "border", "card", SURFACE, "a line inside a card renders"],
  ["distinct", "border", "background", SURFACE, "a line on the page renders"],
  ["contrast", "foreground", "background", BODY, "page text"],
  ["contrast", "card-foreground", "card", BODY, "card text"],
  ["contrast", "muted-foreground", "background", BODY, "secondary text on the page"],
  ["contrast", "muted-foreground", "card", BODY, "secondary text on a card"],
  ["contrast", "muted-foreground", "muted", BODY, "secondary text and a placeholder on a muted fill"],
  ["contrast", "accent-foreground", "accent", BODY, "text on a hovered row"],
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

function measure(scopes: readonly string[], pairs: Pair[] = PAIRS) {
  const vars = merge(tokens, [...scopes]);
  const colour = (role: string): Color => {
    const parsed = parse(substitute(`var(--${role})`, vars));
    if (!parsed) throw new Error(`--${role} is not a colour`);
    return parsed;
  };
  return pairs.map(([kind, fg, bg, floor, why]) => {
    const value = kind === "distinct" ? ciede(colour(fg), colour(bg)) : wcagContrast(colour(fg), colour(bg));
    return { pair: `${fg} on ${bg}`, value: Math.round(value * 100) / 100, floor, why };
  });
}

const below = (scopes: readonly string[], pairs: Pair[] = PAIRS) =>
  measure(scopes, pairs)
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
