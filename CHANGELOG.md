# Changelog

What changed for apps that install Avenue. See the README, "Versions", for what moves the minor and patch numbers.

## v0.1.2 (2026-11-14)

- Checks for apps (AVE-104, AVE-105; README, "Checks for apps"). Nothing an app already uses changes.
  - `avenue-check-patches`: fails when the app doesn't carry or list Avenue's ui-sdk patches, or its copies differ.
  - `avenue-check-classes [paths...]`: Avenue's class rules (retired corners, off-grid spacing, `hit-area` with
    `after:`, literal breakpoints) over the app's own source.
  - `@manyave/avenue/checks/touch-targets` and `@manyave/avenue/checks/name-clash`: the 44px tap measure, the mouse
    minimums and the name-clash check, as plain DOM functions an app's story or browser tests call.

## v0.1.1 (2026-11-14)

- Toast: `showWith`'s returned function types its options in full, so an app's type check no longer fails on
  `action` (TS7031) when it reads Avenue's source (found installing Avenue in Management, MANA-1118). No API change.

## v0.1.0 (2026-11-14)

The first version an app can install (AVE-103).

- 49 components, the tokens, `styles.css`, `desktop.css`, `cn` and the formatting helpers, as listed in the README
  under "Using Avenue from another package".
- ui-sdk `0.1.0-beta.2` (`@ui-sdk/core` and `@ui-sdk/react`), pinned exactly. An app must not install another
  version.
- One patch to `@ui-sdk/core` that an app must carry too: `patches/@ui-sdk%2Fcore@0.1.0-beta.2.patch` (an empty
  toast region left out of the agent snapshot, AVE-43; popups placed on whole device pixels, AVE-21).
- Peer dependencies: `react` and `react-dom` `^19.3.0`, `tailwindcss` `^4.3.0`.
- Classes Avenue's stylesheet retires: Tailwind's own corner sizes (for example `rounded-4xl`) produce no CSS,
  because Avenue's corner scale replaces them. Find and replace them in the app before loading the stylesheet (AVE-105 makes Avenue's class check runnable from an app).
