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

  test("flags quarter steps and half steps from 6px, but not the 2px hairline", () => {
    expect(matches(`"gap-2.25 py-1.25 gap-1.75 px-0.75 m-4.5 -mt-0.25 gap-0.5 mt-0.5 size-2.75 h-3.25 w-1.5"`)).toEqual([
      "gap-2.25",
      "py-1.25",
      "gap-1.75",
      "px-0.75",
      "m-4.5",
      "-mt-0.25",
    ]);
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
  test("flags hit-area with an after: utility in the same class string", () => {
    expect(matches(`"relative hit-area after:rounded-full"`)).toEqual([`"relative hit-area after:rounded-full"`]);
    expect(matches(`'after:absolute px-2 hit-area'`)).toEqual([`'after:absolute px-2 hit-area'`]);
  });

  test("allows hit-area alone, after: alone, and the two in separate strings", () => {
    expect(matches(`"relative hit-area [a]:hit-area" "after:absolute after:inset-0"`)).toEqual([]);
    expect(matches(`"pointer-coarse:hit-area-x" "before:absolute"`)).toEqual([]);
  });
  test("flags a breakpoint written as a literal, not a named one (AVE-85)", () => {
    const found = findViolations("x.tsx", 'className="max-[700px]:hidden min-[1100px]:flex max-[43.75rem]:p-2"');
    expect(found.map((f) => f.match)).toEqual(["max-[700px]:", "min-[1100px]:", "max-[43.75rem]:"]);
    expect(findViolations("x.tsx", 'className="max-phone:hidden wide:flex desktop:inline max-w-[700px] min-h-[44px]"')).toEqual([]);
  });
});
