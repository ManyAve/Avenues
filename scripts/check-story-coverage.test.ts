import { expect, test } from "bun:test";
import { untestedStories } from "./check-story-coverage";

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
