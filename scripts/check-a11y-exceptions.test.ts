import { describe, expect, test } from "bun:test";
import { findProblems } from "./check-a11y-exceptions";

const lines = (text: string) => findProblems("x.stories.tsx", text).map((f) => f.line);

describe("check:a11y-exceptions", () => {
  test("allows a rule turned off with a reason above it", () => {
    const text = `// a11y-exception: the swatches are decorative; the values are in the table.
  a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } },`;
    expect(lines(text)).toEqual([]);
  });

  test("allows the reason on the same line", () => {
    expect(lines(`rules: [{ id: "region", enabled: false }], // a11y-exception: shown inside a page landmark`)).toEqual([]);
  });

  test("flags a rule turned off with no reason or an empty one", () => {
    expect(lines(`a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } },`)).toEqual([1]);
    expect(lines(`// a11y-exception:\na11y: { config: { rules: [{ id: "region", enabled: false }] } },`)).toEqual([2]);
  });

  test("flags a reason too far above to belong to the rule", () => {
    expect(lines(`// a11y-exception: decorative swatches only.\n\n\nrules: [{ id: "x", enabled: false }]`)).toEqual([4]);
  });

  test("flags axe switched off or set to warn for a whole story, even with a reason", () => {
    expect(lines(`// a11y-exception: too noisy to fix now\nparameters: { a11y: { test: "todo" } }`)).toEqual([2]);
    expect(lines(`a11y: { test: 'off' }`)).toEqual([1]);
    expect(lines(`a11y: { disable: true }`)).toEqual([1]);
  });

  test("allows the default setting and other addons' disable flags", () => {
    expect(lines(`a11y: { test: "error" }`)).toEqual([]);
    expect(lines(`backgrounds: { disable: true },`)).toEqual([]);
  });
});
