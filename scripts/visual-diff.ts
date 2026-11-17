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
 *   bun run visual:diff main --renamed components-sheet=components-drawer
 *                                         # a story file renamed on this branch: each base story under the old id
 *                                         # prefix is compared with the head story under the new one (repeatable)
 *
 * A ref that doesn't exist locally falls back to origin/<ref>, so `main` works in a fresh clone that
 * only has origin/main. Needs Chromium for Playwright (see the README), or AVENUE_CHROMIUM pointing at one.
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
// Chromium re-rasterizes only the invalidated part of a tile by default, so an element repainted by a
// play function (a checkbox ticked by keyboard) can get edge pixels a channel value off from a full
// raster, differently from run to run. A full raster of every tile gives the same pixels each time
// (AVE-19: 7 of 72 repeat captures differed with partial raster, 0 of 72 without).
const CHROMIUM_ARGS = ["--disable-partial-raster"];

const DEFAULT_VIEWPORT = { width: 1280, height: 800 };

export interface Viewport {
  width: number;
  height: number;
}

/**
 * The page size a story asks for through Storybook's viewport global (`globals: { viewport: { value: "phone" } }`),
 * read from the preview's viewport options, or the default desktop size. The story tests run such a story at that
 * size and fail it otherwise (.storybook/viewport-check.ts), so a capture at 1280px would only show that error (AVE-51).
 */
export function storyViewport(asked: unknown, options: unknown): Viewport {
  const value = typeof asked === "object" && asked !== null ? (asked as { value?: unknown }).value : asked;
  if (typeof value !== "string" || value === "") return DEFAULT_VIEWPORT;
  const styles = (options as Record<string, { styles?: { width?: string; height?: string } }> | undefined)?.[value]
    ?.styles;
  const width = Number.parseFloat(styles?.width ?? "");
  const height = Number.parseFloat(styles?.height ?? "");
  if (!Number.isFinite(width)) throw new Error(`the story asks for viewport "${value}", which has no width`);
  return { width, height: Number.isFinite(height) ? height : DEFAULT_VIEWPORT.height };
}

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

/**
 * Parses `--renamed old=new` arguments (story id prefixes, as Storybook writes them: `components-sheet`). A title
 * renamed on the branch changes every story id under it, so without this the base stories read as missing.
 */
export function parseRenames(args: string[]): Map<string, string> {
  const renames = new Map<string, string>();
  args.forEach((arg, i) => {
    if (arg !== "--renamed") return;
    const value = args[i + 1] ?? "";
    const [from, to, ...rest] = value.split("=");
    if (!from || !to || rest.length > 0) throw new Error(`--renamed takes old=new story id prefixes, not "${value}"`);
    renames.set(from, to);
  });
  return renames;
}

