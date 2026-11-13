import { describe, expect, test } from "bun:test";
import { resolveRef, storyViewport } from "./visual-diff";

describe("resolveRef", () => {
  test("uses the ref when it is a commit here", () => {
    expect(resolveRef("main", (r) => r === "main" || r === "origin/main")).toBe("main");
  });

  test("falls back to origin/<ref> in a clone with no local branch", () => {
    expect(resolveRef("main", (r) => r === "origin/main")).toBe("origin/main");
  });

  test("uses origin/<ref> when the local branch is only behind it (a stale clone)", () => {
    expect(resolveRef("main", () => true, (a, b) => a === "main" && b === "origin/main")).toBe("origin/main");
  });

  test("keeps a local branch that has commits of its own", () => {
    expect(resolveRef("main", () => true, () => false)).toBe("main");
  });

  test("never redirects an origin/ ref", () => {
    expect(resolveRef("origin/main", () => true, () => true)).toBe("origin/main");
  });

  test("is undefined when neither exists", () => {
    expect(resolveRef("nope", () => false)).toBeUndefined();
  });
});

describe("storyViewport", () => {
  const options = { phone: { styles: { width: "390px", height: "844px" } } };

  test("captures a story with no viewport at the desktop size", () => {
    expect(storyViewport(undefined, options)).toEqual({ width: 1280, height: 800 });
    expect(storyViewport({ isRotated: false }, options)).toEqual({ width: 1280, height: 800 });
  });

  test("captures a phone story at the phone's size, as the story tests run it", () => {
    expect(storyViewport({ value: "phone", isRotated: false }, options)).toEqual({ width: 390, height: 844 });
    expect(storyViewport("phone", options)).toEqual({ width: 390, height: 844 });
  });

  test("fails a viewport the preview doesn't define instead of capturing it at the wrong width", () => {
    expect(() => storyViewport({ value: "tablet" }, options)).toThrow(/tablet/);
  });
});
