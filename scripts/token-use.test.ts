import { expect, test } from "bun:test";
import { countTokenUse } from "./token-use";

// AVE-184 (docs/tokens.md, "Every token earns its place"): a token read by fewer than two places in Avenue's
// components and stylesheets is a value with a name, unless its definition says why it stays (`kept: ...`). Run
// `bun scripts/token-use.ts` for every token and its count.
const tokens = countTokenUse();
const byName = new Map(tokens.map((t) => [t.name, t]));
const earns = (name: string): boolean => {
  const token = byName.get(name);
  if (!token) return false;
  if (token.users.length >= 2 || token.reason) return true;
  // A fill comes with its text (docs/tokens.md, rule 5): `card-foreground` stays while `card` does.
  return name.endsWith("-foreground") && earns(name.slice(0, -"-foreground".length));
};

test("every token has two users, or a kept: reason beside it", () => {
  const lonely = tokens
    .filter((t) => !earns(t.name))
    .map((t) => `${t.name} (${t.users.length === 0 ? "no users" : `only ${t.users[0]}`})`);
  expect(lonely).toEqual([]);
});

test("the counter sees the users it should", () => {
  // A class in a component, a variable read by another token, a variant, and an @apply in the base layer.
  expect(byName.get("muted-foreground")!.users.length).toBeGreaterThan(10);
  expect(byName.get("color-grape-500")!.users.length).toBeGreaterThanOrEqual(2);
  expect(byName.get("breakpoint-phone")!.users.length).toBeGreaterThanOrEqual(2);
  expect(byName.get("background")!.users.some((u) => u.includes("avenue.css > @layer base > body"))).toBe(true);
  // Its own definitions and its theme name reading it are not users.
  expect(byName.get("card")!.users.every((u) => !u.endsWith("> --color-card"))).toBe(true);
});

test("a token with one user fails, and passes with a kept: reason", () => {
  const planted = countTokenUse([
    {
      file: "planted.css",
      css: [
        ":root {",
        "  --planted-one-off: 3px;",
        "  --planted-kept: 5px; /* kept: a step in a planted scale */",
        "  --planted-reader: calc(var(--planted-one-off) + var(--planted-kept));",
        "  --planted-reader-two: var(--planted-reader);",
        "}",
        ".x { margin: var(--planted-reader); }",
      ].join("\n"),
    },
  ]);
  const find = (name: string) => planted.find((t) => t.name === name)!;
  expect(find("planted-one-off").users).toHaveLength(1);
  expect(find("planted-one-off").reason).toBeUndefined();
  expect(find("planted-kept").reason).toBe("a step in a planted scale");
  expect(find("planted-reader").users).toHaveLength(2);
});
