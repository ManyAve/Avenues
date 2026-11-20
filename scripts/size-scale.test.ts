import { expect, test } from "bun:test";
import { buttonVariants } from "#avenue/components/button";
import { toggleVariants } from "#avenue/components/toggle";
import { scaleStep } from "#avenue/lib/control";

// AVE-152: one size scale, md the default. AVE-154 removed the shadcn names ("default", "icon"), so md and icon-md
// are the only names for those steps.

test("no size draws md unless asked for md", () => {
  expect(buttonVariants()).toBe(buttonVariants({ size: "md" }));
  expect(toggleVariants()).toBe(toggleVariants({ size: "md" }));
  // @ts-expect-error "default" is no longer a size.
  expect(buttonVariants({ size: "default" })).not.toBe(buttonVariants({ size: "md" }));
  // @ts-expect-error "icon" is no longer a size.
  expect(buttonVariants({ size: "icon" })).not.toBe(buttonVariants({ size: "icon-md" }));
});

test("data-size carries the step's name", () => {
  expect(scaleStep(undefined)).toBe("md");
  expect(scaleStep(null)).toBe("md");
  expect(scaleStep("sm")).toBe("sm");
});
