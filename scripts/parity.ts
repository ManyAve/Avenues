/**
 * Proves Avenue looks like the ManyAve app (AVE-10): `bun run parity`.
 *
 * Builds the app's own Storybook from a ManyAve Management checkout (default ../manyave-management, or
 * `--app <path>`) in a temporary copy, never in the checkout, and Avenue's Storybook from this tree. For
 * every pair in scripts/parity-pairs.ts it opens the app story and the Avenue story in light and dark at the
 * web and desktop type scales, waits until Storybook reports the story rendered, captures the paired element
 * in each, and compares them two ways:
 *
 * - Styles: the computed style of the element and each visible part (height, padding, borders, corners,
 *   colours, type, shadow, gap). This works even when the two stories show different text.
 * - Pixels: when both captures show the same text, any changed pixel at pixelmatch's default anti-alias
 *   threshold (0.1) counts.
 *
 * Every difference must be an agreed fix (an AVE-2 rule) or a filed AVE bug, named in the pair map; every
 * Avenue component and composite story must have a pair or a written reason. Otherwise it exits 1. The report
 * (both captures, a diff image and the differences for each pair and combination) goes to
 * .parity/report/index.html, which is not committed.
 *
 *   bun run parity                          # app at ../manyave-management
 *   bun run parity --app ~/code/manyave-management
 *   bun run parity --reuse                  # skip both builds, reuse .parity/build-*
 *   bun run parity --only components-button # only stories whose id starts with this
 *
 * The app's private Point packages need registry access. Where they don't install, the harness builds the
 * app's Storybook without them: the UI only uses them as types, plus `v` from @point/cloud/validators, which
 * scripts/parity/point-stub.ts stands in for. Needs Chromium for Playwright, or AVENUE_CHROMIUM.
 */
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import pixelmatch from "pixelmatch";
import { chromium, type Page } from "playwright";
import { PNG } from "pngjs";
import {
  COMBOS,
  comboName,
  explain,
  mapProblems,
  pixelJudgement,
  rootVariables,
  sameOffset,
  SUBPIXEL_MAX,
  STYLE_PROPS,
  storiesToPair,
  styleDifferences,
  verdict,
  type Combo,
  type Difference,
  type Pair,
  type Part,
  type Verdict,
} from "./parity-lib";
import { PAIRS } from "./parity-pairs";

const root = resolve(import.meta.dir, "..");
const out = join(root, ".parity");
const FREEZE = `*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}`;
const CHROMIUM_ARGS = ["--disable-partial-raster"];
/** pixelmatch's per-pixel colour threshold: its default, which ignores anti-aliasing but not a token change. */
const PIXEL_THRESHOLD = 0.1;

interface Shot {
  png: Buffer;
  parts: Part[];
  text: string;
  /** Where the element sat within its pixel before the snap, [x, y] in 0..1. */
  offset: [number, number];
}

interface Result {
  avenueStory: string;
  label: string;
  app: string;
  combo: string;
  verdict: Verdict;
  differences: Difference[];
  changedPixels?: number;
  sameText?: boolean;
  /** Set when the pixel diff didn't decide the verdict: why it was judged on styles only. */
  stylesOnly?: string | undefined;
  error?: string | undefined;
  files?: { app: string; avenue: string; diff?: string | undefined };
}

async function run(cmd: string[], cwd: string, env?: Record<string, string>): Promise<number> {
  const proc = Bun.spawn(cmd, { cwd, stdout: "inherit", stderr: "inherit", env: { ...process.env, ...env } });
  return proc.exited;
}

async function must(cmd: string[], cwd: string): Promise<void> {
  if ((await run(cmd, cwd)) !== 0) throw new Error(`${cmd.join(" ")} failed in ${cwd}`);
}

function git(args: string[], cwd: string): string {
  const proc = Bun.spawnSync(["git", ...args], { cwd });
  if (proc.exitCode !== 0) throw new Error(`git ${args.join(" ")} failed in ${cwd}: ${proc.stderr.toString()}`);
  return proc.stdout.toString().trim();
}

