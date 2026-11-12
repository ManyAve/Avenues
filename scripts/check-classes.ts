/**
 * Flags class names that break AVE-2's spacing and corner rules:
 *
 * - retired corners: rounded-2xl, rounded-3xl, rounded-4xl (and their side and corner forms, e.g. rounded-t-2xl).
 *   Avenue's theme clears them, so they would silently produce no CSS rather than fail the build.
 * - off-grid spacing: the 6, 10 and 14px steps (*-1.5, *-2.5, *-3.5) on padding, margin, gap, space-between,
 *   inset and scroll spacing. Sizing (w-, h-, size-) is not spacing and is left alone: a 14px icon is fine.
 *
 *   bun run check:classes [paths...]   (default: src)
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
    pattern: new RegExp(`(?<![\\w-])${SPACING}-(?:1\\.5|2\\.5|3\\.5)(?![\\w.-])`, "g"),
    fix: "use a 4px step (1.5 -> 2, 2.5 -> 2 inside a control or 3 between blocks, 3.5 -> 4) or an alias",
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
  const root = resolve(import.meta.dir, "..");
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
  console.log(`${files} files checked, ${findings.length} retired corner or off-grid spacing classes.`);
  process.exit(findings.length > 0 ? 1 : 0);
}
