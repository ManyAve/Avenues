import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";

// An old name stays a deprecated alias until AVE-154's check shows neither Management nor Neighbors uses it, so no
// release can promise when it goes (AVE-158). A version in a `@deprecated` message, a dev warning, or a CHANGELOG or
// ADOPTING.md line about removing old names, is a promise Avenue can't keep: an app team would rush a move that isn't
// needed, or trust a date that has already slipped. Write "deprecated; removed once both apps have moved off it
// (AVE-154)" instead.

const root = new URL("..", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

const VERSION = /\bv?\d+\.\d+(?:\.\d+)?\b/;
/** Wording that ties the removal of an old name to a release. `\s+` crosses line breaks, as prose wraps. */
const REMOVAL_PROMISES = [
  /\b(?:until|removed in|removes? (?:it |them )?in|go(?:es)? in|gone in|kept until|stays? until|last(?:s)? until|drop(?:ped)? in)\s+v?\d+\.\d+/gi,
  /\b(?:rename|move)\b[^.]*?\bbefore\s+v?\d+\.\d+/gi,
  /\bfor one (?:minor )?release\b/gi,
  /\b(?:until|by) the next minor\b/gi,
];

function sourceFiles(dir: string): string[] {
  return readdirSync(new URL(dir, root), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name))
    .map((entry) => `${entry.parentPath.slice(new URL(".", root).pathname.length)}/${entry.name}`);
}

/** Each `@deprecated` message: from the tag to the end of its comment or the next tag. */
export function deprecatedMessages(text: string): string[] {
  return [...text.matchAll(/@deprecated\b([\s\S]*?)(?=\*\/|\n\s*\*\s*@\w)/g)].map((m) => m[1]!.replace(/\s*\*\s*/g, " "));
}

/** Each dev warning that mentions an old or deprecated name. */
export function deprecationWarnings(text: string): string[] {
  return [...text.matchAll(/console\.warn\(([\s\S]*?)\);/g)].map((m) => m[1]!).filter((m) => /deprecat|old name|renamed/i.test(m));
}

export function removalPromises(text: string): string[] {
  return REMOVAL_PROMISES.flatMap((pattern) => [...text.matchAll(pattern)].map((m) => m[0].replace(/\s+/g, " ")));
}

test("the checks catch a planted promise", () => {
  expect(deprecatedMessages("/** @deprecated Use `items`. Kept until v0.29.0 (AVE-146). */").some((m) => VERSION.test(m))).toBe(true);
  expect(deprecatedMessages("/**\n * @deprecated Use `type` (v0.30.0, AVE-149).\n * @param x\n */").some((m) => VERSION.test(m))).toBe(true);
  expect(deprecatedMessages("/** @deprecated Use MenuItem. */").some((m) => VERSION.test(m))).toBe(false);
  expect(deprecationWarnings('console.warn("Avenue: `reason` is deprecated; it goes in v0.40.0.");')).toHaveLength(1);
  expect(removalPromises("Deprecated, removed in v0.32.0 (AVE-154)")).toHaveLength(1);
  expect(removalPromises("the old names still work until\n  v0.27.0, marked")).toHaveLength(1);
  expect(removalPromises("Rename `variant` to `type` in toasts before\n    v0.32.0.")).toHaveLength(1);
  expect(removalPromises("keep the old name for one minor release")).toHaveLength(1);
  expect(removalPromises("Deprecated; removed once both apps have moved off it (AVE-154).")).toEqual([]);
});

test("no @deprecated message or deprecation warning in src names a version", () => {
  const found = sourceFiles("src").flatMap((file) => {
    const text = read(file);
    return [...deprecatedMessages(text), ...deprecationWarnings(text)]
      .filter((message) => VERSION.test(message))
      .map((message) => `${file}: ${message.trim()}`);
  });
  expect(found).toEqual([]);
});

test("no CHANGELOG, ADOPTING.md, AGENTS.md or src line promises a release that removes old names", () => {
  const files = ["CHANGELOG.md", "ADOPTING.md", "AGENTS.md", "README.md", ...sourceFiles("src")];
  const found = files.flatMap((file) => removalPromises(read(file)).map((promise) => `${file}: ${promise}`));
  expect(found).toEqual([]);
});
