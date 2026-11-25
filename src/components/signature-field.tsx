import { mergeProps, renderElement } from "@ui-sdk/react/primitive";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Button } from "#avenue/components/button";
import { Input } from "#avenue/components/input";
import { ToggleGroup, ToggleGroupItem } from "#avenue/components/toggle-group";
import { report, type ChangeDetails } from "#avenue/lib/change";
import { defined, type Loose, type OwnPartProps } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

/**
 * AVE-220. A signature, drawn with a finger, pen or mouse, or typed. Management's vendor signing page uses it for a
 * work agreement and a W-9, and a board admin countersigns with it.
 *
 *   SignatureField          the value (`value` / `defaultValue` / `onValueChange`) and the mode, Draw or Type
 *   ├── SignatureFieldModes  Draw and Type, one segmented control
 *   ├── SignatureFieldPad    the drawing area, shown in Draw
 *   ├── SignatureFieldInput  the typed name and its preview, shown in Type
 *   └── SignatureFieldClear  empties the signature
 *
 * The value is `null` while empty, otherwise `{ method, image, text? }`: `image` is a PNG data URL in black ink on a
 * transparent ground, whatever the theme, so a signed PDF reads the same everywhere. `text` is the typed name.
 *
 * Type is the keyboard and screen-reader path: the pad is a picture of the strokes, read as its label and "empty" or
 * "drawn", not a control, and
 * Type makes the same value from a name. Draw is the default on a touch screen, Type with a mouse; `defaultMode`
 * overrides it. Hand-rolled pointer drawing: ui-sdk 0.1 has no signature or drawing primitive.
 *
 * Put it in a Field: FieldLabel names the whole signature, and `invalid` / `disabled` here reach every part.
 */

export type SignatureMethod = "drawn" | "typed";
export type SignatureValue = { method: SignatureMethod; image: string; text?: string | undefined };
export type SignatureMode = "draw" | "type";
export type SignatureChangeReason = "stroke" | "typed" | "clear" | "mode";
export type SignatureChangeDetails = ChangeDetails<SignatureChangeReason>;
export type SignatureModeChangeDetails = ChangeDetails<"mode">;

/** A point as a fraction of the pad's width and height, so strokes keep their place when the pad resizes. */
type Point = { x: number; y: number };
type Stroke = Point[];

type SignatureContextValue = {
  mode: SignatureMode;
  setMode: (mode: SignatureMode) => void;
  value: SignatureValue | null;
  /** False when `onValueChange` cancelled the change; the caller then leaves what the field shows alone. */
  setValue: (value: SignatureValue | null, reason: SignatureChangeReason) => boolean;
  strokes: Stroke[];
  setStrokes: (strokes: Stroke[]) => void;
  text: string;
  setText: (text: string) => void;
  disabled: boolean;
  invalid: boolean;
};

const SignatureContext = createContext<SignatureContextValue | null>(null);

function useSignature(part: string) {
  const context = useContext(SignatureContext);
  if (!context) throw new Error(`Avenue: ${part} must be inside a SignatureField.`);
  return context;
}

/** The face a typed signature is drawn in: the system's script face, falling back to an italic serif. */
const SCRIPT_FACE = '"Segoe Script", "Snell Roundhand", "Brush Script MT", "Apple Chancery", cursive';
/** The exported image's size, in CSS pixels, drawn at 2x. Wide enough for a long name at a legible size. */
const EXPORT_WIDTH = 600;
const EXPORT_HEIGHT = 200;
/** Ink for the exported image: black on transparent, so a printed or PDF page reads it in any theme. */
const EXPORT_INK = "#000";

function exportCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_WIDTH * 2;
  canvas.height = EXPORT_HEIGHT * 2;
  const context = canvas.getContext("2d");
  context?.scale(2, 2);
  return { canvas, context };
}

/** The strokes, at the pad's shape scaled into the export's, as a PNG data URL. */
function strokesToImage(strokes: Stroke[], width: number, height: number) {
  const { canvas, context } = exportCanvas();
  if (!context || width === 0 || height === 0) return "";
  const scale = Math.min(EXPORT_WIDTH / width, EXPORT_HEIGHT / height);
  context.strokeStyle = EXPORT_INK;
  context.lineWidth = 2.5 * scale;
  context.lineCap = "round";
  context.lineJoin = "round";
  for (const stroke of strokes) traceStroke(context, stroke, width * scale, height * scale);
  return canvas.toDataURL("image/png");
}

