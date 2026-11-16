import { expect, test } from "bun:test";
import { copyTailwindCss, generate, paths } from "./shadcn-css";

test("copies shadcn's stylesheet unchanged under a header naming its version and licence", () => {
  const css = "@custom-variant data-open {\n  &:where([data-state=\"open\"]) { @slot; }\n}\n";
  const out = copyTailwindCss(css, "9.9.9");
  expect(out.endsWith(css)).toBe(true);
  expect(out).toContain("shadcn 9.9.9");
  expect(out).toContain("MIT License");
});

test("the committed src/styles/shadcn.css matches the installed shadcn", async () => {
  // Fails after a shadcn upgrade until `bun run shadcn:css` is run.
  expect(await Bun.file(paths.target).text()).toBe(await generate());
});

test("no stylesheet Avenue ships imports from shadcn, which apps don't install (AVE-107)", async () => {
  const glob = new Bun.Glob("src/styles/*.css");
  for await (const file of glob.scan({ cwd: `${import.meta.dir}/..` })) {
    const css = await Bun.file(`${import.meta.dir}/../${file}`).text();
    expect({ file, importsShadcn: /@import\s+["']shadcn[/"']/.test(css) }).toEqual({ file, importsShadcn: false });
  }
});
