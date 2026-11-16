/**
 * Compares Avenue's token files with ManyAve Management's and lists every difference.
 *
 *   bun run tokens:compare [path/to/manyave-management]
 *
 * The app checkout defaults to ../manyave-management (or AVENUE_APP_DIR). Avenue never imports the app: this script
 * only reads its files at check time. Differences agreed in AVE-2 (spacing, control heights, corners) and AVE-13
 * (dark info and destructive fills) are marked intended, with the reason. Anything else fails the check, including
 * a palette value that drifts (the app redefines Tailwind's own teal-* and slate-* names, so drift there would be
 * silent otherwise).
 */
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { type Declaration, keyOf, readDeclarations } from "./css-tokens";

interface FilePair {
  label: string;
  app: string;
  avenue: string;
  /** Only these scopes of the app file hold tokens; the rest is app shell (window chrome, scrolling). */
  scopes?: (scope: string) => boolean;
}

const pairs: FilePair[] = [
  { label: "palette, type, semantic colours", app: "src/tokens.css", avenue: "src/styles/tokens.css" },
  {
    label: "Tailwind theme and tints",
    app: "src/index.css",
    avenue: "src/styles/avenue.css",
    scopes: (scope) => scope === "@theme inline" || scope.startsWith("[data-tint"),
  },
  { label: "desktop type scale", app: "src/desktop.css", avenue: "src/styles/desktop.css" },
];

const AVE2 = "AVE-2 corner scale";
const AVE2_SPACING = "AVE-2 spacing and control heights";
const AVE115 = "AVE-115 opt-in lifted surfaces";
const LIFTED_LIGHT = ':root[data-surface="lifted"]:not(.dark), :root:not(.dark) [data-surface="lifted"]';
const LIFTED_DARK = ':root.dark[data-surface="lifted"], :root.dark [data-surface="lifted"]';

/** Value changes Avenue makes on purpose. */
const intendedChanges: Record<string, string> = {
  ".dark :: --info": "AVE-13: dark info fill 0.6 -> 0.54 lightness so its foreground reaches 4.5:1",
  ".dark :: --destructive": "AVE-13: dark destructive fill 0.58 -> 0.56 lightness so its foreground reaches 4.5:1",
};

/** App tokens Avenue drops on purpose. */
const intendedRemovals: Record<string, string> = {
  "@theme inline :: --radius-2xl": `${AVE2}: 2xl retired (18px)`,
  "@theme inline :: --radius-3xl": `${AVE2}: 3xl retired (22px)`,
  "@theme inline :: --radius-4xl": `${AVE2}: 4xl retired (26px); the Badge's rounded-4xl becomes rounded-full`,
};

/** Avenue tokens the app doesn't have yet. */
const intendedAdditions: Record<string, string> = {
  "@theme inline :: --radius-*": `${AVE2}: clears Tailwind's radius namespace so retired steps can't return`,
  "@theme inline :: --radius-xs": `${AVE2}: new 4px step (replaces Tailwind's 2px rounded-xs)`,
  "@theme inline :: --spacing-inline": `${AVE2_SPACING}: 4px`,
  "@theme inline :: --spacing-group": `${AVE2_SPACING}: 8px`,
  "@theme inline :: --spacing-row-y": `${AVE2_SPACING}: 12px`,
  "@theme inline :: --spacing-inset": `${AVE2_SPACING}: 16px`,
  "@theme inline :: --spacing-page": `${AVE2_SPACING}: 16px, 20px from 640px`,
  "@theme inline :: --spacing-section": `${AVE2_SPACING}: 24px`,
  "@theme inline :: --spacing-control-xs": `${AVE2_SPACING}: 24px`,
  "@theme inline :: --spacing-control-sm": `${AVE2_SPACING}: 28px`,
  "@theme inline :: --spacing-control-md": `${AVE2_SPACING}: 32px`,
  "@theme inline :: --spacing-control-lg": `${AVE2_SPACING}: 40px`,
  ":root :: --avenue-page-inset": `${AVE2_SPACING}: page inset below 640px`,
  "@media (min-width: 40rem) > :root :: --avenue-page-inset": `${AVE2_SPACING}: page inset from 640px`,
  [`${LIFTED_LIGHT} :: --background`]: `${AVE115}: the page steps down so a borderless card lifts off it`,
  [`${LIFTED_LIGHT} :: --muted`]: `${AVE115}: a field's fill shows on a card`,
  [`${LIFTED_LIGHT} :: --accent`]: `${AVE115}: a hover or skeleton fill shows on a card`,
  [`${LIFTED_DARK} :: --muted`]: `${AVE115}: dark muted one step above the card instead of equal to it`,
};

