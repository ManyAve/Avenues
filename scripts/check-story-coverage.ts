/**
 * Fails when a story is left out of the story tests. Storybook's Vitest addon only runs stories that
 * carry the `test` tag, which every story has unless it (or its meta, or the preview) removes it with
 * `!test`; a story removed that way would never render in a test and nothing would say so.
 *
 * Reads the built index (storybook-static/index.json), so run it after `bun run build-storybook`.
 *
 *   bun run check:story-coverage [index.json]
 */
import { resolve } from "node:path";

interface Entry {
  id: string;
  type: string;
  tags?: string[];
}

export function untestedStories(index: { entries: Record<string, Entry> }): string[] {
  return Object.values(index.entries)
    .filter((e) => e.type === "story" && !(e.tags ?? []).includes("test"))
    .map((e) => e.id);
}

if (import.meta.main) {
  const path = resolve(import.meta.dir, "..", process.argv[2] ?? "storybook-static/index.json");
  const file = Bun.file(path);
  if (!(await file.exists())) {
    console.log(`${path} not found; run bun run build-storybook first.`);
    process.exit(1);
  }
  const index = (await file.json()) as { entries: Record<string, Entry> };
  const stories = Object.values(index.entries).filter((e) => e.type === "story").length;
  const missing = untestedStories(index);
  for (const id of missing) console.log(`${id}  is not tested (its "test" tag was removed)`);
  console.log(`${stories} stories, ${missing.length} left out of the story tests.`);
  process.exit(missing.length > 0 ? 1 : 0);
}
