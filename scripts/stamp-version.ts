/**
 * Writes storybook-static/version.json, naming the commit the published Storybook was built from, so
 * anyone can check what https://avenues.manyave.com is serving:
 *
 *   curl -s https://avenues.manyave.com/version.json
 *
 * Cloudflare Workers Builds runs `bun run deploy` on every push to `main` and sets
 * WORKERS_CI_COMMIT_SHA; a deploy by hand falls back to the checkout's HEAD. Holds no secrets: a
 * commit id, a branch and a time, all of which are public once the repo is.
 */
import { resolve } from "node:path";

export type BuildStamp = { commit: string; branch: string | null; builtAt: string; by: string };

export function buildStamp(env: Record<string, string | undefined>, head: () => string, now = new Date()): BuildStamp {
  const fromBuilds = env.WORKERS_CI_COMMIT_SHA?.trim();
  return {
    commit: fromBuilds || head(),
    branch: env.WORKERS_CI_BRANCH?.trim() || null,
    builtAt: now.toISOString(),
    by: fromBuilds ? "workers-builds" : "by-hand",
  };
}

function gitHead(): string {
  const result = Bun.spawnSync(["git", "rev-parse", "HEAD"]);
  if (result.exitCode !== 0) throw new Error("stamp-version: not a git checkout and WORKERS_CI_COMMIT_SHA is unset");
  return result.stdout.toString().trim();
}

if (import.meta.main) {
  const out = resolve(import.meta.dir, "../storybook-static/version.json");
  if (!(await Bun.file(resolve(import.meta.dir, "../storybook-static/index.html")).exists())) {
    throw new Error("stamp-version: build Storybook first (bun run build-storybook)");
  }
  const stamp = buildStamp(process.env, gitHead);
  await Bun.write(out, `${JSON.stringify(stamp, null, 2)}\n`);
  console.log(`stamp-version: ${stamp.commit} (${stamp.by})`);
}