/** The app's package.json without the private Point packages, so it installs without registry access. */
function withoutPrivatePackages(pkg: Record<string, unknown>): Record<string, unknown> {
  const copy = structuredClone(pkg);
  for (const field of ["dependencies", "devDependencies", "optionalDependencies"]) {
    const deps = copy[field] as Record<string, string> | undefined;
    for (const [name, spec] of Object.entries(deps ?? {})) {
      if (spec.includes("@buildwf/")) delete deps![name];
    }
  }
  copy["scripts"] = {};
  return copy;
}

// A Storybook config beside the app's own that adds only the stub. Storybook resolves `stories` and
// `staticDirs` against the config directory, and .storybook-parity sits next to .storybook, so the app's
// relative paths still point at the same files.
const PARITY_MAIN = `import type { StorybookConfig } from "@storybook/react-vite";
import base from "../.storybook/main";
const stub = new URL("./point-stub.ts", import.meta.url).pathname;
const config: StorybookConfig = {
  ...base,
  viteFinal: async (vite, options) => {
    const resolved = base.viteFinal ? await base.viteFinal(vite, options) : vite;
    const plugin = { name: "avenue-parity-point-stub", enforce: "pre" as const, resolveId: (id: string) => (id === "@point/cloud/validators" ? stub : null) };
    return { ...resolved, plugins: [plugin, ...(resolved.plugins ?? [])] };
  },
};
export default config;
`;

