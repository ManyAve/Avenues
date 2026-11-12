import { describe, expect, test } from "bun:test";
import { generate, paths, scopeWebCss } from "./ui-sdk-css";

const sample = `@layer ui-sdk {
  :where(:root, :host) {
    --ui-radius: 0;
    --ui-icon: url("data:image/svg+xml,%3Csvg viewBox='0 0 24 24'%3E{%3C/svg%3E");
  }

  /* a comment with a } brace */
  code {
    padding: 1px;
  }

  [data-slot="button"] {
    &:hover { color: red; }
  }
}
`;

describe("scopeWebCss", () => {
  const out = scopeWebCss(sample, "9.9.9");

  test("keeps the variables global and scopes every other rule", () => {
    const scopeAt = out.indexOf("@scope ([data-ui-sdk-skin])");
    expect(scopeAt).toBeGreaterThan(-1);
    expect(out.indexOf("--ui-radius: 0")).toBeLessThan(scopeAt);
    expect(out.indexOf("code {")).toBeGreaterThan(scopeAt);
    expect(out.indexOf('[data-slot="button"]')).toBeGreaterThan(scopeAt);
  });

  test("stays inside the ui-sdk layer", () => {
    expect(out).toContain("@layer ui-sdk {");
    expect(out).toContain("9.9.9");
  });

  test("refuses a web.css whose shape it does not know", () => {
    expect(() => scopeWebCss("code { padding: 0 }", "1")).toThrow();
    expect(() => scopeWebCss(`${sample}\ncode { padding: 0 }`, "1")).toThrow();
  });
});

test("the committed src/styles/ui-sdk.css matches the installed @ui-sdk/core", async () => {
  // Fails after an @ui-sdk/core upgrade until `bun run ui-sdk:css` is run.
  expect(await Bun.file(paths.target).text()).toBe(await generate());
});
