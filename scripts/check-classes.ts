#!/usr/bin/env bun
/**
 * Flags class names that break AVE-2's spacing and corner rules:
 *
 * - retired corners: rounded-2xl, rounded-3xl, rounded-4xl (and their side and corner forms, e.g. rounded-t-2xl).
 *   Avenue's theme clears them, so they would silently produce no CSS rather than fail the build.
 * - off-grid spacing: every fractional step but the 2px hairline (*-0.5) on padding, margin, gap, space-between,
 *   inset and scroll spacing: the quarter steps (*-1.25 is 5px, *-2.25 is 9px, *-1.75 is 7px, AVE-79) and the
 *   half steps from 6px up (*-1.5, *-2.5, *-3.5, ...). Sizing (w-, h-, size-) is not spacing and is left alone:
 *   a 14px icon is fine.
 *
 * - `hit-area` and an `after:` utility in the same class string: hit-area owns the control's ::after (AVE-22).
 * - a breakpoint written as a pixel or rem literal (max-[700px]:, min-[1100px]:): the app's breakpoints are named in
 *   avenue.css (`phone`, `desktop`, `wide`), so use max-phone:, wide: and the like (AVE-85).
 *
 *   bun run check:classes [paths...]   (default: src)
 *
 * An app runs the same rules over its own source as `avenue-check-classes [paths...]` (README, "Checks for apps").
 * Paths are read from the folder it runs in.
 */
import { relative, resolve } from "node:path";

const SPACING =
  "-?(?:p[xytrblse]?|m[xytrblse]?|gap(?:-[xy])?|space-[xy]|inset(?:-[xy])?|top|right|bottom|left|start|end|scroll-[mp][xytrblse]?)";

export const rules = [
  {
    name: "retired corner",
    pattern: /(?<![\w-])rounded(?:-(?:[trblse]|tl|tr|bl|br|ss|se|es|ee))?-(?:2xl|3xl|4xl)(?![\w-])/g,
    fix: "use rounded-xl (14px) or, for a label or token, rounded-full",
  },
  {
    name: "off-grid spacing",
    pattern: new RegExp(`(?<![\\w-])${SPACING}-(?:\\d+\\.(?:25|75)|[1-9]\\d*\\.5)(?![\\w.-])`, "g"),
    fix: "use a 4px step (1.5 -> 2, 2.5 -> 2 inside a control or 3 between blocks, 3.5 -> 4; 1.25 -> 1, 1.75 and 2.25 -> 2) or an alias",
  },
  {
    // AVE-22: `hit-area` owns the control's ::after, so an after: utility in the same class string fights it.
    name: "hit-area with after:",
    pattern: /(["'`])(?=[^"'`\n]*(?<![\w-])hit-area(?![\w-]))(?=[^"'`\n]*(?<![\w-])after:)[^"'`\n]*\1/g,
    fix: "hit-area owns ::after; decorate the control with before: or a child element",
  },
  {
    // AVE-85: the app's breakpoints are tokens (--breakpoint-phone, --breakpoint-wide in avenue.css).
    name: "literal breakpoint",
    pattern: /(?<![\w-])(?:max|min)-\[\d+(?:\.\d+)?(?:px|rem|em)\]:/g,
    fix: "use a named breakpoint: max-phone: (below 700px), desktop: (900px up), wide: (1100px up), max-wide: (below 1100px)",
  },
] as const;

export interface Finding {
  file: string;
  line: number;
  match: string;
  rule: string;
  fix: string;
}

export function findViolations(file: string, text: string): Finding[] {
  const findings: Finding[] = [];
  text.split("\n").forEach((content, index) => {
    for (const rule of rules) {
      for (const match of content.matchAll(rule.pattern)) {
        findings.push({ file, line: index + 1, match: match[0], rule: rule.name, fix: rule.fix });
      }
    }
  });
  return findings;
}

if (import.meta.main) {
  const root = process.cwd();
  const targets = process.argv.length > 2 ? process.argv.slice(2) : ["src"];
  const glob = new Bun.Glob("**/*.{ts,tsx,mdx,css}");
  const findings: Finding[] = [];
  let files = 0;

  for (const target of targets) {
    const base = resolve(root, target);
    const paths = (await Bun.file(base).exists()) ? [base] : [...glob.scanSync({ cwd: base, absolute: true })];
    for (const path of paths) {
      files += 1;
      findings.push(...findViolations(relative(root, path), await Bun.file(path).text()));
    }
  }

  for (const f of findings) console.log(`${f.file}:${f.line}  ${f.match}  (${f.rule}: ${f.fix})`);
  console.log(`${files} files checked, ${findings.length} class rule violations (retired corners, off-grid spacing, hit-area with after:, literal breakpoints).`);
  process.exit(findings.length > 0 ? 1 : 0);
}
