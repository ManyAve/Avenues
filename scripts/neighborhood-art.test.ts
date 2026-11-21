import { describe, expect, test } from "bun:test";
import { artFiles, BACKDROP_DIR, cropStreet, STREET_HEIGHT, staleArt } from "./neighborhood-art";

describe("neighborhood illustration (AVE-217)", () => {
  test("the committed art matches what the generator draws", async () => {
    // The generator changed without `bun run art:neighborhood`: apps would copy an old picture.
    expect(await staleArt()).toEqual([]);
  });

  test("it draws the same street every time", () => {
    expect(artFiles()).toEqual(artFiles());
  });

  test("the street is the scene's top band, nothing else changed", () => {
    const files = artFiles();
    for (const theme of ["light", "dark"]) {
      const scene = files[`neighborhood-${theme}.svg`]!;
      const street = files[`street-${theme}.svg`]!;
      expect(street).toBe(cropStreet(scene));
      expect(street).toContain(`viewBox="0 0 1600 ${STREET_HEIGHT}"`);
      expect(street.slice(street.indexOf(">") + 1)).toBe(scene.slice(scene.indexOf(">") + 1));
    }
  });

  test("dusk and day differ, and the moving parts stop for reduced motion", () => {
    const files = artFiles();
    expect(files["neighborhood-dark.svg"]).not.toBe(files["neighborhood-light.svg"]);
    for (const [name, svg] of Object.entries(files)) {
      if (name.endsWith(".svg")) expect(svg).toContain("@media (prefers-reduced-motion:reduce)");
    }
  });

  test("both phone backdrops are committed", async () => {
    for (const theme of ["light", "dark"]) {
      expect(await Bun.file(`${BACKDROP_DIR}/neighborhood-backdrop-${theme}.png`).exists()).toBe(true);
    }
  });
});
