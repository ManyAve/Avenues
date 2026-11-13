import { useEffect, useRef, useState, type ReactNode } from "react";

// Measures placeholder contrast the way a resident sees it (AVE-25). Story-only: nothing here is exported from the
// package. The colours are read from the rendered field, not from the token file, and painted on a canvas so the
// browser does the OKLCH-to-sRGB conversion and the see-through field fills (dark mode's bg-input/30) are composited
// over the page exactly as on screen.

type Rgb = readonly [number, number, number];

function paint(layers: readonly string[]): Rgb {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No 2D canvas to measure contrast with");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, 1, 1);
  for (const layer of layers) {
    context.fillStyle = layer;
    context.fillRect(0, 0, 1, 1);
  }
  const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

/** The background colours behind an element, page first, stopping at the first opaque one. */
function backdrop(element: Element): string[] {
  const layers: string[] = [];
  for (let node: Element | null = element; node; node = node.parentElement) {
    const colour = getComputedStyle(node).backgroundColor;
    layers.unshift(colour);
    if (paint([colour]).join() === paint(["#000000", colour]).join()) break;
  }
  return layers;
}

function luminance([r, g, b]: Rgb): number {
  const [lr, lg, lb] = [r, g, b].map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function ratio(a: Rgb, b: Rgb): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

export type FieldContrast = { typed: number; placeholder: number };

/** Contrast of typed text and of the placeholder against the field as rendered, rounded to one decimal. */
export function measureFieldContrast(field: HTMLInputElement | HTMLTextAreaElement): FieldContrast {
  const behind = backdrop(field);
  const background = paint(behind);
  const typed = paint([...behind, getComputedStyle(field).color]);
  const placeholder = paint([...behind, getComputedStyle(field, "::placeholder").color]);
  const round = (n: number) => Math.round(n * 10) / 10;
  return { typed: round(ratio(typed, background)), placeholder: round(ratio(placeholder, background)) };
}

/**
 * The rule's thresholds. "At least 4.5:1" is WCAG's AA minimum for text. "Visibly lighter" is held to a number so a
 * test can fail it: the placeholder has at most 70% of typed text's contrast. Today it has about half (0.47 light,
 * 0.58 dark).
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
