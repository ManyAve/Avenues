/**
 * Avenue's tokens for the native phone apps (AVE-101): Swift for the SwiftUI apps, Kotlin for the Compose apps, and
 * JSON for anything else, all generated from the same stylesheets the web reads, under the web's role names. ui-sdk
 * is web only, so the phone apps share Avenue's look through these values, not its components.
 *
 *   bun run tokens:native           write native/AvenueTokens.swift, native/AvenueTokens.kt, native/tokens.json
 *   bun run tokens:native --check   fail if any of them is out of date (scripts/native-tokens.test.ts runs it too)
 *
 * Colours resolve the cascade the way a browser does (light = :root then :root:not(.dark); dark = :root, .dark, then
 * :root.dark) and convert OKLCH to sRGB, clipping each channel to the sRGB gamut. Sizes are CSS pixels at 1rem = 16px,
 * which are points on iOS and dp (sp for text) on Android. Spacing takes the phone (coarse pointer) and narrow-screen
 * values, since that's where the apps run. Shadows and the colour-mix colours (selection, filled field) are left out:
 * phones draw elevation and selection with the platform's own.
 */
import { resolve } from "node:path";
import { readDeclarations, type Declaration } from "./css-tokens";

export const root = resolve(import.meta.dir, "..");
export const OUTPUTS = {
  swift: "native/AvenueTokens.swift",
  kotlin: "native/AvenueTokens.kt",
  json: "native/tokens.json",
} as const;

type Vars = Map<string, string>;

/** Semantic colour roles, by their web names. The palette ramps and the desktop sidebar stay web only. */
export const COLOR_ROLES = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "primary-subtle",
  "primary-subtle-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "success",
  "success-foreground",
  "success-subtle",
  "success-subtle-foreground",
  "info",
  "info-foreground",
  "info-subtle",
  "info-subtle-foreground",
  "warning",
  "warning-foreground",
  "warning-subtle",
  "warning-subtle-foreground",
  "destructive",
  "destructive-foreground",
  "destructive-subtle",
  "destructive-subtle-foreground",
  "slate-subtle",
  "slate-subtle-foreground",
  "border",
  "input",
  "ring",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
] as const;

/** Decorative tints for avatars and street bars: each `[data-tint="<name>"]` in avenue.css, its hue and chroma factor. */
export function readTints(avenue: Declaration[]): Record<string, [hue: number, k: number]> {
  const tints: Record<string, [number, number]> = {};
  for (const d of avenue) {
    const name = /^\[data-tint="(\w+)"\]$/.exec(d.scope)?.[1];
    if (!name) continue;
    const tint = (tints[name] ??= [Number.NaN, 1]);
    if (d.name === "--tint-hue") tint[0] = Number.parseFloat(d.value);
    if (d.name === "--tint-k") tint[1] = Number.parseFloat(d.value);
  }
  for (const [name, [hue]] of Object.entries(tints)) {
    if (Number.isNaN(hue)) throw new Error(`[data-tint="${name}"] has no --tint-hue`);
  }
  return tints;
}

/** The app type scale (tokens.css). The public-site display steps (--text-web-*) stay web only. */
export const TEXT_STEPS = ["meta", "compact", "control", "post", "title", "heading", "display"] as const;
export const RADII = ["xs", "sm", "md", "lg", "xl"] as const;
export const SPACING = [
  "inline",
  "group",
  "row-y",
  "inset",
  "page",
  "section",
  "controls",
  "control-xs",
  "control-sm",
  "control-md",
  "control-lg",
] as const;
/** The smallest tap target on a phone (AVE-22, the `hit-area` utility). */
export const TOUCH_MINIMUM = 44;

export interface NativeTokens {
  light: Record<string, string>;
  dark: Record<string, string>;
  text: Record<string, { size: number; lineHeight: number }>;
  radius: Record<string, number>;
  spacing: Record<string, number>;
  touchMinimum: number;
}

function merge(decls: Declaration[], scopes: string[]): Vars {
  const vars: Vars = new Map();
  for (const scope of scopes) {
    for (const d of decls) if (d.scope === scope) vars.set(d.name, d.value);
  }
  return vars;
}

function substitute(value: string, vars: Vars, seen: Set<string> = new Set()): string {
  return value.replace(/var\((--[\w-]+)(?:,\s*([^)]*))?\)/g, (_, name: string, fallback?: string) => {
    if (seen.has(name)) throw new Error(`Token ${name} refers to itself`);
    const next = vars.get(name) ?? fallback;
    if (next === undefined) throw new Error(`Token ${name} is not defined`);
    return substitute(next, vars, new Set([...seen, name]));
  });
}

const number = (s: string) => (s.endsWith("%") ? Number.parseFloat(s) / 100 : Number.parseFloat(s));

/** `oklch(L C H)` (L as a number or a percentage) to `#rrggbb`, clipping each channel to sRGB. */
export function oklchToHex(value: string): string {
  const match = /^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)\s*\)$/.exec(value.trim());
  if (!match?.[1] || !match[2] || !match[3]) throw new Error(`Not an oklch() colour: ${value}`);
  const L = number(match[1]);
  const C = Number.parseFloat(match[2]);
  const h = (Number.parseFloat(match[3]) * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return `#${linear
    .map((x) => {
      const c = Math.min(1, Math.max(0, x));
      const encoded = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
      return Math.round(encoded * 255)
        .toString(16)
        .padStart(2, "0");
    })
    .join("")}`;
}

