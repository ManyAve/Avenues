import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { drift, paths } from "./ui-sdk-skill";

function tree(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "skill-"));
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(join(dir, name, ".."), { recursive: true });
    writeFileSync(join(dir, name), text);
  }
  return dir;
}

describe("drift", () => {
  test("finds changed, missing and extra files", () => {
    const source = tree({ "SKILL.md": "new", "references/a.md": "a", "references/b.md": "b" });
    const target = tree({ "SKILL.md": "old", "references/a.md": "a", "references/c.md": "c" });
    expect(drift(source, target)).toEqual(["SKILL.md", "references/b.md", "references/c.md"]);
  });

  test("is empty for identical trees", () => {
    const files = { "SKILL.md": "x", "references/a.md": "a" };
    expect(drift(tree(files), tree(files))).toEqual([]);
  });
});

test("the committed skill matches the installed @ui-sdk/core (run `bun run ui-sdk:skill`)", () => {
  expect(drift(paths.source, paths.target)).toEqual([]);
});
