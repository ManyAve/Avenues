import { describe, expect, test } from "bun:test";
import { buildStamp } from "./stamp-version";

const now = new Date("2026-11-13T00:00:00Z");

describe("buildStamp", () => {
  test("uses the commit Workers Builds gives it", () => {
    const stamp = buildStamp({ WORKERS_CI_COMMIT_SHA: "abc123", WORKERS_CI_BRANCH: "main" }, () => "head", now);
    expect(stamp).toEqual({ commit: "abc123", branch: "main", builtAt: "2026-11-13T00:00:00.000Z", by: "workers-builds" });
  });

  test("falls back to the checkout's HEAD for a deploy by hand", () => {
    const stamp = buildStamp({}, () => "head", now);
    expect(stamp.commit).toBe("head");
    expect(stamp.branch).toBeNull();
    expect(stamp.by).toBe("by-hand");
  });
});