/** Builds the app's Storybook from a copy of `appDir`'s committed files. Returns the commit it built. */
async function buildApp(appDir: string, dest: string): Promise<{ commit: string; dirty: boolean; stubbed: boolean }> {
  const commit = git(["rev-parse", "--short", "HEAD"], appDir);
  const dirty = git(["status", "--porcelain"], appDir).length > 0;
  const tree = join(tmpdir(), `avenue-parity-app-${process.pid}`);
  await rm(tree, { recursive: true, force: true });
  await mkdir(tree, { recursive: true });
  // Committed files only, at the checkout's HEAD: no local state, no .env, no real data from the working tree.
  const archive = Bun.spawn(["git", "archive", "--format=tar", "HEAD"], { cwd: appDir, stdout: "pipe" });
  const untar = Bun.spawn(["tar", "-x", "-C", tree], { stdin: archive.stdout });
  if ((await untar.exited) !== 0 || (await archive.exited) !== 0) throw new Error(`couldn't copy ${appDir} at HEAD`);
  try {
    let stubbed = false;
    console.log(`Installing the app's dependencies in ${tree} ...`);
    if ((await run(["bun", "install", "--frozen-lockfile", "--ignore-scripts"], tree)) !== 0) {
      console.log("The app's private Point packages didn't install; building with the stub instead.");
      stubbed = true;
      const pkgFile = join(tree, "package.json");
      await Bun.write(pkgFile, JSON.stringify(withoutPrivatePackages(await Bun.file(pkgFile).json()), null, 2));
      await must(["bun", "install", "--ignore-scripts"], tree);
    }
    const configDir = join(tree, ".storybook-parity");
    await mkdir(configDir, { recursive: true });
    await writeFile(join(configDir, "main.ts"), PARITY_MAIN);
    await writeFile(join(configDir, "preview.tsx"), `export { default } from "../.storybook/preview";\n`);
    await cp(join(import.meta.dir, "parity", "point-stub.ts"), join(configDir, "point-stub.ts"));
    await must(["bunx", "storybook", "build", "--quiet", "-c", ".storybook-parity", "-o", dest], tree);
    return { commit, dirty, stubbed };
  } finally {
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

function storyIds(index: { entries: Record<string, { id: string; type: string }> }): string[] {
  return Object.values(index.entries)
    .filter((e) => e.type === "story")
    .map((e) => e.id)
    .sort();
}

/** Opens a story and waits until Storybook reports it rendered and its play function finished. */
async function open(page: Page, url: string, extraCss: string): Promise<void> {
  await page.goto(url);
  await page.addStyleTag({ content: FREEZE + extraCss });
  const phase = await page.waitForFunction(
    () => {
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
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

/** Captures the element `selector` finds (default: the story root's first child) and its visible parts. */
async function shoot(page: Page, selector: string | undefined, keepFocus = false): Promise<Shot> {
  const target = page.locator(selector ?? "#storybook-root > *").first();
  await target.waitFor({ state: "visible", timeout: 10_000 });
  // Resting state on both sides: a story's play function or autofocus may leave the captured control focused or
  // hovered, which draws a focus ring the other side doesn't have. Blur it unless focus is what holds a popup open.
  if (!keepFocus) await page.mouse.move(0, 0);
  if (!keepFocus) await page.evaluate(() => {
    const active = document.activeElement;
    // A dialog stays open without focus; a menu, list, popover or hover card may close when focus leaves it.
    const inPopup = active?.closest("[role=menu],[role=listbox],[data-slot=popover-content],[data-slot=hover-card-content],[popover]");
    if (active instanceof HTMLElement && active !== document.body && !inPopup) active.blur();
  });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const { parts, text } = await target.evaluate(
    (el, props) => {
      const visible = (e: Element) => {
        const r = e.getBoundingClientRect();
        const s = getComputedStyle(e);
        return r.width >= 2 && r.height >= 2 && s.visibility !== "hidden" && s.display !== "none" && s.opacity !== "0";
      };
      const nodes = [el, ...[...el.querySelectorAll("*")].filter((e) => visible(e) && !(e.closest("svg") && e.tagName.toLowerCase() !== "svg"))];
      return {
        text: (el as HTMLElement).innerText.trim(),
        parts: nodes.map((e) => {
          const s = getComputedStyle(e);
          return {
            tag: e.tagName.toLowerCase(),
            slot: e.getAttribute("data-slot"),
            text: [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim(),
            width: e.getBoundingClientRect().width,
            height: e.getBoundingClientRect().height,
            style: Object.fromEntries(props.map((p) => [p, s.getPropertyValue(p)])),
          };
        }),
      };
    },
    [...STYLE_PROPS],
  );
  // Snap the crop to the pixel grid. A story that lays the element out at a fractional position (a centred dialog,
  // an 18.4px switch row) crops a pixel shorter than the same element on a whole pixel. Chrome still shades the edges
  // from the original position, so the offset is returned and pixels are only judged when both offsets match.
  const offset = await target.evaluate((el): [number, number] => {
    const r = el.getBoundingClientRect();
    const dx = r.x - Math.floor(r.x);
    const dy = r.y - Math.floor(r.y);
    if (dx === 0 && dy === 0) return [0, 0];
    // Move the outermost transformed ancestor (a centred dialog's -50% translate is the usual source) so the whole
    // layer lands on whole pixels; with none, move the element itself.
    let mover = el as HTMLElement;
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (s.transform !== "none" || s.translate !== "none") mover = p;
    }
    const own = getComputedStyle(mover).transform;
    mover.style.transform = `translate(${-dx}px, ${-dy}px)${own === "none" ? "" : ` ${own}`}`;
    return [dx, dy];
  });
  const png = await target.screenshot({ animations: "disabled", caret: "hide" });
  return { png, parts, text, offset };
}

/** Each custom property resolved to pixels, by setting it as a probe's font size or line height. */
function resolvedSizes(names: string[]): [string, string][] {
  const probe = document.createElement("span");
  document.body.append(probe);
  const sizes = names.map((name): [string, string] => {
    probe.style.fontSize = `var(${name})`;
    return [name, getComputedStyle(probe).fontSize];
  });
  probe.remove();
  return sizes;
}

/** Pads a PNG to `w`×`h` with transparent pixels so two captures of different sizes can be diffed. */
function padded(png: PNG, w: number, h: number): PNG {
  if (png.width === w && png.height === h) return png;
  const big = new PNG({ width: w, height: h });
  PNG.bitblt(png, big, 0, 0, png.width, png.height, 0, 0);
  return big;
}

function diffPngs(a: Buffer, b: Buffer): { changed: number; diff: Buffer } {
  const pa = PNG.sync.read(a);
  const pb = PNG.sync.read(b);
  const w = Math.max(pa.width, pb.width);
  const h = Math.max(pa.height, pb.height);
  const diff = new PNG({ width: w, height: h });
  const changed = pixelmatch(padded(pa, w, h).data, padded(pb, w, h).data, diff.data, w, h, {
    threshold: PIXEL_THRESHOLD,
  });
  return { changed, diff: PNG.sync.write(diff) };
}

function storyUrl(base: string, id: string, globals: string, args?: string): string {
  return `${base}/iframe.html?id=${encodeURIComponent(id)}&viewMode=story&globals=${globals}${args ? `&args=${args}` : ""}`;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function html(results: Result[], unpaired: [string, string][], meta: Record<string, string>, problems: string[]): string {
  const badge = (v: Verdict) => `<span class="v ${v}">${v}</span>`;
  const rows = results
    .map((r) => {
      const diffs = r.differences
        .map((d) => `<tr><td>${esc(d.where)}</td><td>${esc(d.prop)}</td><td>${esc(d.app)}</td><td>${esc(d.avenue)}</td><td>${esc(d.because ?? "unexplained")}</td></tr>`)
        .join("");
      const imgs = r.files
        ? `<div class="imgs"><figure><figcaption>App</figcaption><img src="${r.files.app}"></figure><figure><figcaption>Avenue</figcaption><img src="${r.files.avenue}"></figure>${r.files.diff ? `<figure><figcaption>Diff${r.stylesOnly ? " (shown, not judged)" : ""}</figcaption><img src="${r.files.diff}"></figure>` : ""}</div>`
        : "";
      return `<section class="${r.verdict}"><h3>${badge(r.verdict)} ${esc(r.avenueStory)} · ${esc(r.label)} · ${r.combo}</h3><p class="m">App: ${esc(r.app)}${r.changedPixels !== undefined ? ` · ${r.changedPixels} px differ` : ""}${r.stylesOnly ? ` · <b>styles only</b>: pixels not judged, ${esc(r.stylesOnly)}` : " · pixels judged"}${r.error ? ` · <b>${esc(r.error)}</b>` : ""}</p>${imgs}${diffs ? `<table><tr><th>Where</th><th>Property</th><th>App</th><th>Avenue</th><th>Because</th></tr>${diffs}</table>` : ""}</section>`;
    })
    .join("\n");
  const counts = (["unexplained", "error", "known-bug", "app-local", "agreed-fix", "same"] as Verdict[])
    .map((v) => `${badge(v)} ${results.filter((r) => r.verdict === v).length}`)
    .join(" ") +
    ` · <b>${results.filter((r) => r.stylesOnly !== undefined).length} styles only</b> (pixels not judged), ${results.filter((r) => r.files && r.stylesOnly === undefined).length} judged on pixels too`;
  return `<!doctype html><meta charset="utf-8"><title>Avenue parity</title><style>
body{font:14px system-ui;margin:24px;color:#222;background:#fafafa}h1{font-size:20px}h3{font-size:14px;margin:0 0 4px}
section{background:#fff;border:1px solid #ddd;border-radius:8px;padding:12px;margin:12px 0}section.same{opacity:.75}
.v{font-size:12px;padding:1px 8px;border-radius:9px;color:#fff}.same{}.v.same{background:#4a7}.v.agreed-fix{background:#47a}.v.known-bug{background:#a74}.v.app-local{background:#777}.v.unexplained,.v.error{background:#c33}
.imgs{display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap}figure{margin:0;border:1px dashed #bbb;background:repeating-conic-gradient(#eee 0 25%,#fff 0 50%) 0 0/12px 12px}figcaption{font-size:11px;padding:2px 4px;background:#fff}img{display:block;max-width:600px}
table{border-collapse:collapse;margin-top:8px;font-size:12px}td,th{border:1px solid #ddd;padding:2px 6px;text-align:left}.m{color:#666;margin:0 0 8px;font-size:12px}
</style><h1>Avenue parity with the ManyAve app</h1>
<p>${Object.entries(meta).map(([k, v]) => `${esc(k)}: <b>${esc(v)}</b>`).join(" · ")}</p><p>${counts}</p>
${problems.length ? `<h2>Pair map problems</h2><ul>${problems.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}
<h2>Unpaired Avenue stories (${unpaired.length})</h2><ul>${unpaired.map(([id, why]) => `<li><b>${esc(id)}</b>: ${esc(why)}</li>`).join("")}</ul>
<h2>Pairs</h2>${rows}`;
}

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

async function main() {
  const args = process.argv.slice(2);
  const reuse = args.includes("--reuse");
  const only = flag(args, "--only");
  const appDir = resolve(flag(args, "--app") ?? join(root, "..", "manyave-management"));
  const appBuild = join(out, "build-app");
  const avenueBuild = join(out, "build-avenue");
  const reportDir = join(out, "report");
  const metaFile = join(out, "app-build.json");

  if (!reuse) {
    if (!(await Bun.file(join(appDir, "package.json")).exists())) {
      throw new Error(`No ManyAve Management checkout at ${appDir}; pass --app <path>.`);
    }
    await rm(out, { recursive: true, force: true });
    await mkdir(out, { recursive: true });
    console.log(`Building the app's Storybook from ${appDir} ...`);
    const built = await buildApp(appDir, appBuild);
    await Bun.write(metaFile, JSON.stringify({ ...built, desktopCss: await Bun.file(join(appDir, "src", "desktop.css")).text() }));
    console.log("Building Avenue's Storybook ...");
    await must(["bunx", "storybook", "build", "--quiet", "-o", avenueBuild], root);
  }
  const appMeta = (await Bun.file(metaFile).json()) as { commit: string; dirty: boolean; stubbed: boolean; desktopCss: string };
  await rm(reportDir, { recursive: true, force: true });
  await mkdir(reportDir, { recursive: true });

  const appIds = storyIds(await Bun.file(join(appBuild, "index.json")).json());
  const avenueIds = storyIds(await Bun.file(join(avenueBuild, "index.json")).json());
  const problems = mapProblems(PAIRS, storiesToPair(avenueIds), appIds);

  // The desktop type scale: the app's Storybook has no switch for it, so its four values from the app's
  // desktop.css are applied to the app's stories here; Avenue's stories use Avenue's own switch, which must
  // give the same values (checked on every desktop capture).
  const desktopVars = rootVariables(appMeta.desktopCss);
  const desktopCss = `:root{${Object.entries(desktopVars).map(([k, v]) => `${k}:${v}`).join(";")}}`;

  const appScale = new Map<string, string>();
  const appServer = serve(appBuild);
  const avenueServer = serve(avenueBuild);
  const executablePath = process.env.AVENUE_CHROMIUM;
  const browser = await chromium.launch({ args: CHROMIUM_ARGS, ...(executablePath ? { executablePath } : {}) });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  const results: Result[] = [];
  const unpaired: [string, string][] = [];
  let n = 0;
  try {
    for (const [story, entry] of Object.entries(PAIRS).sort(([a], [b]) => a.localeCompare(b))) {
      if (only && !story.startsWith(only)) continue;
      if (!Array.isArray(entry)) {
        unpaired.push([story, entry.none]);
        continue;
      }
      if (!avenueIds.includes(story)) continue;
      for (const [i, pair] of entry.entries()) {
        if (!appIds.includes(pair.app)) continue;
        for (const combo of COMBOS) {
          results.push(await compare(page, story, i, pair, combo));
          n++;
          if (n % 25 === 0) console.log(`  ${n} comparisons ...`);
        }
      }
    }
  } finally {
    await context.close();
    await browser.close();
    await appServer.stop(true);
    await avenueServer.stop(true);
  }

  async function compare(tab: Page, story: string, i: number, pair: Pair, combo: Combo): Promise<Result> {
    const label = pair.label ?? pair.app;
    const base: Omit<Result, "verdict" | "differences"> = { avenueStory: story, label, app: pair.app, combo: comboName(combo) };
    const desktop = combo.typeScale === "desktop";
    try {
      await open(tab, storyUrl(`http://localhost:${appServer.port}`, pair.app, `theme:${combo.theme}`), desktop ? desktopCss : "");
      if (desktop && appScale.size === 0) for (const [k, v] of await tab.evaluate(resolvedSizes, Object.keys(desktopVars))) appScale.set(k, v);
      const app = await shoot(tab, pair.appCrop, pair.keepFocus);
      await open(tab, storyUrl(`http://localhost:${avenueServer.port}`, story, `theme:${combo.theme};typeScale:${combo.typeScale}`, pair.avenueArgs), "");
      const scale = desktop ? await tab.evaluate(resolvedSizes, Object.keys(desktopVars)) : [];
      const avenue = await shoot(tab, pair.avenueCrop, pair.keepFocus);
      const sameText = app.text === avenue.text;
      const differences = explain(styleDifferences(app.parts, avenue.parts, sameText, pair.frame), pair.allow);
      for (const [k, v] of scale) {
        if (v !== appScale.get(k)) differences.push({ where: ":root", prop: k, app: appScale.get(k) ?? "", avenue: v });
      }
      const { changed, diff } = diffPngs(app.png, avenue.png);
      const stem = `${story}--${i}--${comboName(combo)}`;
      const files = { app: `${stem}.app.png`, avenue: `${stem}.avenue.png`, diff: changed > 0 ? `${stem}.diff.png` : undefined };
      await Bun.write(join(reportDir, files.app), app.png);
      await Bun.write(join(reportDir, files.avenue), avenue.png);
      if (files.diff) await Bun.write(join(reportDir, files.diff), diff);
      const subpixel = !sameOffset(app.offset, avenue.offset);
      const j = pixelJudgement({ sameText, frame: pair.frame === true, differences, changed, subpixel });
      // Unjudged: say so, so "same" never stands for "looked at the styles only".
      const stylesOnly = j.judged ? undefined : j.why;
      return { ...base, verdict: verdict(differences, j.judged && changed > 0, sameText), differences, changedPixels: changed, sameText, stylesOnly, files };
    } catch (error) {
      return { ...base, verdict: "error", differences: [], error: error instanceof Error ? error.message.split("\n")[0] : String(error) };
    }
  }

  const meta = {
    "App commit": `${appMeta.commit}${appMeta.dirty ? " (checkout had uncommitted changes; built from HEAD)" : ""}`,
    "Point packages": appMeta.stubbed ? "stubbed (no registry access)" : "installed",
    "Avenue commit": git(["rev-parse", "--short", "HEAD"], root),
    "Pixel threshold": `${PIXEL_THRESHOLD} per pixel, 0 pixels allowed; judged only where both show the same text, no style differs and the pair isn't a frame (up to ${SUBPIXEL_MAX} edge pixels forgiven for a different sub-pixel offset). Every other comparison is counted as styles only.`,
  };
  await Bun.write(join(reportDir, "report.json"), JSON.stringify({ meta, problems, unpaired, results }, null, 2));
  await Bun.write(join(reportDir, "index.html"), html(results, unpaired, meta, problems));

  const bad = results.filter((r) => r.verdict === "unexplained" || r.verdict === "error");
  for (const p of problems) console.log(`map          ${p}`);
  for (const r of bad) {
    const why = r.error ?? r.differences.filter((d) => !d.because).map((d) => `${d.where} ${d.prop}: ${d.app} → ${d.avenue}`).join("; ") ?? "";
    console.log(`${r.verdict.padEnd(12)} ${r.avenueStory} [${r.label}] @ ${r.combo}: ${why || `${r.changedPixels} px differ`}`);
  }
  const count = (v: Verdict) => results.filter((r) => r.verdict === v).length;
  const stylesOnly = results.filter((r) => r.stylesOnly !== undefined).length;
  const stylesOnlySame = results.filter((r) => r.stylesOnly !== undefined && r.verdict === "same").length;
  console.log(
    `\n${results.length} comparisons against app ${appMeta.commit}: ${count("same")} same, ${count("agreed-fix")} agreed fixes, ${count("known-bug")} known bugs, ${count("app-local")} drawn by the app's screen, ${count("unexplained")} unexplained, ${count("error")} errors; ${unpaired.length} unpaired stories, ${problems.length} map problems.\n${results.length - stylesOnly} judged on pixels and styles, ${stylesOnly} on styles only (${stylesOnlySame} of those "same").`,
  );
  console.log(`Report: ${join(reportDir, "index.html")}`);
  process.exit(bad.length > 0 || problems.length > 0 ? 1 : 0);
}

if (import.meta.main) await main();
