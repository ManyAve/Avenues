import { useEffect, useRef, useState, type ReactNode } from "react";

// Measures contrast the way a resident sees it (AVE-25, AVE-38). Story-only: nothing here is exported from the
// package. Colours are read from the rendered element, not from the token file, and painted on a canvas so the
// browser does the OKLCH-to-sRGB conversion and see-through fills (dark mode's bg-input/30) are composited over the
// page exactly as on screen.

export type Rgb = readonly [number, number, number];

/** Paints the colours over white, in order, and returns the pixel. */
export function paint(layers: readonly string[]): Rgb {
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
export function backdrop(element: Element): string[] {
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

/** WCAG contrast ratio between two colours. */
export function ratio(a: Rgb, b: Rgb): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

export const round = (n: number) => Math.round(n * 10) / 10;

/**
 * WCAG 1.4.11's minimum for the boundary that identifies a control: an unchecked checkbox, radio or switch is found
 * only by its outline (AVE-38).
 */
export const BOUNDARY_MIN_CONTRAST = 3;

/**
 * Contrast of a control's outline against what sits behind the control, rounded to one decimal. The outline is the
 * top border colour, painted over the control's surroundings; a control whose border is missing or transparent
 * measures its fill instead.
 */
export function measureBoundaryContrast(control: HTMLElement): number {
  const behind = control.parentElement ? backdrop(control.parentElement) : [];
  const outside = paint(behind);
  const style = getComputedStyle(control);
  const border = style.borderTopColor;
  const transparent = paint(["#000000", border]).every((c) => c === 0) && paint([border]).every((c) => c === 255);
  const invisible = Number.parseFloat(style.borderTopWidth) === 0 || transparent;
  const edge = invisible ? style.backgroundColor : border;
  return round(ratio(paint([...behind, edge]), outside));
}

/** One labelled place to measure: the page background or a card. */
export type BoundarySample = { where: string; name: string };

/**
 * Shows, under its children, the outline contrast of each named control in the current theme, so the numbers are on
 * the story itself (light and dark come from the theme switch and the story-test projects).
 */
export function BoundaryReadout({ samples, children }: { samples: readonly BoundarySample[]; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<string | null>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const parts = samples.map(({ where, name }) => {
      const control = root.querySelector<HTMLElement>(`[aria-label="${name}"]`);
      return `${where} ${control ? measureBoundaryContrast(control) : "?"}:1`;
    });
    setMeasured(parts.join(", "));
  }, [samples]);
  return (
    <div ref={ref} className="flex flex-col gap-group">
      {children}
      <p className="px-inset text-meta text-muted-foreground" data-testid="contrast-readout">
        {measured ? `Unchecked outline measured here: ${measured}. WCAG 1.4.11 asks for 3:1.` : "Measuring…"}
      </p>
    </div>
  );
}
