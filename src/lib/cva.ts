import { defineConfig } from "cva/config";
import { cn } from "#avenue/lib/utils";

/**
 * Avenue's one cva config (AVE-170, cva 1.0). Every variant helper (buttonVariants, toggleVariants, controlShape …)
 * runs its classes through Avenue's `cn`, so a `className` passed to a helper replaces the classes it conflicts with,
 * and a component no longer wraps its helper in `cn()` by hand. Import `cva` from here, never from the `cva` package.
 */
export const { cva, cx } = defineConfig({ cx: cn });

export type { VariantProps } from "cva";
