import { describe, expect, test } from "bun:test";
import {
  explain,
  isAgreedFix,
  isAppLocal,
  isKnownBug,
  looks,
  mapProblems,
  pixelJudgement,
  SUBPIXEL_MAX,
  matchParts,
  rootVariables,
  sameOffset,
  storiesToPair,
  styleDifferences,
  verdict,
  type Part,
} from "./parity-lib";
import { PAIRS } from "./parity-pairs";

const part = (over: Partial<Part> & { style?: Record<string, string> } = {}): Part => ({
  tag: "div",
  slot: null,
  text: "",
  width: 40,
  height: 20,
  ...over,
  style: { display: "block", "padding-left": "8px", "background-color": "rgb(0, 0, 0)", ...over.style },
});

describe("looks", () => {
  test("a shadow of transparent layers is no shadow", () => {
    expect(looks("box-shadow", "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px")).toBe("none");
  });
  test("keeps a visible shadow layer", () => {
    expect(looks("box-shadow", "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.1) 0px 1px 2px 0px")).toBe(
      "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
    );
  });
  test("normal gap is 0px and any huge corner is a pill", () => {
    expect(looks("column-gap", "normal")).toBe("0px");
    expect(looks("border-top-left-radius", "3.35544e+07px")).toBe("pill");
    expect(looks("border-top-left-radius", "9999px")).toBe("pill");
    expect(looks("border-top-left-radius", "10px")).toBe("10px");
  });
});

describe("matchParts", () => {
  test("pairs roots, then data-slot names (with Base UI aliases), then tag and text", () => {
    const app = [part(), part({ slot: "dropdown-menu-item" }), part({ tag: "span", text: "Due" })];
    const avenue = [part(), part({ tag: "span", text: "Due" }), part({ slot: "menu-item" })];
    const { pairs, appOnly, avenueOnly } = matchParts(app, avenue);
    expect(pairs).toHaveLength(3);
    expect(pairs[1]![1].slot).toBe("menu-item");
    expect(appOnly).toEqual([]);
    expect(avenueOnly).toEqual([]);
  });
  test("reports parts that exist on one side only", () => {
    const { appOnly, avenueOnly } = matchParts([part(), part({ slot: "icon" })], [part(), part({ slot: "arrow" })]);
    expect(appOnly.map((p) => p.slot)).toEqual(["icon"]);
    expect(avenueOnly.map((p) => p.slot)).toEqual(["arrow"]);
  });
});

describe("styleDifferences", () => {
  test("finds a changed padding and a changed fill", () => {
    const d = styleDifferences(
      [part()],
      [part({ style: { "padding-left": "12px", "background-color": "rgb(1, 1, 1)" } })],
      true,
    );
    expect(d.map((x) => x.prop).sort()).toEqual(["background-color", "padding-left"]);
  });
  test("ignores gaps on a block and type on a part with no text", () => {
    const a = part({ style: { "column-gap": "6px", "font-size": "16px" } });
    const b = part({ style: { "column-gap": "4px", "font-size": "14px" } });
    expect(styleDifferences([a], [b], true)).toEqual([]);
  });
  test("compares gaps on flex parts and type where there is text", () => {
    const a = part({ text: "Pay", style: { display: "flex", "column-gap": "6px", "font-size": "16px" } });
    const b = part({ text: "Pay", style: { display: "flex", "column-gap": "4px", "font-size": "14px" } });
    expect(styleDifferences([a], [b], true).map((x) => x.prop).sort()).toEqual(["column-gap", "font-size"]);
  });
  test("compares width only when both show the same text", () => {
    expect(styleDifferences([part({ width: 40 })], [part({ width: 60 })], true).map((x) => x.prop)).toEqual(["width"]);
    expect(styleDifferences([part({ width: 40 })], [part({ width: 60 })], false)).toEqual([]);
  });
  test("a frame compares the root's box and not its height or gaps", () => {
    const a = [part({ height: 200, style: { display: "flex", "column-gap": "16px" } }), part({ slot: "x" })];
    const b = [part({ height: 300, style: { display: "flex", "column-gap": "0px" } })];
    expect(styleDifferences(a, b, false, true)).toEqual([]);
  });
});

