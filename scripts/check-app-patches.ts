#!/usr/bin/env bun
/**
 * For an app that installs Avenue (AVE-104): Bun applies `patchedDependencies` only from the project that runs
 * `bun install`, so Avenue's ui-sdk patches (patches/) don't apply inside the app unless it carries the same files
 * and lists them itself. Run from the app's root, this fails when a patch in the installed Avenue tag is missing from
 * the app's patches/, differs from it, or isn't listed in the app's package.json, so moving to a new tag can't
 * silently drop a fix.
 *
 *   avenue-check-patches   (in the app's package.json scripts; README, "Checks for apps")
 */
import { readdir } from "node:fs/promises";
import { join } from "node:path";

/** Problems with an app's copies of Avenue's patches, as messages; empty when it carries and lists every one. */
export function patchProblems(
  avenue: ReadonlyMap<string, string>,
  ours: ReadonlyMap<string, string>,
  listed: Readonly<Record<string, string>>,
): string[] {
  const problems: string[] = [];
  for (const [name, text] of avenue) {
    // Bun names a patch file after the package, with the scope's slash encoded: @ui-sdk%2Fcore@0.1.0-beta.2.patch.
    const key = decodeURIComponent(name.replace(/\.patch$/, ""));
    if (!ours.has(name)) problems.push(`patches/${name} is missing: copy it from node_modules/@manyave/avenue/patches/`);
    else if (ours.get(name) !== text) problems.push(`patches/${name} differs from the one in the installed Avenue tag`);
    if (listed[key] !== `patches/${name}`) problems.push(`package.json patchedDependencies doesn't list "${key}"`);
  }
  return problems;
}

async function readPatches(dir: string): Promise<Map<string, string>> {
  const files = await readdir(dir).catch(() => [] as string[]);
  const out = new Map<string, string>();
  for (const name of files.filter((f) => f.endsWith(".patch")).sort()) {
    out.set(name, await Bun.file(join(dir, name)).text());
  }
  return out;
}

if (import.meta.main) {
  const app = process.cwd();
  const avenue = await readPatches(join(app, "node_modules/@manyave/avenue/patches"));
  if (avenue.size === 0) {
    console.error("node_modules/@manyave/avenue/patches has no patches: is @manyave/avenue installed here?");
    process.exit(1);
  }
  const pkg = (await Bun.file(join(app, "package.json")).json()) as { patchedDependencies?: Record<string, string> };
  const problems = patchProblems(avenue, await readPatches(join(app, "patches")), pkg.patchedDependencies ?? {});
  for (const p of problems) console.error(p);
  if (problems.length > 0) process.exit(1);
  console.log(`Avenue's ${avenue.size} ui-sdk patch file(s) are carried and listed.`);
}
