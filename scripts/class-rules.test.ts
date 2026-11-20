import { expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// AVE-171: Avenue's class rules run inside oxlint (lint/classes.mjs). Each line below is planted in a file and linted
// with Avenue's own oxlint.config.ts; the test fails if a rule stops firing, or starts firing on an allowed class.
const root = join(import.meta.dir, "..");
// The rules apps get from lint/classes.mjs. Avenue's own config adds more of the plugin's rules; this file tests these.
const CLASS_RULES = ["tailwindcss(no-unknown-classes)", "tailwindcss(no-restricted-classes)", "avenue(hit-area-after)"];

interface Diagnostic {
  code: string;
  message: string;
  labels: { span: { line: number } }[];
}

function lint(lines: string[], asClassName = true): { line: string; code: string; message: string }[] {
  const dir = mkdtempSync(join(tmpdir(), "avenue-class-rules-"));
  try {
    const file = join(dir, "planted.tsx");
    writeFileSync(file, lines.map((l, i) => (asClassName ? `export const C${i} = () => <div className={${l}} />;` : `export const c${i} = ${l};`)).join("\n"));
    const run = Bun.spawnSync(["bun", "x", "oxlint", "-c", "oxlint.config.ts", "--format", "json", file], { cwd: root });
    const { diagnostics } = JSON.parse(run.stdout.toString()) as { diagnostics: Diagnostic[] };
    return diagnostics
      .filter((d) => CLASS_RULES.includes(d.code))
      .map((d) => ({ line: lines[d.labels[0]!.span.line - 1]!, code: d.code, message: d.message }));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** The classes a rule names in its messages, for the Tailwind rules, which report each class. */
const named = (found: ReturnType<typeof lint>, code: string) =>
  found.filter((f) => f.code === code).map((f) => /^"([^"]+)"/.exec(f.message)?.[1]);

test("flags retired corners in every form, and says which corner to use", () => {
  const found = lint([`"rounded-2xl rounded-t-3xl rounded-br-4xl hover:rounded-4xl"`]);
  expect(named(found, "tailwindcss(no-unknown-classes)")).toEqual([
    "rounded-2xl",
    "rounded-t-3xl",
    "rounded-br-4xl",
    "hover:rounded-4xl",
  ]);
  expect(found[0]?.message).toContain('Did you mean "rounded-xl"?');
});

test("flags quarter steps and half steps from 6px, but not the 2px hairline or sizing", () => {
  const found = lint([
    `"gap-2.25 py-1.25 px-0.75 m-4.5 -mt-0.25 size-2.75"`,
    `"gap-1.5 px-2.5 py-3.5 space-y-2.5 sm:p-1.5 inset-x-3.5"`,
    `"gap-x-1.75 mt-0.5 h-3.25 w-1.5"`,
  ]);
  expect(named(found, "tailwindcss(no-restricted-classes)")).toEqual([
    "gap-2.25",
    "py-1.25",
    "px-0.75",
    "m-4.5",
    "-mt-0.25",
    "gap-1.5",
    "px-2.5",
    "py-3.5",
    "space-y-2.5",
    "sm:p-1.5",
    "inset-x-3.5",
    "gap-x-1.75",
  ]);
});

test("flags a breakpoint written as a literal, not a named one (AVE-85)", () => {
  const found = lint([`"max-[700px]:hidden min-[1100px]:flex max-[43.75rem]:p-2"`]);
  expect(named(found, "tailwindcss(no-restricted-classes)")).toEqual([
    "max-[700px]:hidden",
    "min-[1100px]:flex",
    "max-[43.75rem]:p-2",
  ]);
});

test("flags hit-area with an after: utility in the same class string (AVE-22)", () => {
  // Planted on purpose: the rule must fire on these in the linted copy.
  // oxlint-disable-next-line avenue/hit-area-after
  const found = lint([`"relative hit-area after:rounded-full"`, "`after:absolute px-2 [a]:hit-area`"]);
  expect(found.filter((f) => f.code === "avenue(hit-area-after)").map((f) => f.line)).toHaveLength(2);
});

test("allows Avenue's steps, aliases, named breakpoints, and hit-area apart from after:", () => {
  expect(
    lint([
      `"relative rounded-xs rounded-sm rounded-md rounded-lg rounded-xl rounded-full rounded-t-xl"`,
      `"flex gap-2 p-0.5 px-inset gap-group size-3.5 h-2.5 py-12"`,
      `"max-phone:hidden wide:flex desktop:inline max-w-[700px] min-h-[44px]"`,
      `"relative hit-area pointer-coarse:hit-area"`,
      `"after:absolute after:inset-0"`,
    ]),
  ).toEqual([]);
  // Prose that names both, outside a class attribute, is not a class string.
  expect(lint([`"Disallow an after: utility beside hit-area"`], false)).toEqual([]);
});
