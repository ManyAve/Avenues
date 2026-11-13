import { expect, test } from "bun:test";
import { parityMapProblems, patternProblems, untestedStories } from "./check-story-coverage";

test("lists stories without the test tag and ignores docs entries", () => {
  const index = {
    entries: {
      a: { id: "a", type: "story", tags: ["dev", "test"] },
      b: { id: "b", type: "story", tags: ["dev"] },
      c: { id: "c", type: "story" },
      d: { id: "d", type: "docs", tags: ["dev"] },
    },
  };
  expect(untestedStories(index)).toEqual(["b", "c"]);
});

const story = (id: string, importPath: string, tags: string[]) => ({ id, type: "story", importPath, tags });

test("each kind needs its tag: pattern, upstream (agent) or none", () => {
  const index = {
    entries: {
      a: story("a", "./src/stories/components/Combobox.stories.tsx", ["test", "pattern:combobox"]),
      b: story("b", "./src/stories/components/DropdownMenu.stories.tsx", ["agent"]),
      c: story("c", "./src/stories/components/Select.stories.tsx", ["test"]),
    },
  };
  expect(patternProblems(["combobox", "dropdown-menu", "select", "card"], index)).toEqual([
    'dropdown-menu  needs a story tagged "agent" in its stories file',
    'select  needs a story tagged "agent" in its stories file',
  ]);
});

test("the tag must sit in the component's own stories file", () => {
  const index = { entries: { a: story("a", "./src/stories/composites/Form.stories.tsx", ["test", "pattern:combobox"]) } };
  expect(patternProblems(["combobox"], index)).toHaveLength(1);
});

test("an unlisted component and an unknown pattern tag both fail", () => {
  const index = { entries: { a: story("a", "./src/stories/components/Rating.stories.tsx", ["test", "pattern:stars"]) } };
  expect(patternProblems(["rating"], index)).toEqual([
    'a  is tagged "pattern:stars", which isn\'t a pattern the testing kit knows',
    "src/components/rating.tsx  isn't in scripts/component-patterns.ts; say how its accessibility is proven",
  ]);
});

test("AVE-71: a component story with no parity entry, or an entry for a removed story, fails", () => {
  const storyEntry = (id: string) => ({ id, type: "story", tags: ["test"] });
  const index = {
    entries: {
      a: storyEntry("components-button--default"),
      b: storyEntry("components-button--new-variant"),
      c: storyEntry("foundations-spacing--rhythm"),
    },
  };
  const map = {
    "components-button--default": [{ app: "ui-button--default" }],
    "components-button--removed": { none: "A story that was removed from Avenue since." },
  };
  const problems = parityMapProblems(index, map);
  expect(problems.some((p) => p.startsWith("components-button--new-variant has no pair"))).toBe(true);
  expect(problems.some((p) => p.startsWith("components-button--removed is in the pair map"))).toBe(true);
  // Foundations pages aren't paired with the app.
  expect(problems.some((p) => p.includes("foundations-"))).toBe(false);
  expect(problems).toHaveLength(2);
});

test("AVE-77 QA: a glyph allowance that doesn't name both icons fails", () => {
  const index = { entries: { a: { id: "components-button--sizes", type: "story", tags: ["test"] } } };
  const pair = (allow: object[]) => ({ "components-button--sizes": [{ label: "sm", app: "ui-button--sm", allow }] });
  const open = parityMapProblems(index, pair([{ prop: "glyph", because: "app: x.tsx: a different story icon" }]) as never);
  expect(open).toEqual([
    "components-button--sizes (sm): a glyph allowance must name the app's and Avenue's icon (scripts/parity-pairs.ts)",
  ]);
  const pinned = pair([{ prop: "glyph", app: "lucide-receipt", avenue: "lucide-download", because: "app: x.tsx: ..." }]);
  expect(parityMapProblems(index, pinned as never)).toEqual([]);
});
