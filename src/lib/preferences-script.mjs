// Plain JavaScript, so an app's build config (vite.config.ts, which Node loads) can import it to write the first-paint
// script into index.html, as it imports `@manyave/avenue/oxlint` (AVE-193). Types in ./preferences-script.d.mts;
// src/components/preferences.tsx re-exports all of it for the app's own code.
import { createColorScheme as createUiColorScheme, createLocalStorage, preferencesScript as uiPreferencesScript } from "@ui-sdk/core";

/** Where Avenue's color scheme keeps the choice unless an app gives its own `storage`. */
export const COLOR_SCHEME_KEY = "avenue-color-scheme";

export function createColorScheme(options = {}) {
  return createUiColorScheme({ storage: createLocalStorage(COLOR_SCHEME_KEY), ...options, global: true });
}

export function isColorScheme(preference) {
  return preference.global && preference.attribute === "data-color-scheme" && "resolved" in preference.get();
}

// Runs right after ui-sdk's script has put the saved choice on `data-color-scheme`: `.dark` for Dark, or for System
// while the computer is dark, the rule Preferences follows after that (src/components/preferences.tsx, applyDark).
const darkScript =
  '(function(){try{var h=document.documentElement,v=h.getAttribute("data-color-scheme");' +
  'if(v==="light"||v==="dark"||v==="system")h.classList.toggle("dark",v==="dark"||v==="system"&&' +
  'matchMedia("(prefers-color-scheme: dark)").matches)}catch(e){}})()';

export function preferencesScript(preferences) {
  const script = uiPreferencesScript(preferences);
  return preferences.some(isColorScheme) ? `${script};${darkScript}` : script;
}

export function colorSchemeScript(options = {}) {
  return preferencesScript([createColorScheme(options)]);
}
