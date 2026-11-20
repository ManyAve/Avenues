import { describe, expect, test } from "bun:test";
import { buildTokens, camel, COLOR_ROLES, staleOutputs, toHex, toPx } from "./native-tokens";

describe("native tokens (AVE-101)", () => {
  test("the committed Swift, Kotlin and JSON files match the stylesheets", async () => {
    // A token changed without `bun run tokens:native`: the phone apps would copy in an old look.
    expect(await staleOutputs()).toEqual([]);
  });

  test("OKLCH converts to the sRGB a browser paints", () => {
    expect(toHex("oklch(1 0 0)")).toBe("#ffffff");
    expect(toHex("oklch(0% 0 0)")).toBe("#000000");
    // grape-600, Avenue's light primary, as Chrome renders it.
    expect(toHex("oklch(44.87% 0.101 297.84)")).toBe("#5c4785");
    // Out of gamut clips each channel (as Chrome paints on an sRGB screen), not chroma: the hand-written
    // conversion culori replaced (AVE-172) gave the same hex for 97,920 sampled colours, in and out of gamut.
    expect(toHex("oklch(0.7 0.4 145)")).toBe("#00d200");
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
    // Lifted (AVE-115): a tinted page under a white card, and dark muted no longer the card's colour.
    expect(tokens.lifted.light.card).toBe("#ffffff");
    expect(tokens.lifted.light.background).not.toBe(tokens.light.background);
    expect(tokens.dark.muted).toBe(tokens.dark.card);
    expect(tokens.lifted.dark.muted).not.toBe(tokens.lifted.dark.card);
    expect(tokens.lifted.dark.primary).toBe(tokens.dark.primary);
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
