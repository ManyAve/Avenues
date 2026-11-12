import { describe, expect, test } from "bun:test";
import { findViolations } from "./check-classes";

const matches = (text: string) => findViolations("x.tsx", text).map((f) => f.match);

describe("check:classes", () => {
  test("flags retired corners in every form", () => {
    expect(matches(`"rounded-2xl rounded-t-3xl rounded-br-4xl hover:rounded-4xl"`)).toEqual([
      "rounded-2xl",
      "rounded-t-3xl",
      "rounded-br-4xl",
      "rounded-4xl",
    ]);
  });

  test("allows Avenue's corner steps", () => {
    expect(matches(`"rounded-xs rounded-sm rounded-md rounded-lg rounded-xl rounded-full rounded-t-xl"`)).toEqual([]);
  });

  test("flags off-grid spacing", () => {
    expect(matches(`"gap-1.5 px-2.5 py-3.5 -mt-1.5 space-y-2.5 sm:p-1.5 inset-x-3.5 gap-x-2.5"`)).toEqual([
      "gap-1.5",
      "px-2.5",
      "py-3.5",
      "-mt-1.5",
      "space-y-2.5",
      "p-1.5",
      "inset-x-3.5",
      "gap-x-2.5",
    ]);
  });

  test("allows grid steps, aliases, half-step nudges and sizing", () => {
    expect(matches(`"gap-2 p-0.5 px-inset gap-group size-3.5 h-2.5 w-1.5 py-12 text-3.5"`)).toEqual([]);
  });

  test("reports the line", () => {
    expect(findViolations("x.tsx", "ok\n<div className='gap-1.5' />")[0]?.line).toBe(2);
  });
});
