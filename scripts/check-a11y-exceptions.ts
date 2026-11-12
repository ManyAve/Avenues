/**
 * Keeps axe's story check honest. A story may turn off one axe rule, and only with a written reason:
 *
 *   // a11y-exception: the chart's legend swatches are decorative; the values are in the table below.
 *   a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } },
 *
 * Flags a rule turned off (`enabled: false`) without an `a11y-exception:` comment that gives a reason on
 * the same line or one of the two lines above, and any story that switches axe off or back to a warning
 * (`test: "off"` / `test: "todo"`, `disable: true`), which no reason allows.
 *
 *   bun run check:a11y-exceptions [paths...]   (default: src)
 */
import { relative, resolve } from "node:path";

export interface Finding {
  file: string;
  line: number;
  problem: string;
}

const REASON = /a11y-exception:\s*\S.{9,}/;
const RULE_OFF = /\benabled\s*:\s*false\b/;
const CHECK_OFF = /\btest\s*:\s*["'](?:off|todo)["']|\bdisable\s*:\s*true\b/;

export function findProblems(file: string, text: string): Finding[] {
  const lines = text.split("\n");
  const findings: Finding[] = [];
  lines.forEach((content, index) => {
    if (CHECK_OFF.test(content)) {
      findings.push({ file, line: index + 1, problem: "axe is switched off or set to warn; turn off one rule instead, with a reason" });
    }
    if (RULE_OFF.test(content) && !lines.slice(Math.max(0, index - 2), index + 1).some((l) => REASON.test(l))) {
      findings.push({ file, line: index + 1, problem: "axe rule turned off without an `a11y-exception: <reason>` comment" });
    }
  });
  return findings;
}

if (import.meta.main) {
  const root = resolve(import.meta.dir, "..");
  const targets = process.argv.length > 2 ? process.argv.slice(2) : ["src"];
  const glob = new Bun.Glob("**/*.{ts,tsx,mdx}");
  const findings: Finding[] = [];
  let files = 0;

  for (const target of targets) {
    const base = resolve(root, target);
    const paths = (await Bun.file(base).exists()) ? [base] : [...glob.scanSync({ cwd: base, absolute: true })];
    for (const path of paths) {
      files += 1;
      findings.push(...findProblems(relative(root, path), await Bun.file(path).text()));
    }
  }

  for (const f of findings) console.log(`${f.file}:${f.line}  ${f.problem}`);
  console.log(`${files} files checked, ${findings.length} unexplained or blanket axe opt-outs.`);
  process.exit(findings.length > 0 ? 1 : 0);
}
