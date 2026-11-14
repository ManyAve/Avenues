import { describe, expect, test } from "bun:test";
import { patchProblems } from "./check-app-patches";

const name = "@ui-sdk%2Fcore@0.1.0-beta.2.patch";
const listed = { "@ui-sdk/core@0.1.0-beta.2": `patches/${name}` };
const avenue = new Map([[name, "diff A"]]);

describe("patchProblems", () => {
  test("passes when the app carries and lists the same patch", () => {
    expect(patchProblems(avenue, new Map([[name, "diff A"]]), listed)).toEqual([]);
  });

  test("fails when the patch is missing", () => {
    expect(patchProblems(avenue, new Map(), listed)).toEqual([
      `patches/${name} is missing: copy it from node_modules/@manyave/avenue/patches/`,
    ]);
  });

  test("fails when the app's copy differs from the tag's", () => {
    expect(patchProblems(avenue, new Map([[name, "diff B"]]), listed)).toEqual([
      `patches/${name} differs from the one in the installed Avenue tag`,
    ]);
  });

  test("fails when package.json doesn't list it", () => {
    expect(patchProblems(avenue, new Map([[name, "diff A"]]), {})).toEqual([
      `package.json patchedDependencies doesn't list "@ui-sdk/core@0.1.0-beta.2"`,
    ]);
  });

  test("Avenue's own patches pass against Avenue's own package.json", async () => {
    const { readdir } = await import("node:fs/promises");
    const dir = new URL("../patches/", import.meta.url).pathname;
    const files = new Map<string, string>();
    for (const f of await readdir(dir)) files.set(f, await Bun.file(dir + f).text());
    const pkg = (await Bun.file(new URL("../package.json", import.meta.url).pathname).json()) as {
      patchedDependencies: Record<string, string>;
    };
    expect(files.size).toBeGreaterThan(0);
    expect(patchProblems(files, files, pkg.patchedDependencies)).toEqual([]);
  });
});