describe("explain and verdict", () => {
  const diff = { where: "root", prop: "padding-left", app: "10px", avenue: "8px" };
  test("an allowance covers a matching difference by glob and value", () => {
    const [d] = explain([diff], [{ prop: "padding-*", app: "10px", avenue: "8px", because: "AVE-2 §1: grid" }]);
    expect(d!.because).toBe("AVE-2 §1: grid");
  });
  test("an allowance for other values doesn't cover it", () => {
    const [d] = explain([diff], [{ prop: "padding-left", app: "12px", because: "AVE-2 §1: grid" }]);
    expect(d!.because).toBeUndefined();
  });
  test("an allowance limited to a part doesn't cover the root", () => {
    const [d] = explain([diff], [{ prop: "padding-left", where: "icon 1", because: "AVE-2 §1: grid" }]);
    expect(d!.because).toBeUndefined();
  });
  test("verdicts follow the strongest reason", () => {
    expect(verdict([], false)).toBe("same");
    expect(verdict([], true)).toBe("unexplained");
    expect(verdict([diff], false)).toBe("unexplained");
    expect(verdict([{ ...diff, because: "AVE-2 §1: grid" }], false)).toBe("agreed-fix");
    expect(verdict([{ ...diff, because: "app: app/ui/x.tsx: sections" }], false)).toBe("app-local");
    expect(
      verdict([{ ...diff, because: "app: app/ui/x.tsx: sections" }, { ...diff, because: "AVE-55: titles" }], false),
    ).toBe("known-bug");
  });
  test("a part on one side only is ignored when the text and every pixel match", () => {
    const parts = { where: "root", prop: "parts", app: "only here: span", avenue: "only here: none" };
    expect(verdict([parts], false, true)).toBe("same");
    expect(verdict([parts], true, true)).toBe("unexplained");
    expect(verdict([parts], false, false)).toBe("unexplained");
  });
  test("reason kinds", () => {
    expect(isAgreedFix("AVE-2 §3: corners")).toBe(true);
    expect(isAgreedFix("AVE-13: contrast")).toBe(true);
    expect(isAgreedFix("AVE-29: control text")).toBe(true);
    expect(isAgreedFix("AVE-8: chip check")).toBe(true);
    expect(isAgreedFix("AVE-80: something")).toBe(false);
    expect(isAgreedFix("AVE-2: no section")).toBe(false);
    expect(isKnownBug("AVE-55: titles")).toBe(true);
    expect(isKnownBug("AVE-29: control text")).toBe(false);
    expect(isKnownBug("AVE-2 §1: grid")).toBe(false);
    expect(isAppLocal("app: app/ui/components/dues.tsx: sections")).toBe(true);
    expect(isAppLocal("app: the dues screen")).toBe(false);
  });
});

describe("mapProblems", () => {
  const app = ["primitives-button--primary"];
  test("every Avenue story needs a pair or a written reason", () => {
    expect(mapProblems({}, ["components-x--a"], app)).toEqual(["components-x--a has no pair and no recorded reason"]);
    expect(mapProblems({ "components-x--a": { none: "short" } }, ["components-x--a"], app)).toEqual([
      "components-x--a is unpaired without a written reason",
    ]);
  });
  test("catches stale entries, missing app stories and reasons in the wrong form", () => {
    const problems = mapProblems(
      {
        "components-x--gone": { none: "A reason that is long enough to count." },
        "components-x--a": [{ app: "primitives-nope--x", allow: [{ prop: "width", because: "looks nicer" }] }],
      },
      ["components-x--a"],
      app,
    );
    expect(problems).toHaveLength(3);
  });
  test("the committed map's reasons are all in a recognised form", () => {
    const ids = Object.keys(PAIRS);
    const appIds = Object.values(PAIRS).flatMap((e) => (Array.isArray(e) ? e.map((p) => p.app) : []));
    expect(mapProblems(PAIRS, ids, appIds)).toEqual([]);
  });
});

