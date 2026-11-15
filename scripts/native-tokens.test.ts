import { describe, expect, test } from "bun:test";
import { buildTokens, camel, COLOR_ROLES, oklchToHex, staleOutputs, toPx } from "./native-tokens";

describe("native tokens (AVE-101)", () => {
  test("the committed Swift, Kotlin and JSON files match the stylesheets", async () => {
    // A token changed without `bun run tokens:native`: the phone apps would copy in an old look.
    expect(await staleOutputs()).toEqual([]);
  });

  test("OKLCH converts to the sRGB a browser paints", () => {
    expect(oklchToHex("oklch(1 0 0)")).toBe("#ffffff");
    expect(oklchToHex("oklch(0% 0 0)")).toBe("#000000");
    // grape-600, Avenue's light primary, as Chrome renders it.
    expect(oklchToHex("oklch(44.87% 0.101 297.84)")).toBe("#5c4785");
    // Out of gamut clips per channel instead of throwing.
    expect(oklchToHex("oklch(0.7 0.4 145)")).toMatch(/^#[0-9a-f]{6}$/);
  });

  test("lengths resolve rem and calc", () => {
    expect(toPx("0.625rem")).toBe(10);
    expect(toPx("calc(0.625rem * 1.4)")).toBe(14);
  });

  test("every role resolves in both themes, and dark differs where the web's does", async () => {
    const tokens = buildTokens(
      await Bun.file("src/styles/tokens.css").text(),
      await Bun.file("src/styles/avenue.css").text(),
    );
    for (const role of COLOR_ROLES) {
      expect(tokens.light[role]).toMatch(/^#[0-9a-f]{6}$/);
      expect(tokens.dark[role]).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(tokens.light.background).toBe("#ffffff");
    expect(tokens.dark.background).not.toBe(tokens.light.background);
    expect(Object.keys(tokens.light).filter((k) => k.startsWith("tint-"))).toHaveLength(12);
    // Phone values: 16px between controls, 28px xs controls, so 28 + 16 reaches the 44pt minimum (AVE-22).
    expect(tokens.spacing.controls).toBe(16);
    expect(tokens.spacing["control-xs"]).toBe(28);
    expect(tokens.touchMinimum).toBe(44);
    expect(tokens.radius.lg).toBe(10);
  });

  test("a missing token fails instead of exporting a guess", () => {
    expect(() => buildTokens(":root { --background: var(--nope); }", "@theme inline { }")).toThrow(/--nope|not defined/);
  });

  test("names camel-case the web's", () => {
    expect(camel("card-foreground")).toBe("cardForeground");
    expect(camel("chart-1")).toBe("chart1");
    expect(camel("tint-teal-bg")).toBe("tintTealBg");
  });
});
