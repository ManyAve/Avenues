import { describe, expect, test } from "bun:test";
import { resolveRef } from "./visual-diff";

describe("resolveRef", () => {
  test("uses the ref when it is a commit here", () => {
    expect(resolveRef("main", (r) => r === "main" || r === "origin/main")).toBe("main");
  });

  test("falls back to origin/<ref> in a clone with no local branch", () => {
    expect(resolveRef("main", (r) => r === "origin/main")).toBe("origin/main");
  });

  test("is undefined when neither exists", () => {
    expect(resolveRef("nope", () => false)).toBeUndefined();
  });
});
