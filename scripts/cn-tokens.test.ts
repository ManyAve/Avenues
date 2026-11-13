import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cn, SPACING_NAMES, TEXT_SIZE_NAMES } from "../src/lib/utils";

// Every --spacing-* and --text-* token Avenue defines must be known to cn, or cn mis-resolves conflicts with it.
const styles = join(import.meta.dir, "..", "src", "styles");
const css = readdirSync(styles)
  .filter((f) => f.endsWith(".css") && f !== "ui-sdk.css")
  .map((f) => readFileSync(join(styles, f), "utf8"))
  .join("\n");
const defined = (prefix: string) =>
  [...new Set([...css.matchAll(new RegExp(`--${prefix}-([a-z0-9-]+?)(?:--[a-z-]+)?\\s*:`, "g"))].map((m) => m[1]!))];
// Tailwind's own steps, which cn already knows.
const TAILWIND_TEXT = new Set(["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl", "8xl", "9xl"]);

test("cn knows every Avenue spacing token", () => {
  expect(defined("spacing").filter((n) => !(SPACING_NAMES as readonly string[]).includes(n))).toEqual([]);
});

test("cn knows every Avenue text size", () => {
  const sizes = defined("text").filter((n) => !TAILWIND_TEXT.has(n));
  expect(sizes.filter((n) => !(TEXT_SIZE_NAMES as readonly string[]).includes(n))).toEqual([]);
});

test("conflicts resolve with Avenue's names", () => {
  expect(cn("text-web-card", "text-muted-foreground")).toBe("text-web-card text-muted-foreground");
  expect(cn("text-meta", "text-muted-foreground")).toBe("text-meta text-muted-foreground");
  expect(cn("h-control-sm", "h-8")).toBe("h-8");
  expect(cn("p-inset", "p-0")).toBe("p-0");
  expect(cn("gap-group", "gap-2")).toBe("gap-2");
});
