/**
 * Fails when a story is left out of the story tests, or a component misses its accessibility pattern
 * check. Reads the built index (storybook-static/index.json), so run it after `bun run build-storybook`.
 *
 * 1. Storybook's Vitest addon only runs stories that carry the `test` tag, which every story has unless
 *    it (or its meta, or the preview) removes it with `!test`; a story removed that way would never
 *    render in a test and nothing would say so.
 * 3. AVE-71: every component and composite story has an entry in scripts/parity-pairs.ts (the app story it
 *    was ported from, or a written reason it has none), and the map names no story that's gone. `bun run
 *    parity` needs the app checked out, so `check` holds the map itself; parity then checks the app side.
 * 2. AVE-18: every file in src/components must be listed in scripts/component-patterns.ts. A component
 *    with a pattern needs a tested story tagged `pattern:<that pattern>` in its own stories file; an
 *    upstream ui-sdk component needs one tagged `agent`. The story tests run those checks
 *    (.storybook/pattern-check.ts).
 *
 *   bun run check:story-coverage [index.json]
 */
import { basename, resolve } from "node:path";
import { COMPONENT_PROOF, PATTERNS, componentForStoryFile, requiredTag } from "./component-patterns";
import { mapProblems, storiesToPair, type PairEntry } from "./parity-lib";
import { PAIRS } from "./parity-pairs";

interface Entry {
  id: string;
  type: string;
  importPath?: string;
  tags?: string[];
}
type Index = { entries: Record<string, Entry> };

const tested = (e: Entry) => (e.tags ?? []).includes("test");

export function untestedStories(index: Index): string[] {
  return Object.values(index.entries)
    .filter((e) => e.type === "story" && !tested(e))
    .map((e) => e.id);
}

/** Problems with pattern coverage, given the component names that exist and the built index. */
export function patternProblems(
  components: readonly string[],
  index: Index,
  map: typeof COMPONENT_PROOF = COMPONENT_PROOF,
): string[] {
  const problems: string[] = [];
  const stories = Object.values(index.entries).filter((e) => e.type === "story");
  const known = new Set<string>(PATTERNS);

  for (const story of stories) {
    for (const tag of story.tags ?? []) {
      if (tag.startsWith("pattern:") && !known.has(tag.slice(8))) {
        problems.push(`${story.id}  is tagged "${tag}", which isn't a pattern the testing kit knows`);
      }
    }
  }

  for (const component of components) {
    const proof = map[component];
    if (proof === undefined) {
      problems.push(`src/components/${component}.tsx  isn't in scripts/component-patterns.ts; say how its accessibility is proven`);
      continue;
    }
    const tag = requiredTag(proof);
    if (tag === undefined) continue;
    const covered = stories.some(
      (s) =>
        tested(s) &&
        s.importPath !== undefined &&
        componentForStoryFile(s.importPath) === component &&
        (s.tags ?? []).includes(tag),
    );
    if (!covered) problems.push(`${component}  needs a story tagged "${tag}" in its stories file`);
  }
  return problems;
}

/**
 * Problems with the parity map, judged from Avenue's side only: a component or composite story with no entry, an
 * entry for a story that no longer exists, an allowance without an accepted reason. Whether each app story exists is
 * checked by `bun run parity`, which has the app's index.
 */
export function parityMapProblems(index: Index, map: Record<string, PairEntry> = PAIRS): string[] {
  const avenue = storiesToPair(Object.values(index.entries).filter((e) => e.type === "story").map((e) => e.id));
  const appNamed = Object.values(map).flatMap((entry) => (Array.isArray(entry) ? entry.map((pair) => pair.app) : []));
  // A glyph allowance must name both icons (AVE-77 QA): parity gives Avenue the app's icon before judging pixels, so
  // an open-ended one would let any icon change on that part pass unseen.
  const openGlyphs = Object.entries(map).flatMap(([story, entry]) =>
    Array.isArray(entry)
      ? entry.flatMap((pair) =>
          (pair.allow ?? [])
            .filter((a) => a.prop === "glyph" && (!a.app || !a.avenue))
            .map(() => `${story} (${pair.label}): a glyph allowance must name the app's and Avenue's icon`),
        )
      : [],
  );
  return [...mapProblems(map, avenue, appNamed), ...openGlyphs].map((p) => `${p} (scripts/parity-pairs.ts)`);
}

if (import.meta.main) {
  const root = resolve(import.meta.dir, "..");
  const path = resolve(root, process.argv[2] ?? "storybook-static/index.json");
  const file = Bun.file(path);
  if (!(await file.exists())) {
    console.log(`${path} not found; run bun run build-storybook first.`);
    process.exit(1);
  }
  const index = (await file.json()) as Index;
  const stories = Object.values(index.entries).filter((e) => e.type === "story").length;
  const missing = untestedStories(index);
  for (const id of missing) console.log(`${id}  is not tested (its "test" tag was removed)`);

  const components = [...new Bun.Glob("*.tsx").scanSync({ cwd: resolve(root, "src/components") })].map((f) =>
    basename(f, ".tsx"),
  );
  const problems = patternProblems(components, index);
  for (const p of problems) console.log(p);
  const parity = parityMapProblems(index);
  for (const p of parity) console.log(p);

  console.log(`${stories} stories, ${missing.length} left out of the story tests.`);
  console.log(`${components.length} components, ${problems.length} pattern coverage problems.`);
  console.log(`${Object.keys(PAIRS).length} parity map entries, ${parity.length} parity map problems.`);
  process.exit(missing.length + problems.length + parity.length > 0 ? 1 : 0);
}
