// What the story tests require of axe on every story, checked against what Storybook actually
// resolved for that story (parameters and globals after meta, story and preview are merged), so no
// way of writing an opt-out (a multi-line object, a spread, a shared helper) gets past it.
//
// A story may turn off one axe rule, or narrow the area axe checks, only with a written reason:
//
//   parameters: {
//     a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } },
//     a11yExceptions: { "color-contrast": "The swatches are decorative; each value is written beside it." },
//   }
//
// Use the key "context" for a reason to change `a11y.context`. Nothing allows switching axe off for a
// whole story, setting it to warn, or making it manual.

export const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
const MIN_REASON = 10;

type Rule = { id?: unknown; enabled?: unknown };
type Loose = Record<string, unknown> | undefined;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

function disabledRuleIds(rules: unknown): string[] {
  if (Array.isArray(rules)) {
    return (rules as Rule[]).filter((r) => isObject(r) && r.enabled === false).map((r) => String(r.id));
  }
  // axe's run options take rules as { [id]: { enabled } }.
  if (isObject(rules)) {
    return Object.entries(rules)
      .filter(([, v]) => isObject(v) && v.enabled === false)
      .map(([id]) => id);
  }
  return [];
}

export function a11yGuardProblems(parameters: Loose, globals: Loose): string[] {
  const problems: string[] = [];
  const a11y = isObject(parameters?.a11y) ? parameters.a11y : {};
  const exceptions = isObject(parameters?.a11yExceptions) ? parameters.a11yExceptions : {};
  const reasoned = (key: string) => {
    const reason = exceptions[key];
    return typeof reason === "string" && reason.trim().length >= MIN_REASON;
  };

  if (a11y.disable === true) problems.push("a11y.disable is true: axe would not run");
  if (a11y.test !== "error") problems.push(`a11y.test is ${JSON.stringify(a11y.test)}: it must stay "error"`);
  if (isObject(globals?.a11y) && globals.a11y.manual === true) problems.push("globals.a11y.manual is true: axe would not run");

  const config = isObject(a11y.config) ? a11y.config : {};
  for (const key of Object.keys(config)) {
    if (key !== "rules") problems.push(`a11y.config.${key} changes axe's rules; only a11y.config.rules may, with a reason`);
  }
  const options = isObject(a11y.options) ? a11y.options : {};
  for (const key of Object.keys(options)) {
    if (key !== "runOnly" && key !== "rules") problems.push(`a11y.options.${key} changes how axe runs`);
  }
  const runOnly = options.runOnly;
  if (!Array.isArray(runOnly) || AXE_TAGS.some((tag) => !runOnly.includes(tag))) {
    problems.push(`a11y.options.runOnly must include all of ${AXE_TAGS.join(", ")}`);
  }

  for (const id of [...disabledRuleIds(config.rules), ...disabledRuleIds(options.rules)]) {
    if (!reasoned(id)) problems.push(`axe rule "${id}" is turned off without a reason in parameters.a11yExceptions`);
  }
  if (a11y.context !== undefined && !reasoned("context")) {
    problems.push("a11y.context narrows what axe checks without a reason in parameters.a11yExceptions.context");
  }
  return problems;
}
