import type { ColorScheme, ColorSchemeOptions, ColorSchemeState, ColorSchemeValue } from "@ui-sdk/core";
import { Preferences as UiPreferences, usePreference } from "@ui-sdk/react/preferences";
import { type ComponentProps, useLayoutEffect } from "react";
import { isColorScheme } from "#avenue/lib/preferences-script";
import { defined, type Loose } from "#avenue/lib/props";

export type { ColorScheme, ColorSchemeOptions, ColorSchemeState, ColorSchemeValue };
export { usePreference };
// The color scheme and the first-paint script are plain JavaScript, so an app's build config can import them too
// (`@manyave/avenue/preferences-script`).
export { COLOR_SCHEME_KEY, colorSchemeScript, createColorScheme, preferencesScript } from "#avenue/lib/preferences-script";

/** The theme on screen: `.dark` on `<html>` for Dark, or for System while the computer is dark. `preferencesScript`
 * applies the same rule before the first paint (src/lib/preferences-script.mjs). */
function applyDark({ resolved }: ColorSchemeState) {
  if (resolved !== "unknown") document.documentElement.classList.toggle("dark", resolved === "dark");
}

/** Keeps `.dark` on `<html>` in step with one color scheme: each choice, and the computer's appearance under System. */
function DarkClass({ colorScheme }: { colorScheme: ColorScheme }) {
  const state = usePreference(colorScheme);
  useLayoutEffect(() => applyDark(state), [state]);
  return null;
}

/**
 * ui-sdk's `Preferences`, which puts each preference on its `data-*` attribute and keeps it current, plus Avenue's
 * `.dark`: for a color scheme from `createColorScheme`, it puts `.dark` on `<html>` whenever the theme on screen is
 * dark, and follows the computer while the choice is System. Mount it once, around the app. Before the first paint,
 * `preferencesScript` does the same from the saved choice.
 */
function Preferences({ preferences, children, ...props }: Loose<ComponentProps<typeof UiPreferences>>) {
  return (
    <UiPreferences preferences={preferences} {...defined(props)}>
      {preferences.filter(isColorScheme).map((colorScheme, index) => (
        <DarkClass key={index} colorScheme={colorScheme} />
      ))}
      {children}
    </UiPreferences>
  );
}

export { Preferences };
