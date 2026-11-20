import { describe, expect, test } from "bun:test";
import { readDeclarations } from "./css-tokens";

describe("token stylesheet reader (AVE-172)", () => {
  test("reads Tailwind's syntax and nested scopes as written", () => {
    const css = `/* palette */
@theme {
  --animate-x: x 1s;
  @keyframes x { to { opacity: 1; } }
}
@theme inline {
  --radius-*: initial;
  --radius-sm: calc(var(--radius) * .6);
}
:root[data-surface="lifted"]:not(.dark),
:root:not(.dark) [data-surface="lifted"] {
  --muted: oklch( 96.4%  .004 280 ); /* note */
  color: red;
}
@media (min-width: 40rem) {
  :root { --inset: 1.25rem; }
}`;
    expect(readDeclarations(css)).toEqual([
      { scope: "@theme", name: "--animate-x", value: "x 1s" },
      { scope: "@theme inline", name: "--radius-*", value: "initial" },
      { scope: "@theme inline", name: "--radius-sm", value: "calc(var(--radius) * 0.6)" },
      {
        scope: ':root[data-surface="lifted"]:not(.dark), :root:not(.dark) [data-surface="lifted"]',
        name: "--muted",
        value: "oklch(96.4% 0.004 280)",
      },
      { scope: "@media (min-width: 40rem) > :root", name: "--inset", value: "1.25rem" },
    ]);
  });
});
