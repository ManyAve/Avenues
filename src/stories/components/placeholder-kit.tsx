import { useEffect, useRef, useState, type ReactNode } from "react";
import { backdrop, paint, ratio, round } from "./contrast-kit";

// Measures placeholder contrast the way a resident sees it (AVE-25), with the painting and ratio helpers in
// contrast-kit. Story-only: nothing here is exported from the package.

export type FieldContrast = { typed: number; placeholder: number };

/** Contrast of typed text and of the placeholder against the field as rendered, rounded to one decimal. */
export function measureFieldContrast(field: HTMLInputElement | HTMLTextAreaElement): FieldContrast {
  const behind = backdrop(field);
  const background = paint(behind);
  const typed = paint([...behind, getComputedStyle(field).color]);
  const placeholder = paint([...behind, getComputedStyle(field, "::placeholder").color]);
  return { typed: round(ratio(typed, background)), placeholder: round(ratio(placeholder, background)) };
}

/**
 * The rule's thresholds. "At least 4.5:1" is WCAG's AA minimum for text. "Visibly lighter" is held to a number so a
 * test can fail it: the placeholder has at most 70% of typed text's contrast. Light has about half (0.47), dark 0.42
 * since AVE-186's placeholder token (0.58 before, when it was muted-foreground).
 */
export const PLACEHOLDER_MIN_CONTRAST = 4.5;
export const PLACEHOLDER_MAX_SHARE_OF_TYPED = 0.7;

/** Shows the contrast measured from the field inside it, in the current theme. */
export function ContrastReadout({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<FieldContrast | null>(null);
  useEffect(() => {
    const field = ref.current?.querySelector<HTMLInputElement | HTMLTextAreaElement>("input, textarea");
    if (field) setMeasured(measureFieldContrast(field));
  }, []);
  return (
    <div ref={ref} className="flex flex-col gap-group">
      {children}
      <p className="text-meta text-muted-foreground" data-testid="contrast-readout">
        {measured
          ? `Measured here: typed text ${measured.typed}:1, placeholder ${measured.placeholder}:1 against the field.`
          : "Measuring…"}
      </p>
    </div>
  );
}