/** A typed name in the script face, as a PNG data URL. */
function textToImage(text: string) {
  const { canvas, context } = exportCanvas();
  if (!context) return "";
  let size = 64;
  context.font = `${size}px ${SCRIPT_FACE}`;
  while (size > 20 && context.measureText(text).width > EXPORT_WIDTH - 40) {
    size -= 4;
    context.font = `${size}px ${SCRIPT_FACE}`;
  }
  context.fillStyle = EXPORT_INK;
  context.textBaseline = "middle";
  context.fillText(text, 20, EXPORT_HEIGHT / 2);
  return canvas.toDataURL("image/png");
}

/** Draws one stroke onto a `width` by `height` area. */
function traceStroke(context: CanvasRenderingContext2D, stroke: Stroke, width: number, height: number) {
  const [first, ...rest] = stroke;
  if (!first) return;
  context.beginPath();
  context.moveTo(first.x * width, first.y * height);
  // A single tap is a dot: a zero-length line with round caps.
  if (rest.length === 0) context.lineTo(first.x * width + 0.01, first.y * height);
  for (const point of rest) context.lineTo(point.x * width, point.y * height);
  context.stroke();
}

function prefersTouch() {
  return typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches === true;
}

type SignatureFieldProps = Omit<OwnPartProps<"div">, "defaultValue" | "onChange"> & {
  value?: SignatureValue | null | undefined;
  defaultValue?: SignatureValue | null | undefined;
  onValueChange?: ((value: SignatureValue | null, details: SignatureChangeDetails) => void) | undefined;
  mode?: SignatureMode | undefined;
  defaultMode?: SignatureMode | undefined;
  onModeChange?: ((mode: SignatureMode, details: SignatureModeChangeDetails) => void) | undefined;
  disabled?: boolean | undefined;
  invalid?: boolean | undefined;
};

function SignatureField({
  className,
  render,
  value: valueProp,
  defaultValue = null,
  onValueChange,
  mode: modeProp,
  defaultMode,
  onModeChange,
  disabled = false,
  invalid = false,
  ...props
}: SignatureFieldProps) {
  const [ownValue, setOwnValue] = useState<SignatureValue | null>(defaultValue);
  const [ownMode, setOwnMode] = useState<SignatureMode>(() => defaultMode ?? (prefersTouch() ? "draw" : "type"));
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const value = valueProp === undefined ? ownValue : valueProp;
  const [text, setText] = useState(value?.text ?? "");
  const mode = modeProp ?? ownMode;

  // A value set from outside (a reset, a saved signature) wins over what the pad or input holds: null empties both,
  // and a typed value shows its name. A drawn value from outside has no strokes; the pad shows its image instead.
  // `local` is the last value this field produced itself: when the parent echoes it back, the strokes that made it stay.
  // Any other drawn value (a saved signature) replaces them, so the pad shows its image and the next stroke starts clean.
  const [shown, setShown] = useState(value);
  const [local, setLocal] = useState<SignatureValue | null | undefined>(undefined);
  if (value !== shown) {
    setShown(value);
    if (value === null) {
      setStrokes([]);
      setText("");
    } else if (value.method === "typed" && value.text !== undefined && value.text !== text.trim()) {
      setText(value.text);
    } else if (value.method === "drawn") {
      setText("");
      if (value !== local) setStrokes([]);
    }
  }

  const setValue = useCallback(
    (next: SignatureValue | null, reason: SignatureChangeReason) => {
      if (!report(onValueChange, next, { reason })) return false;
      setLocal(next);
      if (valueProp === undefined) setOwnValue(next);
      return true;
    },
    [valueProp, onValueChange],
  );
  const setMode = useCallback(
    (next: SignatureMode) => {
      // Switching mode starts again: a signature is one method, never half drawn and half typed. The reset is asked
      // first, so a cancelled reset keeps the signature, what the field shows of it, and the mode.
      if (value !== null && !setValue(null, "mode")) return;
      if (!report(onModeChange, next, { reason: "mode" })) return;
      if (modeProp === undefined) setOwnMode(next);
      setStrokes([]);
      setText("");
    },
    [modeProp, onModeChange, setValue, value],
  );

  return (
    <SignatureContext.Provider
      value={{ mode, setMode, value, setValue, strokes, setStrokes, text, setText, disabled, invalid }}
    >
      {renderElement(
        "div",
        mergeProps(
          {
            "data-slot": "signature-field",
            "data-mode": mode,
            "data-empty": value === null ? "" : undefined,
            "data-disabled": disabled ? "" : undefined,
            "data-invalid": invalid ? "" : undefined,
            className: cn("flex flex-col gap-2", className),
          },
          defined(props),
        ),
        render,
      )}
    </SignatureContext.Provider>
  );
}

