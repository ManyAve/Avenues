// Avenue's own story tests run the checks in src/checks after each Components, Composites, Overview and Scenes story
// (.storybook/preview.tsx). Apps call the same checks from their own tests (README, "Checks for apps").
import { nameClashes, namedControls } from "#avenue/checks/name-clash";
import { TOUCH_TARGET, fineTargetProblems, formatTouchProblems, touchTargetProblems } from "#avenue/checks/touch-targets";

/** Story groups whose stories are measured: the components and the composites built from them. */
export const MEASURED_TITLES = ["Components/", "Composites/", "Overview", "Scenes"];

/**
 * Runs after every story. In the four mouse projects it checks hit-area sizes (fineTargetProblems); in the `touch`
 * project it hit-tests 44px areas. Fails when the browser isn't actually emulating a coarse pointer
 * (so a broken setup can't pass silently), or when any control's tap area is short or overlaps another's.
 */
export function runTouchTargetCheck(pointer: unknown, title: string): void {
  // Only under the story tests, which set the `pointer` global (vitest.config.ts); not while someone browses Storybook.
  if (pointer !== "fine" && pointer !== "coarse") return;
  if (!MEASURED_TITLES.some((prefix) => title.startsWith(prefix))) return;
  if (pointer === "fine") {
    const fine = fineTargetProblems();
    if (fine.length > 0) throw new Error(`Mouse targets smaller than Avenue promises:\n- ${fine.join("\n- ")}`);
    return;
  }
  if (!matchMedia("(pointer: coarse)").matches) {
    throw new Error("Touch target check: the touch project is running without a coarse pointer (hasTouch is off).");
  }
  const problems = touchTargetProblems();
  if (problems.length > 0) {
    throw new Error(`Touch targets under ${TOUCH_TARGET} x ${TOUCH_TARGET}px on a phone:\n- ${formatTouchProblems(problems)}`);
  }
}

export function runNameClashCheck(title: string): void {
  if (typeof navigator === "undefined" || !navigator.webdriver) return;
  if (!MEASURED_TITLES.some((prefix) => title.startsWith(prefix))) return;
  const problems = nameClashes(namedControls());
  if (problems.length > 0) throw new Error(`Control names an agent can't tell apart:\n- ${problems.join("\n- ")}`);
}
