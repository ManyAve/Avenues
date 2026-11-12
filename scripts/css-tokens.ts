/**
 * A small reader for the custom properties in a token stylesheet. It returns every `--name: value` declaration
 * with the selector (and any enclosing at-rules) it sits under, which is all the token comparison needs.
 * It is not a general CSS parser: it handles comments, nested blocks and multi-line values, nothing more.
 */

export interface Declaration {
  /** Enclosing rules, outermost first, e.g. `@theme inline` or `@media (min-width: 40rem) > :root`. */
  scope: string;
  name: string;
  value: string;
}

/** Collapses whitespace and writes decimals the way oxfmt and the app's files disagree on (`.06` vs `0.06`). */
export function normalizeValue(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/(^|[\s(,/])\.(\d)/g, "$10.$2")
    .trim();
}

export function readDeclarations(css: string): Declaration[] {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const stack: string[] = [];
  const out: Declaration[] = [];
  let buffer = "";
  let parens = 0;

  const flushDeclaration = () => {
    const statement = buffer.trim();
    buffer = "";
    const match = /^(--[\w-]+(?:\*)?)\s*:\s*([\s\S]*)$/.exec(statement);
    if (match?.[1] && match[2] !== undefined && stack.length > 0) {
      out.push({ scope: stack.join(" > "), name: match[1], value: normalizeValue(match[2]) });
    }
  };

  for (const char of text) {
    if (char === "(") parens += 1;
    if (char === ")") parens -= 1;
    if (parens > 0) {
      buffer += char;
      continue;
    }
    if (char === "{") {
      stack.push(buffer.trim().replace(/\s+/g, " "));
      buffer = "";
    } else if (char === "}") {
      flushDeclaration();
      stack.pop();
    } else if (char === ";") {
      flushDeclaration();
    } else {
      buffer += char;
    }
  }
  return out;
}

/** Keys a declaration by where it applies, so `:root` in two files compare against each other. */
export function keyOf(declaration: Declaration): string {
  return `${declaration.scope} :: ${declaration.name}`;
}
