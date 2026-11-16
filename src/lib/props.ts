import type { RenderProp } from "@ui-sdk/react/primitive";
import type { ComponentProps, JSX, ReactNode } from "react";

/**
 * ui-sdk declares its optional props without `| undefined` (`onClick?: (event) => void`), so under
 * `exactOptionalPropertyTypes` an app can't pass a maybe-undefined value to them (`<Button onClick={onSave}>` with
 * `onSave` possibly undefined fails with TS2375). Every Avenue component takes its ui-sdk part's props through
 * `Loose`, and hands them on through `defined` (AVE-108). `src/type-tests/optional-props.ts` fails the typecheck
 * if an optional prop of any component rejects `undefined` again.
 */

/**
 * P, where every optional prop also takes `undefined`. Required props stay required and unchanged. Distributes over a
 * union of props, so a discriminated union keeps its members.
 */
export type Loose<P> = { [K in keyof P]: P[K] | ({} extends Pick<P, K> ? undefined : never) };

/**
 * What `defined(props)` returns: a prop that may be `undefined` becomes optional without `undefined` (the key is
 * dropped at run time), which is what a ui-sdk part accepts. Other props are unchanged. Distributes over a union.
 */
export type Defined<P> = P extends unknown
  ? { [K in keyof P as undefined extends P[K] ? K : never]?: Exclude<P[K], undefined> } & {
      [K in keyof P as undefined extends P[K] ? never : K]: P[K];
    }
  : never;

/**
 * `props` without its `undefined` values, to spread onto a ui-sdk part. A prop set to `undefined` means "not set"
 * (React's own reading); dropping the key makes that literal, so the part behaves exactly as if it were left out.
 */
export function defined<P extends object>(props: P): Defined<P> {
  const kept: Record<string, unknown> = {};
  for (const key of Object.keys(props) as (keyof P & string)[]) {
    if (props[key] !== undefined) kept[key] = props[key];
  }
  // `kept` is `props` minus the keys whose value is undefined, which is exactly Defined<P>.
  return kept as Defined<P>;
}

/**
 * P with plain `children`, for a component that puts its children inside markup of its own: ui-sdk also types
 * children as a function of the part's state, which such a component would render as a function, and which an app
 * can't pass on as a ReactNode. Distributes over a union.
 */
export type NodeChildren<P> = P extends unknown ? Omit<P, "children"> & { children?: ReactNode | undefined } : never;

/**
 * The props of a part Avenue draws itself with `renderElement`: the element's own props, plus `render`. Its
 * className, style and children are plain, since the part has no state for a function of them to read.
 */
export type OwnPartProps<Tag extends keyof JSX.IntrinsicElements> = ComponentProps<Tag> & {
  render?: RenderProp | undefined;
};
