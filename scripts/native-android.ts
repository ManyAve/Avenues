#!/usr/bin/env bun
/**
 * Avenue's Compose components (native/android): builds them, runs their unit tests and records their Paparazzi
 * screenshots, then copies each to native/screenshots/android/<slug>-<light|dark>.png, the Android column of the
 * side-by-side component stories. `--check` records into the build folder only and fails when a committed
 * screenshot is missing, stale or extra, so a component change can't ship with old pictures.
 *
 * Needs Java 17+ and the Android SDK (ANDROID_HOME, or sdk.dir in native/android/local.properties). Paparazzi
 * renders with layoutlib on the JVM, so no emulator or device is involved.
 */
import { mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";

export const PROJECT = "native/android";
export const OUT = "native/screenshots/android";
const RECORDED = join(PROJECT, "avenue/src/test/snapshots/images");

/** `com.manyave.avenue_AndroidScreenshots_buttonSizes_button-sizes-dark.png` → `button-sizes-dark.png`. */
export function publishedName(recorded: string): string | null {
  const match = /_AndroidScreenshots_[A-Za-z]+_([a-z0-9-]+-(?:light|dark))\.png$/.exec(recorded);
  return match ? `${match[1]}.png` : null;
}

async function gradle(...tasks: string[]) {
  const proc = Bun.spawn(["./gradlew", ...tasks, "--console=plain", "-q"], {
    cwd: PROJECT,
    stdout: "inherit",
    stderr: "inherit",
  });
  if ((await proc.exited) !== 0) throw new Error(`gradle ${tasks.join(" ")} failed`);
}

async function pngs(dir: string): Promise<string[]> {
  try {
    return (await readdir(dir)).filter((f) => f.endsWith(".png")).toSorted();
  } catch {
    return [];
  }
}

async function main() {
  const check = process.argv.includes("--check");
  await rm(RECORDED, { recursive: true, force: true });
  await gradle(":avenue:testDebugUnitTest", ":avenue:recordPaparazziDebug");

  const recorded = new Map<string, string>();
  for (const file of await pngs(RECORDED)) {
    const name = publishedName(file);
    if (!name) throw new Error(`Unexpected screenshot name: ${file}`);
    recorded.set(name, join(RECORDED, file));
  }

  if (check) {
    const problems: string[] = [];
    const committed = await pngs(OUT);
    for (const [name, path] of recorded) {
      if (!committed.includes(name)) problems.push(`missing ${name}`);
      else if (!Buffer.from(await Bun.file(path).arrayBuffer()).equals(Buffer.from(await Bun.file(join(OUT, name)).arrayBuffer()))) {
        problems.push(`stale ${name}`);
      }
    }
    for (const name of committed) if (!recorded.has(name)) problems.push(`extra ${name}`);
    if (problems.length) {
      console.error(`Android screenshots differ from the components; run \`bun run native:android\`:\n  ${problems.join("\n  ")}`);
      process.exit(1);
    }
    console.log(`${recorded.size} Android screenshots match.`);
    return;
  }

  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  for (const [name, path] of recorded) await Bun.write(join(OUT, name), Bun.file(path));
  console.log(`Wrote ${recorded.size} screenshots to ${OUT}.`);
}

if (import.meta.main) await main();
