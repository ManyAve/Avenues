/**
 * Who uses each of Avenue's tokens (AVE-184; docs/tokens.md, "Every token earns its place").
 *
 * A token is one logical name: its raw variable and its Tailwind theme name together (`--card` and `--color-card`,
 * `--text-meta` and `--text-meta--line-height`, `--font-weight-emphasis`). A **user** is one place that reads it:
 * a component, lib or hook file (however many times that file reads it), or one declaration or rule in Avenue's own
 * stylesheets (`--chart-3: var(--color-slate-500)` is a user of slate-500). A token's own definitions, and its names
 * reading each other, are not users. Stories and tests are not users: a token only a story shows has no job yet.
 *
 * A token with fewer than two users fails the test unless a reason sits beside its definition, written as a comment
 * that holds `kept:` and the reason after it, either on the declaration's own line or directly above a run of declarations (no blank line
 * between), where it covers the whole run: a step in a scale, a contract kept for shadcn or ui-sdk, a keyframe.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { type AtRule, type Declaration, parse, type Rule } from "postcss";
import ts from "typescript";

const root = join(import.meta.dir, "..");
const styles = join(root, "src", "styles");
/** Avenue's own token stylesheets. ui-sdk.css and shadcn.css are generated copies of other packages' CSS. */
export const TOKEN_STYLESHEETS = ["tokens.css", "avenue.css", "desktop.css", "ui-sdk-theme.css"];
/** Where the components live. Stories (src/stories) and tests are left out on purpose. */
const SOURCE_DIRS = ["src/components", "src/lib", "src/hooks"];

/** Tailwind theme namespaces, longest first, and the classes each one makes from a name. */
const SPACING_PREFIX =
  "-?(?:p[xytrblse]?|m[xytrblse]?|gap(?:-[xy])?|space-[xy]|inset(?:-[xy])?|top|right|bottom|left|start|end|scroll-[mp][xytrblse]?|w|h|size|min-[wh]|max-[wh]|basis|translate-[xy])";
const NAMESPACES: [namespace: string, classes: (name: string) => string][] = [
  ["transition-duration", (n) => `duration-${n}`],
  ["font-weight", (n) => `font-${n}`],
  ["breakpoint", (n) => `(?:max-)?${n}:`],
  ["container", (n) => `(?:max-|min-)?w-${n}`],
  ["z-index", (n) => `-?z-${n}`],
  ["animate", (n) => `animate-${n}`],
  ["spacing", (n) => `${SPACING_PREFIX}-${n}`],
  ["radius", (n) => `rounded(?:-[a-z]{1,2})?-${n}`],
  ["shadow", (n) => `shadow-${n}`],
  ["color", (n) => `(?:bg|text|border(?:-[xytrblse])?|ring|ring-offset|outline|fill|stroke|divide|from|via|to|shadow|accent|caret|decoration|placeholder|inset-ring|inset-shadow)-${n}`],
  ["text", (n) => `text-${n}`],
  ["font", (n) => `font-${n}`],
];

export interface Token {
  /** The logical name: the raw variable's name without `--`, or the theme name without its namespace. */
  name: string;
  /** Every custom property that belongs to it. */
  properties: string[];
  /** Places that read it (file paths, or `file > scope > property` inside the stylesheets). */
  users: string[];
  /** The `kept:` reason beside one of its definitions, if any. */
  reason?: string;
}

interface Definition {
  property: string;
  file: string;
  line: number;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The comment-free text of a TypeScript file, so a token named in prose doesn't count as a use. */
function codeOf(text: string, file: string): string {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, file.endsWith("x") ? ts.LanguageVariant.JSX : ts.LanguageVariant.Standard, text);
  let out = "";
  for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scanner.scan()) {
    if (kind === ts.SyntaxKind.SingleLineCommentTrivia || kind === ts.SyntaxKind.MultiLineCommentTrivia) continue;
    out += scanner.getTokenText();
  }
  return out;
}

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walk(path);
    return /\.tsx?$/.test(entry.name) && !/\.(test|stories)\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

/** The `kept:` reason for the declaration on `line` (1-based), from its own line or a comment heading its run. */
function reasonAt(lines: string[], line: number): string | undefined {
  const own = /\/\*\s*kept:\s*(.+?)\s*\*\//.exec(lines[line - 1]!);
  if (own) return own[1];
  for (let i = line - 2; i >= 0; i--) {
    const text = lines[i]!.trim();
    if (text === "" || text.endsWith("{") || text.endsWith("}")) return undefined;
    // Another declaration in the run (with or without a comment of its own), or a continued value.
    if (!text.endsWith("*/") || text.startsWith("--")) continue;
    let start = i;
    while (start > 0 && !lines[start]!.includes("/*")) start--;
    const comment = lines.slice(start, i + 1).join(" ");
    // The reason may close a longer comment: `/* What this is. kept: why it stays. */`.
    const kept = /\bkept:\s*([\s\S]+?)\s*\*\//.exec(comment);
    return kept ? kept[1]!.replace(/\s+/g, " ") : undefined;
  }
  return undefined;
}

