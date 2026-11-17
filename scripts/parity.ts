/**
 * Proves Avenue looks like the ManyAve app (AVE-10): `bun run parity`.
 *
 * Builds the app's own Storybook from a ManyAve Management checkout (default ../manyave-management, or
 * `--app <path>`) at APP_BASELINE (scripts/parity-pairs.ts), the app's last commit before it adopted Avenue, in a
 * temporary copy, never in the checkout, and Avenue's Storybook from this tree. Since the app now draws Avenue's
 * parts, its current stories would compare Avenue with itself (AVE-141); the baseline is the look Avenue was
 * ported from and every allowance below was written against. For
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
 *   bun run parity                          # app at ../manyave-management, at APP_BASELINE
 *   bun run parity --app-ref origin/main    # another app commit, to look at drift (not the proof)
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
  reconcile,
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
  type Reconciliation,
  type Verdict,
} from "./parity-lib";
import { APP_BASELINE, PAIRS } from "./parity-pairs";
import { storyViewport } from "./visual-diff";

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
  /**
   * Set when the pixels were judged after applying the allowed values to the app and the app's text to Avenue
   * (AVE-77): what was applied, the pixels that still differ, and the captures.
   */
  reconciled?: {
    styles: string[];
    texts: number;
    changedPixels: number;
    files: { app: string; avenue: string; diff?: string | undefined };
  };
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

