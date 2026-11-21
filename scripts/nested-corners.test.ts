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

const CONTAINERS: { file: string; outer: Corner; gap: number; variant?: string; why: string }[] = [
  { file: "src/components/card.tsx", outer: "xl", gap: 16, why: "Card, 16px inset" },
  { file: "src/components/card.tsx", outer: "xl", gap: 12, variant: "data-[size=sm]:", why: "Card size sm, 12px inset" },
  { file: "src/lib/popup.ts", outer: "xl", gap: 16, why: "Dialog, Alert dialog and Drawer (modalSurface), p-inset" },
  { file: "src/components/popover.tsx", outer: "lg", gap: 16, why: "Popover, p-inset" },
];

describe("containers set --nested-corner (AVE-211)", () => {
  for (const { file, outer, gap, variant = "", why } of CONTAINERS) {
    test(why, async () => {
      const source = await Bun.file(file).text();
      expect(source).toContain(` ${variant}[--nested-corner:var(--radius-${nestedCorner(outer, gap)})]`.trimStart());
    });
  }
});