/** Counts every token. `planted` adds stylesheets as if they were Avenue's, for the test to plant a one-off in. */
export function countTokenUse(planted: { file: string; css: string }[] = []): Token[] {
  const sheets = [...TOKEN_STYLESHEETS.map((file) => ({ file, css: readFileSync(join(styles, file), "utf8") })), ...planted];

  // 1. Every definition, grouped into logical tokens.
  const definitions: Definition[] = [];
  for (const { file, css } of sheets) {
    parse(css).walkDecls(/^--/, (decl) => {
      if (decl.value.trim() === "initial") return; // a namespace reset (`--radius-*: initial`), not a token
      definitions.push({ property: decl.prop, file, line: decl.source!.start!.line });
    });
  }
  const raw = new Set(definitions.map((d) => d.property.slice(2)));
  const logicalName = (property: string): { name: string; namespace?: string; themeName?: string } => {
    const bare = property.slice(2).replace(/--line-height$/, "");
    for (const [namespace] of NAMESPACES) {
      if (!bare.startsWith(`${namespace}-`)) continue;
      const themeName = bare.slice(namespace.length + 1);
      // `--color-card` is the theme name of `--card`; `--color-onyx-500` has no raw twin and is its own token.
      return { name: raw.has(themeName) && namespace !== "font" ? themeName : bare, namespace, themeName };
    }
    return { name: bare };
  };
  const tokens = new Map<string, Token & { patterns: RegExp[] }>();
  for (const d of definitions) {
    const { name, namespace, themeName } = logicalName(d.property);
    const token = tokens.get(name) ?? { name, properties: [], users: [], patterns: [] };
    if (!token.properties.includes(d.property)) {
      token.properties.push(d.property);
      token.patterns.push(new RegExp(`(?<![\\w-])--${escape(d.property.slice(2))}(?![\\w-])(?!\\s*:)`));
      const classes = NAMESPACES.find(([n]) => n === namespace)?.[1];
      if (classes && themeName && !d.property.endsWith("--line-height")) {
        // A variant (`max-phone:`) runs straight into the class it scopes; a utility ends at a space or quote.
        const end = namespace === "breakpoint" ? "" : "(?:/[\\w.%-]+)?!?(?![\\w-])";
        token.patterns.push(new RegExp(`(?<![\\w-])(?:[\\w-]+:|\\[[^\\]]*\\]:)*!?${classes(escape(themeName))}${end}`));
      }
    }
    tokens.set(name, token);
  }
  const owner = new Map<string, string>();
  for (const token of tokens.values()) for (const p of token.properties) owner.set(p, token.name);

  const use = (text: string, user: string, self?: string) => {
    for (const token of tokens.values()) {
      if (token.name === self || token.users.includes(user)) continue;
      if (token.patterns.some((p) => p.test(text))) token.users.push(user);
    }
  };

  // 2. Users inside the stylesheets: each declaration's value, and each rule's @apply.
  for (const { file, css } of sheets) {
    const scopeOf = (node: Declaration | AtRule) => {
      const parts: string[] = [];
      for (let n = node.parent; n && n.type !== "root"; n = n.parent) {
        parts.unshift(n.type === "rule" ? (n as Rule).selector : `@${(n as AtRule).name} ${(n as AtRule).params}`.trim());
      }
      return `${file} > ${parts.join(" > ")}`;
    };
    const tree = parse(css);
    tree.walkDecls((decl) => {
      const self = decl.prop.startsWith("--") ? owner.get(decl.prop) : undefined;
      // A plain property (`background-color` in a utility) makes its whole rule one user.
      use(decl.value, decl.prop.startsWith("--") ? `${scopeOf(decl)} > ${decl.prop}` : scopeOf(decl), self);
    });
    tree.walkAtRules("apply", (rule) => use(rule.params, scopeOf(rule)));
  }

  // 3. Users in the components, lib and hooks: one per file.
  for (const dir of SOURCE_DIRS) {
    for (const path of walk(join(root, dir))) use(codeOf(readFileSync(path, "utf8"), path), relative(root, path));
  }

  // 4. Reasons.
  const linesOf = new Map(sheets.map(({ file, css }) => [file, css.split("\n")]));
  for (const d of definitions) {
    const token = tokens.get(owner.get(d.property)!)!;
    const reason = token.reason ?? reasonAt(linesOf.get(d.file)!, d.line);
    if (reason) token.reason = reason;
  }

  return [...tokens.values()].map(({ name, properties, users, reason }) => (reason ? { name, properties, users, reason } : { name, properties, users }));
}

if (import.meta.main) {
  for (const t of countTokenUse().toSorted((a, b) => a.users.length - b.users.length || a.name.localeCompare(b.name))) {
    console.log(`${String(t.users.length).padStart(3)}  ${t.name}${t.reason ? `  (kept: ${t.reason})` : ""}`);
  }
}