type SignatureFieldModesProps = {
  className?: string | undefined;
  /** The two items' labels, for a page in another language. */
  drawLabel?: string | undefined;
  typeLabel?: string | undefined;
  "aria-label"?: string | undefined;
};

/** Draw and Type. Switching clears what was there, so a signature is always one method. */
function SignatureFieldModes({
  className,
  drawLabel = "Draw",
  typeLabel = "Type",
  "aria-label": label = "How to sign",
}: SignatureFieldModesProps) {
  const { mode, setMode, disabled } = useSignature("SignatureFieldModes");
  return (
    <ToggleGroup
      spacing={0}
      size="sm"
      variant="outline"
      aria-label={label}
      value={mode}
      disabled={disabled}
      onValueChange={(next: string | null) => {
        if (next === "draw" || next === "type") setMode(next);
      }}
      className={className}
    >
      <ToggleGroupItem value="draw">{drawLabel}</ToggleGroupItem>
      <ToggleGroupItem value="type">{typeLabel}</ToggleGroupItem>
    </ToggleGroup>
  );
}

type SignatureFieldPadProps = Omit<OwnPartProps<"div">, "children"> & {
  /** What the drawing shows, for a screen reader: "Your signature". Required, because the pad is a picture. */
  label: string;
  /** The muted line under the baseline, such as "Sign above the line". */
  hint?: string | undefined;
};

/** The drawing area. Draws in the page's ink colour; the exported image is black (see SignatureField). */
function SignatureFieldPad(props: SignatureFieldPadProps) {
  const { mode } = useSignature("SignatureFieldPad");
  // Mounted only in Draw, so the canvas measures itself once it exists.
  return mode === "draw" ? <Pad {...props} /> : null;
}

