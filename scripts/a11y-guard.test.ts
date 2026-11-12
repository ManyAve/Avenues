import { describe, expect, test } from "bun:test";
import { AXE_TAGS, a11yGuardProblems } from "../.storybook/a11y-guard";

const base = { a11y: { test: "error", options: { runOnly: AXE_TAGS } } };
const withA11y = (a11y: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
  ...extra,
  a11y: { ...base.a11y, ...a11y },
});
const count = (parameters: Record<string, unknown>, globals: Record<string, unknown> = {}) =>
  a11yGuardProblems(parameters, globals).length;

describe("a11y guard", () => {
  test("allows the preview's setting", () => {
    expect(a11yGuardProblems(base, {})).toEqual([]);
  });

  test("fails axe switched off, set to warn or off, or made manual", () => {
    expect(count(withA11y({ disable: true }))).toBe(1);
    expect(count(withA11y({ test: "todo" }))).toBe(1);
    expect(count(withA11y({ test: "off" }))).toBe(1);
    expect(count(base, { a11y: { manual: true } })).toBe(1);
  });

  test("fails a rule turned off without a reason, in either place axe takes rules", () => {
    expect(count(withA11y({ config: { rules: [{ id: "color-contrast", enabled: false }] } }))).toBe(1);
    expect(count(withA11y({ options: { runOnly: AXE_TAGS, rules: { region: { enabled: false } } } }))).toBe(1);
  });

  test("fails a reason that is too short", () => {
    const p = withA11y({ config: { rules: [{ id: "region", enabled: false }] } }, { a11yExceptions: { region: "no" } });
    expect(count(p)).toBe(1);
  });

  test("allows a rule turned off with a reason", () => {
    const p = withA11y(
      { config: { rules: [{ id: "color-contrast", enabled: false }] } },
      { a11yExceptions: { "color-contrast": "The swatches are decorative; each value is written beside it." } },
    );
    expect(a11yGuardProblems(p, {})).toEqual([]);
  });

  test("fails a narrower rule set, other axe settings, or a narrowed context without a reason", () => {
    expect(count(withA11y({ options: { runOnly: ["wcag2a"] } }))).toBe(1);
    expect(count(withA11y({ options: { runOnly: AXE_TAGS, resultTypes: ["violations"] } }))).toBe(1);
    expect(count(withA11y({ config: { checks: [] } }))).toBe(1);
    expect(count(withA11y({ context: { exclude: [".chart"] } }))).toBe(1);
    expect(count(withA11y({ context: { exclude: [".chart"] } }, { a11yExceptions: { context: "The chart is drawn by a library; its data table is checked." } }))).toBe(0);
  });
});
