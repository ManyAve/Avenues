import { describe, expect, test } from "bun:test";
import { CORNERS, nestedCorner, type Corner } from "../src/lib/corners";

/**
 * AVE-211: each rounded container sets `--nested-corner` to the corner its parts may take (src/lib/corners.ts), worked
 * out from its own corner and inset. A container whose corner or inset changes without its variable fails here.
 */
describe("nestedCorner (AVE-2 section 4)", () => {
  test("concentric when tight, rounded down to a step, never below xs", () => {
    // The app's segmented control: 10px with 3px padding, 7px, so sm (6px).
    expect(nestedCorner("lg", 3)).toBe("sm");
    expect(nestedCorner("xl", 4)).toBe("lg");
    expect(nestedCorner("xl", 12)).toBe("xs");
    expect(nestedCorner("xs", 2)).toBe("xs");
  });

  test("never rounder than the container when there is room", () => {
    expect(nestedCorner("xl", 16)).toBe("xl");
    expect(nestedCorner("lg", 16)).toBe("lg");
    expect(nestedCorner("lg", 10)).toBe("lg");
  });

  test("the steps are avenue.css's corners", async () => {
    const css = await Bun.file("src/styles/avenue.css").text();
    const factor = (step: Corner) => {
      const m = new RegExp(`--radius-${step}: (?:calc\\(var\\(--radius\\) \\* ([\\d.]+)\\)|var\\(--radius\\));`).exec(css);
      if (!m) throw new Error(`avenue.css has no --radius-${step}`);
      return m[1] ? Number(m[1]) : 1;
    };
    for (const step of Object.keys(CORNERS) as Corner[]) expect(Math.round(10 * factor(step))).toBe(CORNERS[step]);
  });
});

/**
 * Each container, with the classes in its own source that give its corner and its inset. A change to either (Card's
 * inset from 16px to 12px, a popover going xl) fails here until the corner and the inset below, and with them the
 * expected `--nested-corner`, are brought in line.
 */
const CONTAINERS: { files: string[]; outer: Corner; gap: number; shows: string[]; variant?: string; why: string }[] = [
  {
    files: ["src/components/card.tsx"],
    outer: "xl",
    gap: 16,
    shows: ["rounded-xl", "[--card-spacing:--spacing(4)]"],
    why: "Card: xl, 16px inset",
  },
  {
    files: ["src/components/card.tsx"],
    outer: "xl",
    gap: 12,
    shows: ["rounded-xl", "data-[size=sm]:[--card-spacing:--spacing(3)]"],
    variant: "data-[size=sm]:",
    why: "Card size sm: xl, 12px inset",
  },
  {
    files: ["src/lib/popup.ts", "src/components/dialog.tsx", "src/components/alert-dialog.tsx", "src/components/drawer.tsx"],
    outer: "xl",
    gap: 16,
    shows: ["p-inset"],
    why: "Dialog, Alert dialog and Drawer (modalSurface): xl, 16px inset",
  },
  {
    files: ["src/components/popover.tsx"],
    outer: "lg",
    gap: 16,
    shows: ["rounded-lg", "p-inset"],
    why: "Popover: lg, 16px inset",
  },
];

describe("containers set --nested-corner (AVE-211)", () => {
  test("p-inset is 16px", async () => {
    expect(await Bun.file("src/styles/avenue.css").text()).toContain("--spacing-inset: 1rem;");
  });

  for (const { files, outer, gap, shows, variant = "", why } of CONTAINERS) {
    test(why, async () => {
      const sources = await Promise.all(files.map((file) => Bun.file(file).text()));
      // The first file holds the inset (and the variable); each component file draws the corner (the modals each
      // set their own, Drawer per side: rounded-r-xl).
      for (const cls of shows.filter((c) => !c.startsWith("rounded-"))) expect(sources[0]).toContain(cls);
      const drawers = sources.length > 1 ? sources.slice(1) : sources;
      for (const source of drawers) expect(source).toMatch(new RegExp(`rounded(?:-[a-z]{1,2})?-${outer}\\b`));
      expect(sources[0]).toContain(`${variant}[--nested-corner:var(--radius-${nestedCorner(outer, gap)})]`);
    });
  }
});