const appDir = resolve(process.argv[2] ?? process.env.AVENUE_APP_DIR ?? "../manyave-management");
const avenueDir = resolve(import.meta.dir, "..");

if (!existsSync(join(appDir, "src/tokens.css"))) {
  console.error(`No ManyAve Management checkout at ${appDir}. Pass its path: bun run tokens:compare <path>`);
  process.exit(2);
}

const appCommit = Bun.spawnSync(["git", "-C", appDir, "rev-parse", "--short", "HEAD"]).stdout.toString().trim();
console.log(`Avenue tokens vs ManyAve Management${appCommit ? ` at ${appCommit}` : ""} (${appDir})\n`);

const read = async (path: string) => readDeclarations(await Bun.file(path).text());
const byKey = (list: Declaration[]) => new Map(list.map((d) => [keyOf(d), d]));

const unexpected: string[] = [];
const intended: string[] = [];
const seen = new Set<string>();
let same = 0;

for (const pair of pairs) {
  const appDecls = (await read(join(appDir, pair.app))).filter((d) => !pair.scopes || pair.scopes(d.scope));
  const avenueDecls = await read(join(avenueDir, pair.avenue));
  const app = byKey(appDecls);
  const avenue = byKey(avenueDecls);
  let pairSame = 0;

  for (const [key, a] of app) {
    seen.add(key);
    const b = avenue.get(key);
    if (!b) {
      const reason = intendedRemovals[key];
      if (reason) intended.push(`  removed   ${key}\n            ${reason}`);
      else unexpected.push(`  missing   ${key}\n            app: ${a.value}`);
    } else if (a.value !== b.value) {
      const reason = intendedChanges[key];
      const line = `  changed   ${key}\n            app:    ${a.value}\n            avenue: ${b.value}`;
      if (reason) intended.push(`${line}\n            ${reason}`);
      else unexpected.push(line);
    } else {
      pairSame += 1;
    }
  }
  for (const [key, b] of avenue) {
    if (app.has(key)) continue;
    const reason = intendedAdditions[key];
    if (reason) intended.push(`  added     ${key} = ${b.value}\n            ${reason}`);
    else unexpected.push(`  added     ${key} = ${b.value}\n            not in the app and not an agreed addition`);
  }
  same += pairSame;
  console.log(`${pair.avenue.padEnd(24)} ${String(pairSame).padStart(3)} same as ${pair.app} (${pair.label})`);
}

// An intended difference that no longer happens is stale: say so, so the lists above stay honest.
const stale = [
  ...Object.keys(intendedChanges),
  ...Object.keys(intendedRemovals),
].filter((key) => !seen.has(key));
for (const key of stale) unexpected.push(`  stale     ${key}\n            listed as intended but the app no longer has it`);

console.log(`\n${same} tokens match the app.`);
console.log(`\nIntended differences (${intended.length}):`);
console.log(intended.join("\n") || "  none");
console.log(`\nUnexpected differences (${unexpected.length}):`);
console.log(unexpected.join("\n") || "  none");

process.exit(unexpected.length > 0 ? 1 : 0);