/** A length in rem or px, or `calc(<length> * <n>)`, in CSS pixels. */
export function toPx(value: string): number {
  const calc = /^calc\(\s*(.+?)\s*\*\s*([\d.]+)\s*\)$/.exec(value);
  if (calc?.[1] && calc[2]) return round(toPx(calc[1]) * Number.parseFloat(calc[2]));
  if (value.endsWith("rem")) return round(Number.parseFloat(value) * 16);
  if (value.endsWith("px")) return round(Number.parseFloat(value));
  throw new Error(`Not a length: ${value}`);
}
const round = (n: number) => Math.round(n * 100) / 100;

export function buildTokens(tokensCss: string, avenueCss: string): NativeTokens {
  const tokens = readDeclarations(tokensCss);
  const avenue = readDeclarations(avenueCss);

  const themes = {
    light: merge(tokens, [":root", ":root:not(.dark)"]),
    dark: merge(tokens, [":root", ".dark", ":root.dark"]),
  };
  const tints = readTints(avenue);
  const colors = (vars: Vars) => {
    const out: Record<string, string> = {};
    for (const role of COLOR_ROLES) out[role] = oklchToHex(substitute(`var(--${role})`, vars));
    for (const [tint, [hue, k]] of Object.entries(tints)) {
      for (const part of ["bg", "fg", "solid"] as const) {
        const l = substitute(`var(--tint-${part}-l)`, vars);
        const c = Number.parseFloat(substitute(`var(--tint-${part}-c)`, vars)) * k;
        out[`tint-${tint}-${part}`] = oklchToHex(`oklch(${l} ${round(c * 1000) / 1000} ${hue})`);
      }
    }
    return out;
  };

  const text: NativeTokens["text"] = {};
  for (const step of TEXT_STEPS) {
    text[step] = {
      size: toPx(substitute(`var(--text-${step})`, themes.light)),
      lineHeight: toPx(substitute(`var(--text-${step}--line-height)`, themes.light)),
    };
  }

  // The @theme block names radii and spacing; the phone values of its --avenue-* variables come from
  // `@media (pointer: coarse)`, and the page inset keeps its narrow-screen value.
  const theme = new Map(avenue.filter((d) => d.scope.startsWith("@theme")).map((d) => [d.name, d.value]));
  const phone: Vars = new Map([
    ...themes.light,
    ...merge(avenue, [":root", "@media (pointer: coarse) > :root"]),
  ]);
  const length = (name: string) => {
    const value = theme.get(name);
    if (value === undefined) throw new Error(`avenue.css has no ${name} in @theme`);
    return toPx(substitute(value, phone));
  };

  const radius: Record<string, number> = {};
  for (const r of RADII) radius[r] = length(`--radius-${r}`);
  const spacing: Record<string, number> = {};
  for (const s of SPACING) spacing[s] = length(`--spacing-${s}`);

  return { light: colors(themes.light), dark: colors(themes.dark), text, radius, spacing, touchMinimum: TOUCH_MINIMUM };
}

/** `card-foreground` → `cardForeground`, `chart-1` → `chart1`, `row-y` → `rowY`. */
export const camel = (name: string) => name.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());

const HEADER = "Generated by `bun run tokens:native` from Avenue's src/styles/tokens.css and avenue.css. Don't edit by hand.";
const num = (n: number) => `${n}`;

export function renderSwift(t: NativeTokens): string {
  const roles = Object.keys(t.light).map(camel);
  const hex = (h: string) => `0x${h.slice(1).toUpperCase()}`;
  const colors = (theme: Record<string, string>) =>
    Object.entries(theme)
      .map(([name, value]) => `        ${camel(name)}: ${hex(value)}`)
      .join(",\n");
  return `// ${HEADER}
// Colours are sRGB hex (0xRRGGBB) for light and dark; sizes are points. Use \`Color.avenue(\\.primary)\` in SwiftUI.

import Foundation

public enum AvenueTokens {
    /// One theme's colour roles, named as on the web (\`card-foreground\` is \`cardForeground\`).
    public struct Colors: Sendable, Equatable {
${roles.map((r) => `        public let ${r}: UInt32`).join("\n")}
    }

    public static let light = Colors(
${colors(t.light)}
    )

    public static let dark = Colors(
${colors(t.dark)}
    )

    /// A type step: font size and line height, in points.
    public struct TextStep: Sendable, Equatable {
        public let size: Double
        public let lineHeight: Double
    }

    public enum TypeScale {
${Object.entries(t.text)
  .map(([k, v]) => `        public static let ${camel(k)} = TextStep(size: ${num(v.size)}, lineHeight: ${num(v.lineHeight)})`)
  .join("\n")}
    }

    /// Corner radii, in points. Pills use a capsule.
    public enum Radius {
${Object.entries(t.radius)
  .map(([k, v]) => `        public static let ${camel(k)}: Double = ${num(v)}`)
  .join("\n")}
    }

    /// Spacing and control heights, in points, at phone values.
    public enum Spacing {
${Object.entries(t.spacing)
  .map(([k, v]) => `        public static let ${camel(k)}: Double = ${num(v)}`)
  .join("\n")}
    }

    /// The smallest tap target, in points.
    public static let touchMinimum: Double = ${num(t.touchMinimum)}
}

#if canImport(SwiftUI) && canImport(UIKit)
import SwiftUI
import UIKit

public extension Color {
    /// An Avenue colour role that follows light and dark mode.
    static func avenue(_ role: KeyPath<AvenueTokens.Colors, UInt32>) -> Color {
        Color(uiColor: UIColor { traits in
            let hex = traits.userInterfaceStyle == .dark ? AvenueTokens.dark[keyPath: role] : AvenueTokens.light[keyPath: role]
            return UIColor(
                red: CGFloat((hex >> 16) & 0xFF) / 255,
                green: CGFloat((hex >> 8) & 0xFF) / 255,
                blue: CGFloat(hex & 0xFF) / 255,
                alpha: 1)
        })
    }
}
#endif
`;
}