/** A base story id under the name it has on the branch: `components-sheet--open` -> `components-drawer--open`. */
export function renamedId(id: string, renames: Map<string, string>): string {
  const [prefix, ...rest] = id.split("--");
  const to = renames.get(prefix!);
  return to === undefined || rest.length === 0 ? id : [to, ...rest].join("--");
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

/**
 * The commit to build for `ref`. A local branch that is only behind `origin/<ref>` is stale (a clone's `main` stays
 * where it was cloned while fetches move `origin/main`), so `origin/<ref>` wins; a missing local ref also falls back
 * to it. A local ref with commits of its own is kept. Undefined when neither exists.
 */
export function resolveRef(
  ref: string,
  exists: (candidate: string) => boolean,
  strictlyBehind: (older: string, newer: string) => boolean = () => false,
): string | undefined {
  const remote = `origin/${ref}`;
  if (!exists(ref)) return exists(remote) ? remote : undefined;
  if (!ref.startsWith("origin/") && exists(remote) && strictlyBehind(ref, remote)) return remote;
  return ref;
}

function isCommit(candidate: string): boolean {
  const proc = Bun.spawnSync(["git", "rev-parse", "--verify", "--quiet", `${candidate}^{commit}`], { cwd: root });
  return proc.exitCode === 0;
}

/** True when `older` is an ancestor of `newer` and not the same commit. */
function isStrictlyBehind(older: string, newer: string): boolean {
  const git = (...args: string[]) => Bun.spawnSync(["git", ...args], { cwd: root });
  const [a, b] = git("rev-parse", older, newer).stdout.toString().trim().split("\n");
  return a !== b && git("merge-base", "--is-ancestor", older, newer).exitCode === 0;
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

interface Rendered {
  phase: string;
  viewport: { asked: unknown; options: unknown };
  error?: string;
}

/** Opens one story and waits until Storybook has rendered it and run its play function. */
async function render(page: Page, url: string): Promise<Rendered> {
  await page.goto(url);
  await page.addStyleTag({ content: FREEZE });
  const handle = await page.waitForFunction(
    () => {
      // Storybook's preview global; its current render's phase reaches "completed" after the play function.
      const preview = (
        window as unknown as Record<
          string,
          | {
              currentRender?: {
                phase?: string;
                story?: { storyGlobals?: Record<string, unknown>; parameters?: Record<string, unknown> };
              };
            }
          | undefined
        >
      )["__STORYBOOK_PREVIEW__"];
      const current = preview?.currentRender;
      const p = current?.phase;
      if (!(p === "completed" || p === "finished" || p === "errored" || p === "aborted")) return false;
      // Storybook shows its error screen (and keeps the phase) when a hook such as afterEach throws.
      const shown = document.body.classList.contains("sb-show-errordisplay");
      const message = document.querySelector("#error-message")?.textContent?.trim();
      return {
        phase: p,
        viewport: {
          asked: current?.story?.storyGlobals?.["viewport"],
          options: (current?.story?.parameters?.["viewport"] as { options?: unknown } | undefined)?.options,
        },
        error: shown ? message || "Storybook showed its error screen" : undefined,
      };
    },
    undefined,
    { timeout: 30_000 },
  );
  return (await handle.jsonValue()) as Rendered;
}

async function capture(page: Page, base: string, id: string, combo: Combo): Promise<Buffer> {
  const globals = `theme:${combo.theme};typeScale:${combo.typeScale}`;
  const url = `${base}/iframe.html?id=${encodeURIComponent(id)}&viewMode=story&globals=${globals}`;
  let rendered = await render(page, url);
  // A story that asks for a viewport is captured at that size, as the story tests run it.
  const wanted = storyViewport(rendered.viewport.asked, rendered.viewport.options);
  const current = page.viewportSize();
  if (current?.width !== wanted.width || current?.height !== wanted.height) {
    await page.setViewportSize(wanted);
    rendered = await render(page, url);
  }
  if (rendered.phase !== "completed" && rendered.phase !== "finished") throw new Error(`story ${rendered.phase}`);
  if (rendered.error) throw new Error(`story errored: ${rendered.error.split("\n")[0]}`);
  await page.evaluate(() => document.fonts.ready);
  // Two frames so layout settled after the freeze style and any play-function state change.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  return page.screenshot({ fullPage: true, animations: "disabled", caret: "hide" });
}

async function captureAll(browser: Browser, dir: string, side: string, ids: string[]) {
  const server = serve(dir);
  const shots = new Map<string, Buffer | Error>();
  const context = await browser.newContext({ viewport: DEFAULT_VIEWPORT, reducedMotion: "reduce" });
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
  const renames = parseRenames(args);
  const asked = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--renamed") ?? "main";
  const ref = reuse ? asked : resolveRef(asked, isCommit, isStrictlyBehind);
  if (ref === undefined) throw new Error(`${asked} is not a commit here, and neither is origin/${asked}; fetch it first`);
  if (ref !== asked) {
    console.log(
      isCommit(asked) ? `${asked} is behind ${ref}; using ${ref}.` : `${asked} isn't a local ref; using ${ref}.`,
    );
  }
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
  const browser = await chromium.launch({ args: CHROMIUM_ARGS, ...(executablePath ? { executablePath } : {}) });
  let baseShots: Map<string, Buffer | Error>;
  let headShots: Map<string, Buffer | Error>;
  try {
    baseShots = await captureAll(browser, baseDir, "base", baseIds);
    if (renames.size > 0) {
      baseShots = new Map([...baseShots].map(([key, shot]) => {
        const [story, combo] = key.split("@") as [string, string];
        return [`${renamedId(story, renames)}@${combo}`, shot];
      }));
    }
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
