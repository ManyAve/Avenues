import { expect, test } from "bun:test";
import { viewportProblem } from "../.storybook/viewport-check";

const options = { phone: { styles: { width: "390px", height: "844px" } } };

test("a story that asks for the phone must run 390px wide", () => {
  expect(viewportProblem({ value: "phone" }, options, 390)).toBeUndefined();
  expect(viewportProblem({ value: "phone" }, options, 1280)).toBe(
    'the story asks for viewport "phone" (390px wide) but ran 1280px wide',
  );
});

test("an unknown viewport name fails instead of silently running at desktop width", () => {
  expect(viewportProblem({ value: "phonex" }, options, 1280)).toContain("isn't one of the preview's viewport options");
});

test("a story that asks for no viewport is not checked", () => {
  expect(viewportProblem(undefined, options, 1280)).toBeUndefined();
  expect(viewportProblem({}, options, 1280)).toBeUndefined();
});
