import { expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// AVE-171: Avenue's class rules run inside oxlint (lint/classes.mjs). Each line below is planted in a file and linted
// with Avenue's own oxlint.config.ts; the test fails if a rule stops firing, or starts firing on an allowed class.
const root = join(import.meta.dir, "..");
// The rules apps get from lint/classes.mjs. Avenue's own config adds more of the plugin's rules; this file tests these.
const CLASS_RULES = [
  "tailwindcss(no-unknown-classes)",
  "tailwindcss(no-restricted-classes)",
  "tailwindcss(no-hardcoded-colors)",
  "tailwindcss(no-unnecessary-arbitrary-value)",
  "tailwindcss(prefer-scale-token)",
  "tailwindcss(prefer-theme-tokens)",
  "avenue(hit-area-after)",
];

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

// AVE-184: raw sizes, weights, shadows, layers and durations, each with the names to use in its message.
test("flags typed-in type sizes, weights, Tailwind's shadows, page layers and durations", () => {
  // Planted on purpose: the rules must fire on these in the linted copy.
  // oxlint-disable-next-line tailwindcss/no-restricted-classes
  const found = lint([`"text-[11px] md:text-[1.75rem] text-lg text-2xl/7 font-[550] shadow shadow-md hover:shadow-2xl"`, `"z-50 z-[60] -z-[1] duration-300 duration-[250ms]"`]);
  expect(named(found, "tailwindcss(no-restricted-classes)")).toEqual([
    "text-[11px]",
    "md:text-[1.75rem]",
    "text-lg",
    "text-2xl/7",
    "font-[550]",
    "shadow",
    "shadow-md",
    "hover:shadow-2xl",
    "z-50",
    "z-[60]",
    "-z-[1]",
    "duration-300",
    "duration-[250ms]",
  ]);
  expect(found.find((f) => f.line.includes("text-[11px]"))?.message).toContain("text-meta (14px)");
  expect(found.find((f) => f.message.includes('"font-[550]"'))?.message).toContain("font-emphasis (550)");
  expect(found.find((f) => f.message.includes('"shadow-md"'))?.message).toContain("shadow-popover");
  expect(found.find((f) => f.message.includes('"z-50"'))?.message).toContain("z-overlay (50)");
  expect(found.find((f) => f.message.includes('"duration-300"'))?.message).toContain("duration-slow (200ms");
});

test("flags a typed-in colour, an arbitrary value a class already draws, and a literal equal to a token", () => {
  // Planted on purpose: the rules must fire on these in the linted copy.
  // oxlint-disable-next-line tailwindcss/no-hardcoded-colors
  const found = lint([`"bg-[#fff] [mask-image:linear-gradient(90deg,#000,transparent)] w-[640px] z-[5] p-[16px] bg-(--card)"`]);
  expect(named(found, "tailwindcss(no-hardcoded-colors)")).toEqual(["bg-[#fff]", "[mask-image:linear-gradient(90deg,#000,transparent)]"]);
  expect([
    ...named(found, "tailwindcss(prefer-scale-token)"),
    ...named(found, "tailwindcss(no-unnecessary-arbitrary-value)"),
    ...named(found, "tailwindcss(prefer-theme-tokens)"),
  ].toSorted()).toEqual(["bg-(--card)", "p-[16px]", "w-[640px]", "z-[5]"]);
});

test("allows Avenue's named sizes, weights, shadows, layers and durations, and a local order", () => {
  expect(
    lint([
      `"text-meta text-control text-compact text-post text-title text-heading text-display text-base md:text-field"`,
      `"font-normal font-quiet font-medium font-emphasis font-semibold font-heading"`,
      `"shadow-none shadow-control shadow-card shadow-popover z-sticky z-overlay z-toast z-1 -z-1 focus:z-10"`,
      `"duration-fast duration-moderate duration-slow"`,
      // Whole 4px steps only: a phone's 390px stays a literal, not w-97.5.
      `"max-w-[390px] max-phone:mask-r-from-[calc(100%-28px)]"`,
    ]),
  ).toEqual([]);
});

test("allows Avenue's steps, aliases, named breakpoints, and hit-area apart from after:", () => {
  expect(
    lint([
      `"relative rounded-xs rounded-sm rounded-md rounded-lg rounded-xl rounded-full rounded-t-xl"`,
      `"flex gap-2 p-0.5 px-inset gap-group size-3.5 h-2.5 py-12"`,
      `"max-phone:hidden wide:flex desktop:inline max-w-[390px] min-h-[30px]"`,
      `"relative hit-area pointer-coarse:hit-area"`,
      `"after:absolute after:inset-0"`,
    ]),
  ).toEqual([]);
  // Prose that names both, outside a class attribute, is not a class string.
  expect(lint([`"Disallow an after: utility beside hit-area"`], false)).toEqual([]);
});
