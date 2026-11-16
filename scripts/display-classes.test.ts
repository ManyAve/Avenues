import { expect, test } from "bun:test";
import { join } from "node:path";
import { compile } from "@tailwindcss/node";

// AVE-114: Tailwind builds `inline-<name>` and `block-<name>` size utilities from every --container-* and --spacing-*
// name, so a token named `grid` gave the class `inline-grid` an 80rem width beside its display. Each display class
// must set `display` and nothing else once Avenue's stylesheet is loaded.
const DISPLAY = [
  "block", "inline-block", "inline", "flex", "inline-flex", "table", "inline-table", "table-caption", "table-cell",
  "table-column", "table-column-group", "table-footer-group", "table-header-group", "table-row-group", "table-row",
  "flow-root", "grid", "inline-grid", "contents", "list-item", "hidden",
];

type Compiler = Awaited<ReturnType<typeof compile>>;
const load = (css: string) => compile(css, { base: join(import.meta.dir, "..", "src", "styles"), onDependency() {} });

/** What each display class sets besides `display`, as "class: declaration". */
function extras(compiler: Compiler) {
  return DISPLAY.flatMap((c) =>
    declarationsOf(compiler, c)
      .filter((d) => !d.startsWith("display:"))
      .map((d) => `${c}: ${d}`),
  );
}

/** The declarations a single class adds to the built stylesheet, theme variables left out. */
function declarationsOf(compiler: Compiler, candidate: string) {
  const without = compiler.build([]);
  const lines = compiler.build([candidate]).split("\n");
  const seen = new Map<string, number>();
  for (const line of without.split("\n")) seen.set(line, (seen.get(line) ?? 0) + 1);
  const added: string[] = [];
  for (const line of lines) {
    const n = seen.get(line) ?? 0;
    if (n > 0) seen.set(line, n - 1);
    else added.push(line.trim());
  }
  return added.filter((l) => /^[a-z][a-z-]*\s*:/.test(l));
}

test("every display class only sets display", async () => {
  expect(extras(await load(`@import "./avenue.css";`))).toEqual([]);
});

test("the check fails on a container name that finishes a display class", async () => {
  const planted = await load(`@import "./avenue.css"; @theme { --container-grid: 80rem; }`);
  expect(extras(planted)).toEqual(["inline-grid: inline-size: var(--container-grid);"]);
});
