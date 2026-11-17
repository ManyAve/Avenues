import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";

// Every part Avenue draws itself takes `render`, like every ui-sdk part (AVE-136): it is typed `OwnPartProps<tag>` and
// renders through `renderElement`, so an app can make a CardTitle an h3 or a Card an article without fighting the
// classes. A part typed with a bare `ComponentProps<"tag">` has no `render`, so this fails on one, naming it.
//
// The exceptions are the composites that are still prop-driven: their slots are props, so swapping their root element
// is not offered yet. Composition now follows ui-sdk (AGENTS.md, "Composition and names follow ui-sdk", AVE-143), so
// each becomes a root and parts and leaves this list as its card lands (AVE-146 to AVE-149). Don't add to it.
const COMPOSITES: Record<string, string> = {
  "detail-list.tsx DetailList": "a description list built from `items`; its dl, dt and dd are the point",
  "detail-list.tsx ListItem": "a row laid out from title, meta, note and trailing props",
  "empty-state.tsx EmptyState": "a prop-driven composite: heading level and actions are props",
  "empty-state.tsx SectionEmpty": "a prop-driven composite: icon, title, line and action are props",
  "page-header.tsx PageHeader": "the page's header landmark, laid out from its props",
  "status-bar.tsx StatusBar": "the register's footer landmark, laid out from its props",
  "top-bar.tsx TopBar": "the app's banner landmark; its home link already takes `homeRender`",
};

const dir = new URL("../src/components/", import.meta.url);

/** Each top-level function in a component file, with its name and source up to the next one. */
function functions(source: string) {
  const starts = [...source.matchAll(/^(?:export )?function (\w+)\(/gm)];
  return starts.map((m, i) => ({ name: m[1]!, body: source.slice(m.index, starts[i + 1]?.index ?? source.length) }));
}

/** The parameter list's type, from the function's `(` to the `{` that opens its body. */
function signature(body: string) {
  const end = body.search(/\)(?::[^{]+)? \{\n/);
  return body.slice(0, end === -1 ? undefined : end);
}

const files = readdirSync(dir).filter((f) => f.endsWith(".tsx"));

test("every part Avenue draws itself takes render", () => {
  const missing: string[] = [];
  for (const file of files) {
    for (const fn of functions(readFileSync(new URL(file, dir), "utf8"))) {
      const key = `${file} ${fn.name}`;
      if (COMPOSITES[key]) continue;
      if (/\bComponentProps<"[a-z]+">/.test(signature(fn.body))) missing.push(key);
    }
  }
  expect(files.length).toBeGreaterThan(0);
  expect(missing).toEqual([]);
});

test("a part typed OwnPartProps hands render to renderElement", () => {
  const dropped: string[] = [];
  for (const file of files) {
    for (const fn of functions(readFileSync(new URL(file, dir), "utf8"))) {
      if (!/\bOwnPartProps</.test(signature(fn.body))) continue;
      // Without this, `render` would land on the DOM element as an attribute and do nothing.
      if (!/renderElement\(/.test(fn.body) || !/\brender\b[,\s]/.test(signature(fn.body))) dropped.push(`${file} ${fn.name}`);
    }
  }
  expect(dropped).toEqual([]);
});

test("every listed composite still exists", () => {
  const found = new Set(
    files.flatMap((file) => functions(readFileSync(new URL(file, dir), "utf8")).map((fn) => `${file} ${fn.name}`)),
  );
  expect(Object.keys(COMPOSITES).filter((key) => !found.has(key))).toEqual([]);
});
