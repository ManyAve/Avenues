/**
 * AVE-145: every change callback of every Avenue component takes ui-sdk's details second, as ui-sdk's own do:
 * `on<Key>Change(value, details)`, where details carry the reason, the source (an agent's change says "agent") and
 * `cancel()`. It runs in `bun run typecheck`: an exported `on…Change` prop whose callback has no second parameter,
 * or one without ui-sdk's `source` and `cancel`, fails to compile here, naming its file, component and prop. It reads
 * the component files listed in optional-props.ts, which scripts/optional-props.test.ts keeps complete.
 */
import type { ChangeSource } from "@ui-sdk/core";
import type { DOMAttributes } from "react";
import type { Modules } from "./optional-props";

/** What ui-sdk's details always carry, whatever the component. */
type UiSdkDetails = { source: ChangeSource; cancel: () => void; readonly canceled: boolean };

/** A state's change callback: `on<Key>Change`, not a DOM event handler like `onChange` or `onVolumeChange`. */
type ChangeKey<P> = Exclude<keyof P & `on${string}Change`, keyof DOMAttributes<Element>>;

/** The `on…Change` keys of P whose callback doesn't take ui-sdk's details second. Distributes over unions. */
type DropsDetails<P> = P extends unknown
  ? {
      [K in ChangeKey<P>]-?: NonNullable<P[K]> extends (value: never, details: infer D, ...rest: never[]) => unknown
        ? Parameters<NonNullable<P[K]>> extends [unknown, unknown, ...unknown[]]
          ? D extends UiSdkDetails
            ? never
            : K
          : K
        : K;
    }[ChangeKey<P>]
  : never;

/** "file › Component › prop" for every component (a capitalised function export) and change callback without details. */
type Failures = {
  [F in keyof Modules]: {
    [C in keyof Modules[F]]: C extends Capitalize<C & string>
      ? Modules[F][C] extends (props: infer P, ...rest: never[]) => unknown
        ? `${F & string} › ${C & string} › ${DropsDetails<P> & string}`
        : never
      : never;
  }[keyof Modules[F]];
}[keyof Modules];

/** Fails to compile while any change callback drops ui-sdk's details; the error names the first such prop. */
declare function everyChangeTakesDetails<_T extends never>(): void;
everyChangeTakesDetails<Failures>();
