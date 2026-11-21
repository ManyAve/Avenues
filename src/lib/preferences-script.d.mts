/**
 * Types for `@manyave/avenue/preferences-script` (./preferences-script.mjs), the part of Avenue's theme preference an
 * app's build config imports (AVE-193). Keep in step with ./preferences-script.mjs.
 */
import type { ColorScheme, ColorSchemeOptions, PreferenceLike } from "@ui-sdk/core";

/** Where Avenue's color scheme keeps the choice unless an app gives its own `storage`. */
export declare const COLOR_SCHEME_KEY = "avenue-color-scheme";

/**
 * The page's theme choice: ui-sdk's `createColorScheme`, on `<html>` (`global`) and kept in local storage under
 * `avenue-color-scheme` unless `storage` says otherwise. It holds System, Light or Dark (System, the default, follows
 * the computer), saves each change and reads it back on the next visit. Pass it to `Preferences`, which puts Avenue's
 * `.dark` on `<html>`, and to `ModeToggle`'s `colorScheme`. Every ui-sdk option works the same; `global` is always
 * on, because Avenue's dark tokens are set from `<html>` (tokens.css's `:root.dark`).
 */
export declare function createColorScheme(options?: Omit<ColorSchemeOptions, "global">): ColorScheme;

/** Whether a preference is a page-wide ui-sdk color scheme, the kind `Preferences` puts `.dark` on `<html>` for. */
export declare function isColorScheme(preference: PreferenceLike): preference is ColorScheme;

/**
 * The script that puts every saved preference on its attribute before the page paints: ui-sdk's `preferencesScript`,
 * plus Avenue's `.dark` for a color scheme among them. Avenue's apps render in the browser, so ui-sdk's `Preferences`
 * never sends its server script; put this one in a `<script>` at the top of the page's `<head>` instead (in Vite,
 * from `transformIndexHtml`), so a saved Dark never flashes light.
 */
export declare function preferencesScript(preferences: readonly PreferenceLike[]): string;

/**
 * `preferencesScript([createColorScheme(options)])`: the first-paint script for an app whose only page-wide
 * preference is the theme. Give it the same `storage` the app's scheme uses.
 */
export declare function colorSchemeScript(options?: Omit<ColorSchemeOptions, "global">): string;
