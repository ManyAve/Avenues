/**
 * Builds Avenue's SwiftUI package (AvenueUI, Package.swift) for an iPhone simulator, runs its tests, and so renders
 * every catalog view to native/screenshots/ios/<slug>-<light|dark>.png for Storybook's `Native/*` stories. Needs a Mac
 * with Xcode; there is no Swift toolchain in the Linux container, and `bun run check` doesn't run this.
 *
 *   bun run native:ios [simulator name]
 *
 * Without a name it uses the first available iPhone simulator. Commit the PNGs it changes.
 */
import { spawnSync } from "node:child_process";

if (process.platform !== "darwin") {
  console.error("native:ios needs a Mac with Xcode (xcodebuild and an iOS simulator).");
  process.exit(1);
}

function simulator(): string {
  const wanted = process.argv[2];
  if (wanted) return wanted;
  const list = spawnSync("xcrun", ["simctl", "list", "devices", "available", "--json"], { encoding: "utf8" });
  if (list.status !== 0) throw new Error(list.stderr);
  const devices = Object.entries(JSON.parse(list.stdout).devices as Record<string, { name: string }[]>)
    .filter(([runtime]) => runtime.includes("iOS"))
    .sort(([a], [b]) => b.localeCompare(a, undefined, { numeric: true }))
    .flatMap(([, list]) => list)
    .filter((d) => d.name.startsWith("iPhone"));
  const first = devices[0];
  if (!first) throw new Error("No iPhone simulator is installed (Xcode, Settings, Components).");
  return first.name;
}

const name = simulator();
console.log(`AvenueUI on ${name}`);
const run = spawnSync(
  "xcodebuild",
  ["test", "-scheme", "AvenueUI", "-destination", `platform=iOS Simulator,name=${name}`, "-quiet"],
  { stdio: "inherit" },
);
process.exit(run.status ?? 1);
