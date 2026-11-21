/**
 * Copies ui-sdk's agent skill from the installed @ui-sdk/core into .agents/skills/ui-sdk (linked into .claude/skills),
 * so agents in this repo read the skill that matches the installed ui-sdk, not the one from when it was first added.
 *
 *   bun run ui-sdk:skill           # copy after upgrading @ui-sdk/core
 *   bun run ui-sdk:skill --check   # exit 1 if the committed copy differs (run by test:scripts)
 */
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
export const paths = {
  source: join(root, "node_modules/@ui-sdk/core/skills/ui-sdk"),
  target: join(root, ".agents/skills/ui-sdk"),
};

/** Every file under `dir`, as paths relative to it, sorted. */
export function listFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else out.push(relative(dir, p));
    }
  };
  walk(dir);
  return out.sort();
}

/** The files that are missing, extra or different in `target` compared with `source`. */
export function drift(source: string, target: string): string[] {
  const want = listFiles(source);
  const have = listFiles(target);
  const differ = want.filter(
    (f) => !have.includes(f) || readFileSync(join(source, f), "utf8") !== readFileSync(join(target, f), "utf8"),
  );
  const extra = have.filter((f) => !want.includes(f));
  return [...differ, ...extra];
}

if (import.meta.main) {
  const stale = drift(paths.source, paths.target);
  if (process.argv.includes("--check")) {
    if (stale.length > 0) {
      console.error(`.agents/skills/ui-sdk differs from @ui-sdk/core's skill: ${stale.join(", ")}. Run bun run ui-sdk:skill.`);
      process.exit(1);
    }
  } else {
    rmSync(paths.target, { recursive: true, force: true });
    for (const f of listFiles(paths.source)) {
      mkdirSync(join(paths.target, f, ".."), { recursive: true });
      writeFileSync(join(paths.target, f), readFileSync(join(paths.source, f)));
    }
    console.log(`Copied ${listFiles(paths.source).length} files into .agents/skills/ui-sdk.`);
  }
}