/** Builds the app's Storybook from `appDir`'s committed files at `ref`. Returns the commit it built. */
async function buildApp(appDir: string, ref: string, dest: string): Promise<{ commit: string; stubbed: boolean }> {
  let commit: string;
  try {
    commit = git(["rev-parse", "--short", `${ref}^{commit}`], appDir);
  } catch {
    throw new Error(`${appDir} has no commit ${ref}; run \`git fetch origin main\` there.`);
  }
  const tree = join(tmpdir(), `avenue-parity-app-${process.pid}`);
  await rm(tree, { recursive: true, force: true });
  await mkdir(tree, { recursive: true });
  // Committed files only, at `ref`: no local state, no .env, no real data from the working tree.
  const archive = Bun.spawn(["git", "archive", "--format=tar", commit], { cwd: appDir, stdout: "pipe" });
  const untar = Bun.spawn(["tar", "-x", "-C", tree], { stdin: archive.stdout });
  if ((await untar.exited) !== 0 || (await archive.exited) !== 0) throw new Error(`couldn't copy ${appDir} at ${commit}`);
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
    return { commit, stubbed };
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

const DEFAULT_VIEWPORT = { width: 1280, height: 800 };

type Rendered = { phase: string; viewport: { asked: unknown; options: unknown }; error: string | undefined };

/** Loads a story and waits until Storybook reports it rendered and its play function finished. */
async function render(page: Page, url: string, extraCss: string): Promise<Rendered> {
  await page.goto(url);
  await page.addStyleTag({ content: FREEZE + extraCss });
  const handle = await page.waitForFunction(
    () => {
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
      // Storybook keeps the phase but shows its error screen when a hook such as afterEach throws.
      const shown = document.body.classList.contains("sb-show-errordisplay");
      return {
        phase: p,
        viewport: {
          asked: current?.story?.storyGlobals?.["viewport"],
          options: (current?.story?.parameters?.["viewport"] as { options?: unknown } | undefined)?.options,
        },
        error: shown ? document.querySelector("#error-message")?.textContent?.trim() || "Storybook showed its error screen" : undefined,
      };
    },
    undefined,
    { timeout: 30_000 },
  );
  return (await handle.jsonValue()) as Rendered;
}

/**
 * Opens a story and waits until it rendered and its play function finished. With `fit`, a story that asks for a
 * viewport (Avenue's desktop, wide and phone stories) is opened at that size, as the story tests run it; at 1280px it
 * would only show the viewport check's error screen over the story (as AVE-51 found for visual:diff). Without `fit`
 * the page is 1280 x 800, where the app's stories are captured.
 */
async function open(page: Page, url: string, extraCss: string, fit = false): Promise<void> {
  const size = (want: { width: number; height: number }) => {
    const now = page.viewportSize();
    return now?.width === want.width && now?.height === want.height ? undefined : want;
  };
  const reset = size(DEFAULT_VIEWPORT);
  if (reset) await page.setViewportSize(reset);
  let rendered = await render(page, url, extraCss);
  if (fit) {
    const wanted = size(storyViewport(rendered.viewport.asked, rendered.viewport.options));
    if (wanted) {
      await page.setViewportSize(wanted);
      rendered = await render(page, url, extraCss);
    }
  }
  if (rendered.phase !== "completed" && rendered.phase !== "finished") throw new Error(`story ${rendered.phase}`);
  if (rendered.error) throw new Error(`story errored: ${rendered.error.split("\n")[0]}`);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

/** Captures the element `selector` finds (default: the story root's first child) and its visible parts. */
async function shoot(
  page: Page,
  selector: string | undefined,
  keepFocus = false,
  change?: Reconciliation & {
    frameSize?: { width: number; height: number } | undefined;
    /** The app's sub-pixel offset, which Avenue's part is laid out at, so both shade their edges alike (AVE-77). */
    phase?: [number, number] | undefined;
    /** The app's root width, which Avenue's root takes: the story around each sizes it, not the component (AVE-77). */
    width?: number | undefined;
  },
): Promise<Shot> {
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
  if (change) {
    // Tag the parts as a first capture would, then apply the change to them by index (AVE-77).
    await target.evaluate((el) => {
      const visible = (e: Element) => {
        const r = e.getBoundingClientRect();
        const s = getComputedStyle(e);
        return r.width >= 2 && r.height >= 2 && s.visibility !== "hidden" && s.display !== "none" && s.opacity !== "0";
      };
      const nodes = [el, ...[...el.querySelectorAll("*")].filter((e) => visible(e) && !(e.closest("svg") && e.tagName.toLowerCase() !== "svg"))];
      nodes.forEach((e, i) => e.setAttribute("data-parity-i", String(i)));
    });
    await target.evaluate((el, { styles, texts, icons, values, frame, size, width, crop }) => {
      const part = (i: number) => (i === 0 ? el : el.querySelector(`[data-parity-i="${i}"]`)) as HTMLElement | null;
      // A frame keeps its box and hides what it holds (AVE-77); Avenue's box takes the app's size.
      if (frame) {
        // Only the box paints: nothing around it (a dialog's close button over a header's corner), nothing in it, and
        // not its own text (a textarea's value).
        // A stylesheet hides the page, so a popup swapped for a fresh element before the screenshot (the app's hover
        // card is) is still shown when the crop is plain CSS; the box's own inline styles win over the sheet.
        const valid = (() => {
          try {
            document.querySelector(crop);
            return true;
          } catch {
            return false;
          }
        })();
        const shown = "visibility: visible !important; color: transparent !important; -webkit-text-fill-color: transparent !important;";
        const sheet = document.createElement("style");
        sheet.textContent = `body * { visibility: hidden !important; }${valid ? ` ${crop} { ${shown} }` : ""}`;
        document.head.append(sheet);
        const box = el as HTMLElement;
        box.style.setProperty("visibility", "visible", "important");
        box.style.setProperty("color", "transparent", "important");
        box.style.setProperty("-webkit-text-fill-color", "transparent", "important");
      }
      if (width !== undefined && !size) {
        const rootBox = el as HTMLElement;
        rootBox.style.setProperty("box-sizing", "border-box", "important");
        rootBox.style.setProperty("width", `${width}px`, "important");
        rootBox.style.setProperty("min-width", "0", "important");
        rootBox.style.setProperty("max-width", "none", "important");
        rootBox.style.setProperty("flex", "none", "important");
      }
      if (size) {
        const rootBox = el as HTMLElement;
        rootBox.style.setProperty("box-sizing", "border-box", "important");
        rootBox.style.setProperty("width", `${size.width}px`, "important");
        rootBox.style.setProperty("height", `${size.height}px`, "important");
        rootBox.style.setProperty("min-width", "0", "important");
        rootBox.style.setProperty("min-height", "0", "important");
        rootBox.style.setProperty("max-width", "none", "important");
        rootBox.style.setProperty("max-height", "none", "important");
      }
      for (const { index, prop, value } of styles) part(index)?.style.setProperty(prop, value, "important");
      for (const { index, markup } of icons) {
        const svg = part(index);
        if (svg) svg.innerHTML = markup;
      }
      for (const { index, value, placeholder } of values ?? []) {
        const field = part(index) as HTMLInputElement | HTMLTextAreaElement | null;
        if (!field) continue;
        field.value = value;
        field.placeholder = placeholder;
      }
      for (const { index, text } of texts) {
        const own = [...(part(index)?.childNodes ?? [])].filter((n) => n.nodeType === 3 && n.textContent?.trim());
        own.forEach((n, i) => (n.textContent = i === 0 ? text : ""));
      }
    }, { ...change, frame: !!change.frame, size: change.frameSize, width: change.width, crop: selector ?? "#storybook-root > *" });
  }
  if (change?.phase) {
    // Lay the part out at the app's fraction of a pixel (relative offsets, so nothing else moves): a transform only
    // moves the painted layer, and Chrome shades edges from the layout position.
    await target.evaluate((el, [px, py]) => {
      const box = el as HTMLElement;
      const r = box.getBoundingClientRect();
      const shift = (at: number, want: number) => (((want - (at - Math.floor(at))) % 1) + 1) % 1;
      const dx = shift(r.x, px);
      const dy = shift(r.y, py);
      if (dx === 0 && dy === 0) return;
      if (getComputedStyle(box).position === "static") box.style.setProperty("position", "relative");
      const s = getComputedStyle(box);
      box.style.setProperty("left", `${(Number.parseFloat(s.left) || 0) + dx}px`, "important");
      box.style.setProperty("top", `${(Number.parseFloat(s.top) || 0) + dy}px`, "important");
    }, change.phase);
  }
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const { parts, text } = await target.evaluate(
    (el, props) => {
      const visible = (e: Element) => {
        const r = e.getBoundingClientRect();
        const s = getComputedStyle(e);
        return r.width >= 2 && r.height >= 2 && s.visibility !== "hidden" && s.display !== "none" && s.opacity !== "0";
      };
      // Each part keeps the index it was first given (data-parity-i), so a second capture after reconcile() changed
      // the page lists the same parts in the same order (AVE-77).
      const tagged = el.hasAttribute("data-parity-i");
      const nodes = tagged
        ? [el, ...el.querySelectorAll("[data-parity-i]")].sort(
            (a, b) => Number(a.getAttribute("data-parity-i")) - Number(b.getAttribute("data-parity-i")),
          )
        : [el, ...[...el.querySelectorAll("*")].filter((e) => visible(e) && !(e.closest("svg") && e.tagName.toLowerCase() !== "svg"))];
      if (!tagged) nodes.forEach((e, i) => e.setAttribute("data-parity-i", String(i)));
      return {
        text: (el as HTMLElement).innerText.trim(),
        parts: nodes.map((e, index) => {
          const s = getComputedStyle(e);
          return {
            index,
            tag: e.tagName.toLowerCase(),
            slot: e.getAttribute("data-slot"),
            text: [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim(),
            width: e.getBoundingClientRect().width,
            height: e.getBoundingClientRect().height,
            style: Object.fromEntries(props.map((p) => [p, s.getPropertyValue(p)])),
            ...(e.tagName.toLowerCase() === "svg"
              ? {
                  // A lucide icon names itself in a class; any other is known by its shapes (AVE-77).
                  glyph:
                    [...e.classList].find((c) => c.startsWith("lucide-")) ??
                    [...e.querySelectorAll("path,circle,rect,line,polyline,polygon,ellipse")]
                      .map((n) => n.getAttribute("d") ?? [...n.attributes].map((a) => `${a.name}=${a.value}`).join(" "))
                      .join("|")
                      .slice(0, 200),
                  markup: e.innerHTML,
                }
              : {}),
            ...(e instanceof HTMLInputElement || e instanceof HTMLTextAreaElement ? { value: e.value, placeholder: e.placeholder } : {}),
            align: s.textAlign,
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

/**
 * Whether the two match exactly once one is moved by a whole pixel (AVE-77). After reconciling, Chrome can round a
 * line of text a pixel lower on one side; that is layout rounding, not a difference pixels can judge, so the
 * comparison stays styles-only rather than being called unexplained.
 */
function matchesShifted(a: Buffer, b: Buffer): boolean {
  const pa = PNG.sync.read(a);
  const pb = PNG.sync.read(b);
  if (pa.width !== pb.width || pa.height !== pb.height) return false;
  const { width: w, height: h } = pa;
  for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
    const moved = new PNG({ width: w, height: h });
    moved.data.fill(255);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const sx = x - dx;
        const sy = y - dy;
        if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
        pb.data.copy(moved.data, (y * w + x) * 4, (sy * w + sx) * 4, (sy * w + sx) * 4 + 4);
      }
    }
    // Compare inside a 1px margin, where the moved image has no gap.
    const inner = (img: PNG) => {
      const cropped = new PNG({ width: w - 2, height: h - 2 });
      PNG.bitblt(img, cropped, 1, 1, w - 2, h - 2, 0, 0);
      return cropped.data;
    };
    if (w > 2 && h > 2 && pixelmatch(inner(pa), inner(moved), null, w - 2, h - 2, { threshold: PIXEL_THRESHOLD }) === 0) return true;
  }
  return false;
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
      const rec = r.reconciled
        ? `<p class="m"><b>Reconciled</b> (AVE-77): ${r.reconciled.styles.length} allowed values applied to the app${r.reconciled.styles.length ? ` (${esc(r.reconciled.styles.join("; "))})` : ""}, ${r.reconciled.texts} texts given to Avenue · ${r.reconciled.changedPixels} px differ after</p><div class="imgs"><figure><figcaption>App, reconciled</figcaption><img src="${r.reconciled.files.app}"></figure><figure><figcaption>Avenue, reconciled</figcaption><img src="${r.reconciled.files.avenue}"></figure>${r.reconciled.files.diff ? `<figure><figcaption>Diff, reconciled</figcaption><img src="${r.reconciled.files.diff}"></figure>` : ""}</div>`
        : "";
      return `<section class="${r.verdict}"><h3>${badge(r.verdict)} ${esc(r.avenueStory)} · ${esc(r.label)} · ${r.combo}</h3><p class="m">App: ${esc(r.app)}${r.changedPixels !== undefined ? ` · ${r.changedPixels} px differ` : ""}${r.stylesOnly ? ` · <b>styles only</b>: pixels not judged, ${esc(r.stylesOnly)}` : r.reconciled ? " · pixels judged after reconciling" : " · pixels judged"}${r.error ? ` · <b>${esc(r.error)}</b>` : ""}</p>${imgs}${rec}${diffs ? `<table><tr><th>Where</th><th>Property</th><th>App</th><th>Avenue</th><th>Because</th></tr>${diffs}</table>` : ""}</section>`;
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
  // Each pair's app commit: APP_BASELINE, its look before it adopted Avenue, or the commit the pair names in `at`
  // (AVE-141). `--app-ref` builds every pair from one other commit to look at drift; only the pinned commits are the proof.
  const appRef = flag(args, "--app-ref");
  const refOf = (pair: Pair) => appRef ?? pair.at?.commit ?? APP_BASELINE.commit;
  const refs = [...new Set(Object.values(PAIRS).flatMap((e) => (Array.isArray(e) ? e.map(refOf) : [])))].sort();
  const avenueBuild = join(out, "build-avenue");
  const reportDir = join(out, "report");
  const metaFile = join(out, "app-build.json");
  type AppMeta = { ref: string; commit: string; stubbed: boolean; desktopCss: string };

  if (!reuse) {
    if (!(await Bun.file(join(appDir, "package.json")).exists())) {
      throw new Error(`No ManyAve Management checkout at ${appDir}; pass --app <path>.`);
    }
    await rm(out, { recursive: true, force: true });
    await mkdir(out, { recursive: true });
    const metas: AppMeta[] = [];
    for (const ref of refs) {
      console.log(`Building the app's Storybook from ${appDir} at ${ref.slice(0, 8)} ...`);
      const built = await buildApp(appDir, ref, join(out, `build-app-${ref.slice(0, 12)}`));
      metas.push({ ref, ...built, desktopCss: git(["show", `${built.commit}:src/desktop.css`], appDir) });
    }
    await Bun.write(metaFile, JSON.stringify(metas));
    console.log("Building Avenue's Storybook ...");
    await must(["bunx", "storybook", "build", "--quiet", "-o", avenueBuild], root);
  }
  const metas = (await Bun.file(metaFile).json()) as AppMeta[];
  await rm(reportDir, { recursive: true, force: true });
  await mkdir(reportDir, { recursive: true });

  // One served Storybook per app commit, with its story ids and its desktop type scale: the app's Storybook has no
  // switch for it, so its four values from the app's desktop.css are applied to the app's stories here; Avenue's
  // stories use Avenue's own switch, which must give the same values (checked on every desktop capture).
  const apps = new Map(
    await Promise.all(
      metas.map(async (m) => {
        const dir = join(out, `build-app-${m.ref.slice(0, 12)}`);
        const vars = rootVariables(m.desktopCss);
        return [
          m.ref,
          {
            meta: m,
            ids: storyIds(await Bun.file(join(dir, "index.json")).json()),
            server: serve(dir),
            desktopVars: vars,
            desktopCss: `:root{${Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(";")}}`,
            scale: new Map<string, string>(),
          },
        ] as const;
      }),
    ),
  );
  const appFor = (pair: Pair) => {
    const app = apps.get(refOf(pair));
    if (!app) throw new Error(`No app build for ${refOf(pair)}; run without --reuse.`);
    return app;
  };
  const avenueIds = storyIds(await Bun.file(join(avenueBuild, "index.json")).json());
  const problems = mapProblems(PAIRS, storiesToPair(avenueIds), (pair) => appFor(pair).ids);

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
        if (!appFor(pair).ids.includes(pair.app)) continue;
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
    for (const app of apps.values()) await app.server.stop(true);
    await avenueServer.stop(true);
  }

  async function compare(tab: Page, story: string, i: number, pair: Pair, combo: Combo): Promise<Result> {
    const label = pair.label ?? pair.app;
    const base: Omit<Result, "verdict" | "differences"> = { avenueStory: story, label, app: pair.app, combo: comboName(combo) };
    const desktop = combo.typeScale === "desktop";
    const { server: appServer, desktopVars, desktopCss, scale: appScale } = appFor(pair);
    try {
      await open(tab, storyUrl(`http://localhost:${appServer.port}`, pair.app, `theme:${combo.theme}`), desktop ? desktopCss : "");
      if (desktop && appScale.size === 0) for (const [k, v] of await tab.evaluate(resolvedSizes, Object.keys(desktopVars))) appScale.set(k, v);
      const app = await shoot(tab, pair.appCrop, pair.keepFocus);
      await open(tab, storyUrl(`http://localhost:${avenueServer.port}`, story, `theme:${combo.theme};typeScale:${combo.typeScale}`, pair.avenueArgs), "", true);
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
      // Why reconciling didn't get the pixels to judge, for the report (AVE-77).
      let unreconciled = "";
      if (!j.judged) {
        // Pixels couldn't judge as captured: apply the allowed values to the app and the app's text to Avenue, and
        // judge the pixels left over (AVE-77).
        const plan = reconcile(app.parts, avenue.parts, differences, pair.frame === true);
        if (plan) {
          await open(tab, storyUrl(`http://localhost:${appServer.port}`, pair.app, `theme:${combo.theme}`), desktop ? desktopCss : "");
          const app2 = await shoot(tab, pair.appCrop, pair.keepFocus, {
            styles: plan.styles,
            texts: [],
            icons: [],
            frame: plan.frame,
            // Both boxes keep the app's size: an allowed border width would otherwise shrink the app's.
            frameSize: plan.frame,
          });
          await open(tab, storyUrl(`http://localhost:${avenueServer.port}`, story, `theme:${combo.theme};typeScale:${combo.typeScale}`, pair.avenueArgs), "", true);
          const avenue2 = await shoot(tab, pair.avenueCrop, pair.keepFocus, {
            styles: [],
            texts: plan.texts,
            icons: plan.icons,
            values: plan.values,
            frame: plan.frame,
            frameSize: plan.frame,
            phase: app2.offset,
            // Only a block that sets its text alike: an inline amount right-aligned by the app's table cell would
            // otherwise just move its text across a wider box.
            width:
              app2.parts[0] && avenue.parts[0] && app2.parts[0].align === avenue.parts[0].align && !/^inline/.test(avenue.parts[0].style["display"] ?? "")
                ? app2.parts[0].width
                : undefined,
          });
          // A frame's contents are hidden on both sides, so its text is not compared here.
          const sameText2 = plan.frame ? true : app2.text === avenue2.text;
          // An icon given the app's drawing still carries its own lucide class, so its glyph difference is spent.
          const left = explain(styleDifferences(app2.parts, avenue2.parts, sameText2, !!plan.frame), pair.allow).filter(
            (d) => !(d.prop === "glyph" && plan.icons.some((icon) => icon.index === d.avenueIndex)),
          );
          const after = diffPngs(app2.png, avenue2.png);
          const j2 = pixelJudgement({
            sameText: sameText2,
            frame: false,
            differences: left,
            changed: after.changed,
            subpixel: !sameOffset(app2.offset, avenue2.offset),
          });
          // Reconciled pixels only judge when both crops sit on the same sub-pixel offset: a shifted edge on a
          // reconciled border (the desktop switch, at 18.4px) is shading, not a difference.
          const shifted = j2.judged && after.changed > 0 && matchesShifted(app2.png, avenue2.png);
          if (j2.judged && sameOffset(app2.offset, avenue2.offset) && !shifted) {
            const reconciledFiles = {
              app: `${stem}.app-reconciled.png`,
              avenue: `${stem}.avenue-reconciled.png`,
              diff: after.changed > 0 ? `${stem}.diff-reconciled.png` : undefined,
            };
            await Bun.write(join(reportDir, reconciledFiles.app), app2.png);
            await Bun.write(join(reportDir, reconciledFiles.avenue), avenue2.png);
            if (reconciledFiles.diff) await Bun.write(join(reportDir, reconciledFiles.diff), after.diff);
            const reconciled = {
              styles: plan.styles.map((x) => `${x.prop}: ${x.value}`),
              texts: plan.texts.length,
              changedPixels: after.changed,
              files: reconciledFiles,
            };
            // Pixels the allowances don't explain make the comparison unexplained, whatever the styles said.
            const v = after.changed > 0 ? "unexplained" : verdict(differences, false, sameText);
            return { ...base, verdict: v, differences, changedPixels: changed, sameText, stylesOnly: undefined, files, reconciled };
          }
          unreconciled = shifted
            ? "reconciled, but the drawing lands a whole pixel apart (layout rounding)"
            : !sameOffset(app2.offset, avenue2.offset)
            ? "reconciled, but the two sit at different sub-pixel offsets"
            : `reconciled, but ${j2.judged ? "" : j2.why}${left.length ? ` (${[...new Set(left.map((d) => d.prop))].slice(0, 4).join(", ")})` : ""}`;
        } else {
          unreconciled = "nothing to reconcile, or a part shows on one side only";
        }
      }
      // Unjudged: say so, so "same" never stands for "looked at the styles only".
      const stylesOnly = j.judged ? undefined : unreconciled ? `${j.why}; ${unreconciled}` : j.why;
      return { ...base, verdict: verdict(differences, j.judged && changed > 0, sameText), differences, changedPixels: changed, sameText, stylesOnly, files };
    } catch (error) {
      return { ...base, verdict: "error", differences: [], error: error instanceof Error ? error.message.split("\n")[0] : String(error) };
    }
  }

  const meta = {
    "App commit": appRef
      ? `${metas[0]?.commit} for every pair (--app-ref: a look at drift, not the proof)`
      : metas
          .map((m) => `${m.commit} (${m.ref === APP_BASELINE.commit ? `baseline: ${APP_BASELINE.why}` : (Object.values(PAIRS).flatMap((e) => (Array.isArray(e) ? e : [])).find((p) => p.at?.commit === m.ref)?.at?.why ?? "")})`)
          .join("; "),
    "Point packages": metas.some((m) => m.stubbed) ? "stubbed (no registry access)" : "installed",
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
    `\n${results.length} comparisons against app ${metas.map((m) => m.commit).join(" + ")}: ${count("same")} same, ${count("agreed-fix")} agreed fixes, ${count("known-bug")} known bugs, ${count("app-local")} drawn by the app's screen, ${count("unexplained")} unexplained, ${count("error")} errors; ${unpaired.length} unpaired stories, ${problems.length} map problems.\n${results.length - stylesOnly} judged on pixels and styles, ${stylesOnly} on styles only (${stylesOnlySame} of those "same").`,
  );
  console.log(`Report: ${join(reportDir, "index.html")}`);
  process.exit(bad.length > 0 || problems.length > 0 ? 1 : 0);
}

if (import.meta.main) await main();
