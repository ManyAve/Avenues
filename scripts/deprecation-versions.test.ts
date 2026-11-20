import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";

// An old name stays a deprecated alias until AVE-154's check shows neither Management nor Neighbors uses it, so no
// release can promise when it goes (AVE-158). A version in a `@deprecated` message, a dev warning, or a CHANGELOG or
// ADOPTING.md line about removing old names, is a promise Avenue can't keep: an app team would rush a move that isn't
// needed, or trust a date that has already slipped. Write "deprecated; removed once both apps have moved off it
// (AVE-154)" instead.
//
// A removal that has happened is a record, not a promise: once a release has removed names, CHANGELOG and ADOPTING.md
// say which release did it ("Removed in v0.43.0"). So removal wording may name a release whose own CHANGELOG entry
// says it removed names (an item led by "**Removed the deprecated names**"); any other version is still a promise.

const root = new URL("..", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

/**
 * The releases that removed old names: each CHANGELOG entry with an item led by "**Removed the deprecated names**" (as
 * AVE-154's is). Entries that only deprecated a name don't count, though they cite AVE-154 as the card to remove it.
 */
export function removalReleases(changelog: string): string[] {
  return changelog
    .split(/^## /m)
    .filter((entry) => /^- \*\*Removed the deprecated names\b/m.test(entry))
    .flatMap((entry) => entry.match(/^v(\d+\.\d+\.\d+)/)?.[1] ?? []);
}
const removed = removalReleases(read("CHANGELOG.md"));

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

/** Removal wording tied to a release, unless that release is one of `records`, the releases that did remove names. */
export function removalPromises(text: string, records: readonly string[] = removed): string[] {
  return REMOVAL_PROMISES.flatMap((pattern) => [...text.matchAll(pattern)].map((m) => m[0].replace(/\s+/g, " "))).filter(
    (wording) => {
      // The wording patterns stop at the minor number, so "v0.43" names release 0.43.0.
      const named = wording.match(VERSION)?.[0]?.replace(/^v/, "");
      return !named || !records.some((release) => release === named || release.startsWith(`${named}.`));
    },
  );
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
  // A removal that shipped is a record; one in a release still to come is a promise.
  expect(removalPromises("Removed in v0.43.0 (AVE-154).", ["0.43.0"])).toEqual([]);
  expect(removalPromises("Removed in v0.44.0 (AVE-154).", ["0.43.0"])).toHaveLength(1);
  expect(removalPromises("Deprecated, removed in v0.32.0 (AVE-154)", ["0.43.0"])).toHaveLength(1);
  expect(removalReleases("## Unreleased\n\n## v0.43.0 (2026-11-20)\n\n- **Removed the deprecated names** (AVE-154).\n\n## v0.42.0\n\n- Deprecated; removed once both apps have moved off it (AVE-154).\n")).toEqual([
    "0.43.0",
  ]);
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
