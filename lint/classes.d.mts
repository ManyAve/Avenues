/**
 * Types for `@manyave/avenue/oxlint` (./classes.mjs), so an app's `oxlint.config.ts` imports it typed (AVE-181).
 * Keep in step with ./classes.mjs; Avenue's own oxlint.config.ts imports it through this file.
 */
import type { OxlintConfig } from "oxlint";

/** A class pattern `tailwindcss/no-restricted-classes` rejects, tested against one whole class, variants included. */
export interface RestrictedClassPattern {
  pattern: string;
  message: string;
}

/** Off-grid spacing and literal breakpoints, each with its fix in the message. */
export declare const gridClassPatterns: RestrictedClassPattern[];

/** Raw type sizes, weights, Tailwind's shadows, page layers and durations, each with its fix (AVE-184). */
export declare const scaleClassPatterns: RestrictedClassPattern[];

/** Every pattern Avenue's class rules reject: `gridClassPatterns` then `scaleClassPatterns`. */
export declare const restrictedClassPatterns: RestrictedClassPattern[];

/** Avenue's class rules: oxlint-tailwindcss plus Avenue's hit-area rule, for an app's `extends`. */
export declare function avenueClasses(): OxlintConfig;

export default avenueClasses;
