import { expect, test } from "bun:test";
import { buttonVariants } from "#avenue/components/button";
import { toggleVariants } from "#avenue/components/toggle";
import { scaleStep } from "#avenue/lib/control";

// AVE-152: one size scale. The shadcn names stay as deprecated aliases until AVE-154 shows neither app uses them, and
// they must draw exactly what their new names draw, or an app that hasn't moved yet changes on upgrade.

test("the deprecated size names draw what md and icon-md draw", () => {
  expect(buttonVariants({ size: "default" })).toBe(buttonVariants({ size: "md" }));
  expect(buttonVariants({ size: "icon" })).toBe(buttonVariants({ size: "icon-md" }));
  expect(buttonVariants()).toBe(buttonVariants({ size: "md" }));
  expect(toggleVariants({ size: "default" })).toBe(toggleVariants({ size: "md" }));
  expect(toggleVariants()).toBe(toggleVariants({ size: "md" }));
});

test("data-size carries the step's name, never default", () => {
  expect(scaleStep("default")).toBe("md");
  expect(scaleStep(undefined)).toBe("md");
  expect(scaleStep(null)).toBe("md");
  expect(scaleStep("sm")).toBe("sm");
});
