/**
 * Pixel-compares every story between a base revision and the working tree.
 *
 * Builds Storybook twice (the base ref in a temporary git worktree, and this checkout), captures every
 * story in all four toolbar combinations (light/dark × web/desktop type scale) once Storybook reports
 * it rendered and its play function finished, with animations and transitions off, and compares the
 * captures pixel by pixel. Exits non-zero when any story differs, fails to render, or exists on only
 * one side. The report (both captures and a diff image for each mismatch, plus report.json) goes to
 * .visual-diff/, which is not committed.
 *
 *   bun run visual:diff [base-ref]        # default: main
 *   bun run visual:diff main --reuse      # skip both builds, reuse .visual-diff/build-*
 *   bun run visual:diff main --allow-new  # stories added on this branch are listed, not failures
 *
 * Needs Chromium for Playwright (see the README), or AVENUE_CHROMIUM pointing at one.
 */
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import pixelmatch from "pixelmatch";
import { chromium, type Browser, type Page } from "playwright";
import { PNG } from "pngjs";

export const COMBOS = [
  { theme: "light", typeScale: "web" },
  { theme: "dark", typeScale: "web" },
  { theme: "light", typeScale: "desktop" },
  { theme: "dark", typeScale: "desktop" },
] as const;
type Combo = (typeof COMBOS)[number];

interface IndexEntry {
  id: string;
  type: string;
  title: string;
  name: string;
}

export interface Comparison {
  story: string;
  combo: string;
  status: "same" | "different" | "only-in-base" | "only-in-head" | "error";
  changedPixels?: number;
  detail?: string;
}

const root = resolve(import.meta.dir, "..");
const out = join(root, ".visual-diff");
// Hide what legitimately differs between two identical renders: motion, the blinking caret.
const FREEZE = `*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}`;

export function comboName(c: Combo): string {
  return `${c.theme}-${c.typeScale}`;
}

/** Stories (not docs pages) in a built Storybook's index.json, by id. */
export function storyIds(index: { entries: Record<string, IndexEntry> }): string[] {
  return Object.values(index.entries)
    .filter((e) => e.type === "story")
    .map((e) => e.id)
    .sort();
}

/** Compares two PNGs. Different sizes count as every pixel of the larger one changed. */
export function comparePngs(a: Buffer, b: Buffer): { changed: number; diff: Buffer | undefined } {
  const pa = PNG.sync.read(a);
  const pb = PNG.sync.read(b);
  if (pa.width !== pb.width || pa.height !== pb.height) {
    return { changed: Math.max(pa.width * pa.height, pb.width * pb.height), diff: undefined };
  }
  const diff = new PNG({ width: pa.width, height: pa.height });
  // threshold 0: any change in any channel counts. The bar is zero changed pixels.
  const changed = pixelmatch(pa.data, pb.data, diff.data, pa.width, pa.height, { threshold: 0 });
  return { changed, diff: changed > 0 ? PNG.sync.write(diff) : undefined };
}

async function run(cmd: string[], cwd: string): Promise<void> {
  const proc = Bun.spawn(cmd, { cwd, stdout: "inherit", stderr: "inherit" });
  if ((await proc.exited) !== 0) throw new Error(`${cmd.join(" ")} failed in ${cwd}`);
}

async function buildBase(ref: string, dest: string): Promise<void> {
  // Outside the repo: Storybook skips story files under a dot-directory such as .visual-diff/.
  const tree = join(tmpdir(), `avenue-visual-diff-${process.pid}`);
  await run(["git", "worktree", "add", "--detach", tree, ref], root);
  try {
    await run(["bun", "install", "--frozen-lockfile"], tree);
    await run(["bunx", "storybook", "build", "--quiet", "-o", dest], tree);
  } finally {
    await run(["git", "worktree", "remove", "--force", tree], root).catch(() => {});
    await rm(tree, { recursive: true, force: true });
  }
}

function serve(dir: string) {
  return Bun.serve({
    port: 0,
    async fetch(req) {
      const path = decodeURIComponent(new URL(req.url).pathname);
      const file = Bun.file(join(dir, path === "/" ? "index.html" : path));
      return (await file.exists()) ? new Response(file) : new Response("not found", { status: 404 });
    },
  });
}

