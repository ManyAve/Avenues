/**
 * The custom properties in a token stylesheet, read with PostCSS: every `--name: value` declaration with the
 * selector (and any enclosing at-rules) it sits under, which is all the token comparison and native export need.
 * PostCSS keeps Tailwind's own syntax (`@theme` with or without options, `--radius-*: initial`) as written, which a
 * standards-only parser such as lightningcss rejects.
 */
import { type AtRule, type Node, parse, type Rule } from "postcss";

export interface Declaration {
  /** Enclosing rules, outermost first, e.g. `@theme inline` or `@media (min-width: 40rem) > :root`. */
  scope: string;
  name: string;
  value: string;
}

const collapse = (text: string) => text.replace(/\s+/g, " ").trim();

/** Collapses whitespace and writes decimals the way oxfmt and the app's files disagree on (`.06` vs `0.06`). */
export function normalizeValue(value: string): string {
  return collapse(value)
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/(^|[\s(,/])\.(\d)/g, "$10.$2");
}

const scopeOf = (node: Node): string | undefined => {
  if (node.type === "rule") return collapse((node as Rule).selector);
  if (node.type === "atrule") return collapse(`@${(node as AtRule).name} ${(node as AtRule).params}`);
  return undefined;
};

export function readDeclarations(css: string): Declaration[] {
  const out: Declaration[] = [];
  parse(css).walkDecls(/^--/, (decl) => {
    const scopes: string[] = [];
    for (let node: Node | undefined = decl.parent; node; node = node.parent) {
      const scope = scopeOf(node);
      if (scope) scopes.unshift(scope);
    }
    out.push({ scope: scopes.join(" > "), name: decl.prop, value: normalizeValue(decl.value) });
  });
  return out;
}

/** Keys a declaration by where it applies, so `:root` in two files compare against each other. */
export function keyOf(declaration: Declaration): string {
  return `${declaration.scope} :: ${declaration.name}`;
}