describe("helpers", () => {
  test("storiesToPair keeps component and composite stories", () => {
    expect(storiesToPair(["foundations-colors--all", "composites-b--x", "components-a--x"])).toEqual([
      "components-a--x",
      "composites-b--x",
    ]);
  });
  test("rootVariables reads the first :root block", () => {
    expect(rootVariables("/* c */ :root { --text-compact: .875rem; --a:1px; } .dark { --b: 2px; }")).toEqual({
      "--text-compact": ".875rem",
      "--a": "1px",
    });
  });
  test("sameOffset tolerates float noise only", () => {
    expect(sameOffset([0, 0.5], [0, 0.505])).toBe(true);
    expect(sameOffset([0, 0], [0, 0.797])).toBe(false);
  });
});

describe("pixelJudgement", () => {
  const base = { sameText: true, frame: false, differences: [], changed: 0, subpixel: false };
  const allowed = { where: "root", prop: "padding-left", app: "10px", avenue: "8px", because: "AVE-2 §1: grid" };
  test("judges pixels when the text matches and no style differs", () => {
    expect(pixelJudgement({ ...base, changed: 300 }).judged).toBe(true);
  });
  test("an allowed difference doesn't absorb changed pixels: the comparison is styles only", () => {
    expect(pixelJudgement({ ...base, differences: [allowed], changed: 300 })).toEqual({
      judged: false,
      why: "an allowed difference moves the pixels",
    });
  });
  test("different text and frames are styles only", () => {
    expect(pixelJudgement({ ...base, sameText: false }).judged).toBe(false);
    expect(pixelJudgement({ ...base, frame: true }).judged).toBe(false);
  });
  test("a sub-pixel offset forgives only edge pixels", () => {
    expect(pixelJudgement({ ...base, subpixel: true, changed: SUBPIXEL_MAX }).judged).toBe(false);
    expect(pixelJudgement({ ...base, subpixel: true, changed: SUBPIXEL_MAX + 1 }).judged).toBe(true);
  });
  test("a part on one side only still lets pixels decide", () => {
    const parts = { where: "root", prop: "parts", app: "only here: span", avenue: "only here: none" };
    expect(pixelJudgement({ ...base, differences: [parts] }).judged).toBe(true);
  });
});

describe("style properties QA's italic plant needed (AVE-73)", () => {
  test("italic, underline, uppercase and a moved part are differences", () => {
    const a = part({ text: "Pay", style: { "font-style": "normal", "text-decoration-line": "none", "text-transform": "none", transform: "none" } });
    const b = part({ text: "Pay", style: { "font-style": "italic", "text-decoration-line": "underline", "text-transform": "uppercase", transform: "matrix(1, 0, 0, 1, 0, 1)" } });
    expect(styleDifferences([a], [b], true).map((x) => x.prop).sort()).toEqual([
      "font-style",
      "text-decoration-line",
      "text-transform",
      "transform",
    ]);
  });
  test("an outline's width matters only where one is drawn", () => {
    const a = part({ style: { "outline-style": "none", "outline-width": "1px" } });
    const b = part({ style: { "outline-style": "none", "outline-width": "3px" } });
    expect(styleDifferences([a], [b], true)).toEqual([]);
    const c = part({ style: { "outline-style": "solid", "outline-width": "3px" } });
    expect(styleDifferences([a], [c], true).map((x) => x.prop).sort()).toEqual(["outline-style", "outline-width"]);
  });
  test("an icon's fill, stroke and size are compared even where the texts differ", () => {
    const icon = (fill: string, w: number) => part({ tag: "svg", width: w, style: { fill, stroke: "rgb(0, 0, 0)" } });
    const d = styleDifferences([part(), icon("none", 14)], [part(), icon("rgb(0, 0, 0)", 16)], false);
    expect(d.map((x) => x.prop).sort()).toEqual(["fill", "width"]);
  });
});