/** Opens one story and waits until Storybook has rendered it and run its play function. */
async function capture(page: Page, base: string, id: string, combo: Combo): Promise<Buffer> {
  const globals = `theme:${combo.theme};typeScale:${combo.typeScale}`;
  await page.goto(`${base}/iframe.html?id=${encodeURIComponent(id)}&viewMode=story&globals=${globals}`);
  await page.addStyleTag({ content: FREEZE });
  const phase = await page.waitForFunction(
    () => {
      // Storybook's preview global; its current render's phase reaches "completed" after the play function.
      const preview = (window as unknown as Record<string, { currentRender?: { phase?: string } } | undefined>)[
        "__STORYBOOK_PREVIEW__"
      ];
      const p = preview?.currentRender?.phase;
      return p === "completed" || p === "finished" || p === "errored" || p === "aborted" ? p : false;
    },
    undefined,
    { timeout: 30_000 },
  );
  const result = await phase.jsonValue();
  if (result !== "completed" && result !== "finished") throw new Error(`story ${result}`);
  await page.evaluate(() => document.fonts.ready);
  // Two frames so layout settled after the freeze style and any play-function state change.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  return page.screenshot({ fullPage: true, animations: "disabled", caret: "hide" });
}

async function captureAll(browser: Browser, dir: string, side: string, ids: string[]) {
  const server = serve(dir);
  const shots = new Map<string, Buffer | Error>();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  try {
    for (const id of ids) {
      for (const combo of COMBOS) {
        const key = `${id}@${comboName(combo)}`;
        try {
          shots.set(key, await capture(page, `http://localhost:${server.port}`, id, combo));
        } catch (error) {
          shots.set(key, error instanceof Error ? error : new Error(String(error)));
        }
      }
    }
  } finally {
    await context.close();
    await server.stop(true);
  }
  console.log(`${side}: captured ${ids.length} stories × ${COMBOS.length} combinations`);
  return shots;
}

async function main() {
  const args = process.argv.slice(2);
  const reuse = args.includes("--reuse");
  const allowNew = args.includes("--allow-new");
  const ref = args.find((a) => !a.startsWith("--")) ?? "main";
  const baseDir = join(out, "build-base");
  const headDir = join(out, "build-head");
  const reportDir = join(out, "report");

  if (!reuse) {
    await rm(out, { recursive: true, force: true });
    await mkdir(out, { recursive: true });
    console.log(`Building Storybook at ${ref} ...`);
    await buildBase(ref, baseDir);
    console.log("Building Storybook from the working tree ...");
    await run(["bunx", "storybook", "build", "--quiet", "-o", headDir], root);
  }
  await rm(reportDir, { recursive: true, force: true });
  await mkdir(reportDir, { recursive: true });

  const baseIds = storyIds(await Bun.file(join(baseDir, "index.json")).json());
  const headIds = storyIds(await Bun.file(join(headDir, "index.json")).json());
  const executablePath = process.env.AVENUE_CHROMIUM;
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  let baseShots: Map<string, Buffer | Error>;
  let headShots: Map<string, Buffer | Error>;
  try {
    baseShots = await captureAll(browser, baseDir, "base", baseIds);
    headShots = await captureAll(browser, headDir, "head", headIds);
  } finally {
    await browser.close();
  }

  const results: Comparison[] = [];
  const keys = [...new Set([...baseShots.keys(), ...headShots.keys()])].sort();
  for (const key of keys) {
    const [story, combo] = key.split("@") as [string, string];
    const a = baseShots.get(key);
    const b = headShots.get(key);
    const file = (side: string) => join(reportDir, `${key.replace("@", "--")}.${side}.png`);
    if (a === undefined) results.push({ story, combo, status: "only-in-head" });
    else if (b === undefined) results.push({ story, combo, status: "only-in-base" });
    else if (a instanceof Error || b instanceof Error) {
      const detail = [a instanceof Error && `base: ${a.message}`, b instanceof Error && `head: ${b.message}`]
        .filter(Boolean)
        .join("; ");
      results.push({ story, combo, status: "error", detail });
    } else {
      const { changed, diff } = comparePngs(a, b);
      results.push({ story, combo, status: changed === 0 ? "same" : "different", changedPixels: changed });
      if (changed > 0) {
        await Bun.write(file("base"), a);
        await Bun.write(file("head"), b);
        if (diff) await Bun.write(file("diff"), diff);
      }
    }
  }
  await Bun.write(join(reportDir, "report.json"), JSON.stringify({ base: ref, results }, null, 2));

  const added = results.filter((r) => r.status === "only-in-head");
  const bad = results.filter((r) => r.status !== "same" && !(allowNew && r.status === "only-in-head"));
  for (const r of allowNew ? added : []) console.log(`${"new".padEnd(12)} ${r.story} @ ${r.combo}`);
  for (const r of bad) {
    const extra = r.changedPixels !== undefined ? ` (${r.changedPixels} px)` : r.detail ? ` (${r.detail})` : "";
    console.log(`${r.status.padEnd(12)} ${r.story} @ ${r.combo}${extra}`);
  }
  const stories = new Set(results.map((r) => r.story)).size;
  console.log(`\n${stories} stories, ${results.length} captures against ${ref}: ${bad.length} not identical${allowNew ? `, ${added.length} new` : ""}.`);
  console.log(`Report: ${reportDir}`);
  process.exit(bad.length > 0 ? 1 : 0);
}

if (import.meta.main) await main();
