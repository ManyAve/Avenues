import { expect, test } from "bun:test";
import { patternProblems, untestedStories } from "./check-story-coverage";

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
