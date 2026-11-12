/**
 * Fails when a story is left out of the story tests, or a component misses its accessibility pattern
 * check. Reads the built index (storybook-static/index.json), so run it after `bun run build-storybook`.
 *
 * 1. Storybook's Vitest addon only runs stories that carry the `test` tag, which every story has unless
 *    it (or its meta, or the preview) removes it with `!test`; a story removed that way would never
 *    render in a test and nothing would say so.
 * 2. AVE-18: every file in src/components must be listed in scripts/component-patterns.ts, and a
 *    component listed with a pattern needs a tested story tagged `pattern:<that pattern>` in its own
 *    stories file. The story tests run the check (.storybook/pattern-check.ts).
 *
 *   bun run check:story-coverage [index.json]
 */
import { basename, resolve } from "node:path";
import { COMPONENT_PATTERNS, PATTERNS, componentForStoryFile } from "./component-patterns";

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
  map: typeof COMPONENT_PATTERNS = COMPONENT_PATTERNS,
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
    const rule = map[component];
    if (rule === undefined) {
      problems.push(`src/components/${component}.tsx  isn't in scripts/component-patterns.ts; give it a pattern or a reason it has none`);
      continue;
    }
    if (typeof rule !== "string") continue;
    const covered = stories.some(
      (s) =>
        tested(s) &&
        s.importPath !== undefined &&
        componentForStoryFile(s.importPath) === component &&
        (s.tags ?? []).includes(`pattern:${rule}`),
    );
    if (!covered) problems.push(`${component}  needs a story tagged "pattern:${rule}" in its stories file`);
  }
  return problems;
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

  console.log(`${stories} stories, ${missing.length} left out of the story tests.`);
  console.log(`${components.length} components, ${problems.length} pattern coverage problems.`);
  process.exit(missing.length + problems.length > 0 ? 1 : 0);
}