export function renderKotlin(t: NativeTokens): string {
  const roles = Object.keys(t.light).map(camel);
  const hex = (h: string) => `Color(0xFF${h.slice(1).toUpperCase()})`;
  const colors = (theme: Record<string, string>) =>
    Object.entries(theme)
      .map(([name, value]) => `        ${camel(name)} = ${hex(value)},`)
      .join("\n");
  const dp = (n: number) => `${num(n)}.dp`;
  const sp = (n: number) => `${num(n)}.sp`;
  return `// ${HEADER}
// Colours are sRGB for light and dark; sizes are dp, text sizes sp. Pick a theme with \`if (isSystemInDarkTheme()) AvenueTokens.Dark else AvenueTokens.Light\`.

package com.manyave.avenue

import androidx.compose.runtime.Immutable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/** One theme's colour roles, named as on the web (\`card-foreground\` is \`cardForeground\`). */
@Immutable
data class AvenueColors(
${roles.map((r) => `    val ${r}: Color,`).join("\n")}
)

/** A type step: font size and line height. */
@Immutable
data class AvenueTextStep(val size: TextUnit, val lineHeight: TextUnit)

object AvenueTokens {
    val Light = AvenueColors(
${colors(t.light)}
    )

    val Dark = AvenueColors(
${colors(t.dark)}
    )

    object TypeScale {
${Object.entries(t.text)
  .map(([k, v]) => `        val ${camel(k)} = AvenueTextStep(${sp(v.size)}, ${sp(v.lineHeight)})`)
  .join("\n")}
    }

    /** Corner radii. Pills use a fully rounded shape. */
    object Radius {
${Object.entries(t.radius)
  .map(([k, v]) => `        val ${camel(k)}: Dp = ${dp(v)}`)
  .join("\n")}
    }

    /** Spacing and control heights, at phone values. */
    object Spacing {
${Object.entries(t.spacing)
  .map(([k, v]) => `        val ${camel(k)}: Dp = ${dp(v)}`)
  .join("\n")}
    }

    /** The smallest tap target. */
    val TouchMinimum: Dp = ${dp(t.touchMinimum)}
}
`;
}

export function renderJson(t: NativeTokens): string {
  return `${JSON.stringify(
    {
      $comment: `${HEADER} Colours are sRGB hex; sizes are CSS px at 1rem = 16px (points on iOS, dp or sp on Android).`,
      ...t,
    },
    null,
    2,
  )}\n`;
}

export async function renderAll(): Promise<Record<keyof typeof OUTPUTS, string>> {
  const tokens = buildTokens(
    await Bun.file(resolve(root, "src/styles/tokens.css")).text(),
    await Bun.file(resolve(root, "src/styles/avenue.css")).text(),
  );
  return { swift: renderSwift(tokens), kotlin: renderKotlin(tokens), json: renderJson(tokens) };
}

/** The generated files that differ from what's on disk. */
export async function staleOutputs(): Promise<string[]> {
  const rendered = await renderAll();
  const stale: string[] = [];
  for (const [key, path] of Object.entries(OUTPUTS)) {
    const file = Bun.file(resolve(root, path));
    if (!(await file.exists()) || (await file.text()) !== rendered[key as keyof typeof OUTPUTS]) stale.push(path);
  }
  return stale;
}

if (import.meta.main) {
  if (process.argv.includes("--check")) {
    const stale = await staleOutputs();
    if (stale.length > 0) {
      console.error(`Out of date: ${stale.join(", ")}. Run \`bun run tokens:native\`.`);
      process.exit(1);
    }
    console.log("Native tokens are up to date.");
  } else {
    const rendered = await renderAll();
    for (const [key, path] of Object.entries(OUTPUTS)) {
      await Bun.write(resolve(root, path), rendered[key as keyof typeof OUTPUTS]);
      console.log(`Wrote ${path}`);
    }
  }
}