function Pad({ className, render, label, hint = "Sign above the line", ...props }: SignatureFieldPadProps) {
  const { value, strokes, setStrokes, setValue, disabled, invalid } = useSignature("SignatureFieldPad");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** The stroke being drawn, and the one pointer drawing it: a second finger is ignored until the first lifts. */
  const drawing = useRef<{ pointerId: number; stroke: Stroke } | null>(null);
  // A drawn value with no strokes came from outside (a saved signature): the pad shows its image until a new stroke.
  const restored = strokes.length === 0 && value?.method === "drawn" ? value.image : undefined;
  const [size, setSize] = useState({ width: 0, height: 0 });

  // Keep the canvas's pixels matched to its drawn size and the screen's density, and redraw on resize.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const measure = () => {
      const box = canvas.getBoundingClientRect();
      setSize({ width: box.width, height: box.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  const paint = useCallback(
    (list: Stroke[]) => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!canvas || !context) return;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(size.width * ratio);
      canvas.height = Math.round(size.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, size.width, size.height);
      context.strokeStyle = getComputedStyle(canvas).color;
      context.lineWidth = 2.5;
      context.lineCap = "round";
      context.lineJoin = "round";
      for (const stroke of list) traceStroke(context, stroke, size.width, size.height);
    },
    [size],
  );

  useEffect(() => paint(strokes), [paint, strokes]);

  const pointAt = (event: ReactPointerEvent<HTMLCanvasElement>): Point => {
    const box = event.currentTarget.getBoundingClientRect();
    return {
      x: box.width ? (event.clientX - box.left) / box.width : 0,
      y: box.height ? (event.clientY - box.top) / box.height : 0,
    };
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (disabled || drawing.current || (event.pointerType === "mouse" && event.button !== 0)) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // A pointer the browser no longer tracks can't be captured; the stroke still draws.
    }
    drawing.current = { pointerId: event.pointerId, stroke: [pointAt(event)] };
    paint([...strokes, drawing.current.stroke]);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (drawing.current?.pointerId !== event.pointerId) return;
    drawing.current.stroke.push(pointAt(event));
    paint([...strokes, drawing.current.stroke]);
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (drawing.current?.pointerId !== event.pointerId) return;
    const { stroke } = drawing.current;
    drawing.current = null;
    const next = [...strokes, stroke];
    // Cancelled by onValueChange: the stroke goes, and the pad shows what the value still is.
    if (setValue({ method: "drawn", image: strokesToImage(next, size.width, size.height) }, "stroke")) setStrokes(next);
    else paint(strokes);
  };

  return renderElement(
    "div",
    mergeProps(
      {
        "data-slot": "signature-field-pad",
        "data-invalid": invalid ? "" : undefined,
        "data-disabled": disabled ? "" : undefined,
        className: cn(
          "relative h-32 rounded-lg border border-input bg-background data-invalid:border-destructive data-disabled:opacity-50",
          className,
        ),
        children: (
        <>
          <span className="sr-only">{strokes.length === 0 ? `${label}, empty` : `${label}, drawn`}</span>
          {restored && (
            // The saved signature is black ink on transparent; dark:invert draws it in the page's ink.
            <img alt="" src={restored} className="pointer-events-none absolute inset-0 size-full object-contain dark:invert" />
          )}
          <canvas
            ref={canvasRef}
            aria-hidden
            data-slot="signature-field-canvas"
            className="absolute inset-0 size-full touch-none text-foreground"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
          <div aria-hidden className="pointer-events-none absolute inset-x-4 bottom-8 border-t border-border" />
          <div aria-hidden className="pointer-events-none absolute bottom-2 left-4 text-meta text-muted-foreground">
            {hint}
          </div>
        </>
      ),
      },
      defined(props),
    ),
    render,
  );
}

type SignatureFieldInputProps = Omit<
  Loose<ComponentProps<typeof Input>>,
  "value" | "defaultValue" | "onValueChange" | "type" | "children"
> & {
  /** The preview's label for a screen reader is the typed name itself; this names the input when no Field does. */
  "aria-label"?: string | undefined;
};

/** The typed name, and a preview of it in a script face, as it will appear on the signed page. */
function SignatureFieldInput({ className, ...props }: SignatureFieldInputProps) {
  const { mode, text, setText, setValue, disabled, invalid } = useSignature("SignatureFieldInput");
  if (mode !== "type") return null;
  return (
    <div data-slot="signature-field-typed" className="flex flex-col gap-2">
      <Input
        autoComplete="name"
        value={text}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        onValueChange={(next: string) => {
          const trimmed = next.trim();
          const accepted = setValue(
            trimmed === "" ? null : { method: "typed", text: trimmed, image: textToImage(trimmed) },
            "typed",
          );
          if (accepted) setText(next);
        }}
        className={className}
        {...defined(props)}
      />
      <div
        aria-hidden
        data-slot="signature-field-preview"
        className="flex h-20 items-center truncate rounded-lg border border-dashed border-border px-4 text-foreground"
        // The script face is the signature's own look, not a type role: a literal, like the export (SCRIPT_FACE).
        style={{ fontFamily: SCRIPT_FACE, fontSize: "2rem" }}
      >
        {text.trim()}
      </div>
    </div>
  );
}

/** Empties the signature in either mode. Disabled while there is nothing to clear. */
function SignatureFieldClear({ children = "Clear", ...props }: Loose<ComponentProps<typeof Button>>) {
  const { value, setValue, setStrokes, setText, disabled } = useSignature("SignatureFieldClear");
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={disabled || value === null}
      onClick={() => {
        if (!setValue(null, "clear")) return;
        setStrokes([]);
        setText("");
      }}
      {...defined(props)}
    >
      {children}
    </Button>
  );
}

export { SignatureField, SignatureFieldClear, SignatureFieldInput, SignatureFieldModes, SignatureFieldPad };
