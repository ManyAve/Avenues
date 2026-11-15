import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { OUT, publishedName } from "./native-android";

describe("Android screenshots", () => {
  test("Paparazzi's file names map to the shared story slugs", () => {
    expect(publishedName("com.manyave.avenue_AndroidScreenshots_buttonSizes_button-sizes-dark.png")).toBe(
      "button-sizes-dark.png",
    );
    expect(publishedName("com.manyave.avenue_Other_x_y.png")).toBeNull();
  });

  test("every committed story has a light and a dark picture", async () => {
    // The side-by-side stories show a light and a dark Android column; one without the other is a half-run record.
    const files = (await readdir(OUT)).filter((f) => f.endsWith(".png"));
    const slugs = new Set(files.map((f) => f.replace(/-(light|dark)\.png$/, "")));
    expect(slugs.size).toBeGreaterThan(0);
    for (const slug of slugs) {
      expect(files).toContain(`${slug}-light.png`);
      expect(files).toContain(`${slug}-dark.png`);
    }
  });
});
