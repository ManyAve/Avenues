import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";

// src/type-tests/optional-props.ts checks, at type level, that every optional prop of every component takes
// `undefined` (AVE-108). It can only check the files it lists, so a new component file must be added there.
test("the optional-props type check lists every component file", () => {
  const check = readFileSync(new URL("../src/type-tests/optional-props.ts", import.meta.url), "utf8");
  const listed = new Set([...check.matchAll(/^\s+"([\w-]+)": typeof \w+;$/gm)].map((m) => m[1]));
  const imported = new Set([...check.matchAll(/from "#avenue\/components\/([\w-]+)";$/gm)].map((m) => m[1]));
  const files = readdirSync(new URL("../src/components", import.meta.url))
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => f.slice(0, -".tsx".length));
  expect(files.length).toBeGreaterThan(0);
  expect(files.filter((f) => !listed.has(f) || !imported.has(f))).toEqual([]);
});
