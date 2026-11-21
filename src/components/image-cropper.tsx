import { announce } from "@ui-sdk/core";
import { cropImage, type CropImageOptions, type ImageCrop } from "@ui-sdk/react/image";
import {
  createImageCropperController,
  ImageCropper as ImageCropperPrimitive,
  ImageCropperFlip as ImageCropperFlipPrimitive,
  ImageCropperGrid as ImageCropperGridPrimitive,
  ImageCropperHandle as ImageCropperHandlePrimitive,
  ImageCropperImage as ImageCropperImagePrimitive,
  ImageCropperRotate as ImageCropperRotatePrimitive,
  ImageCropperSelection as ImageCropperSelectionPrimitive,
  ImageCropperViewport as ImageCropperViewportPrimitive,
  ImageCropperZoom as ImageCropperZoomPrimitive,
  type ImageCropperController,
} from "@ui-sdk/react/image-cropper";
import { withSource } from "@ui-sdk/react/observe";
import { FlipHorizontal2Icon, RotateCwIcon } from "lucide-react";
import { createContext, useContext, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { Button, buttonVariants, type ButtonProps } from "#avenue/components/button";
import { devError } from "#avenue/lib/dev";
import { defined, type Loose, type NodeChildren } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

/**
 * AVE-206. Frame a photo before saving it: a profile photo in a round frame, a logo or a home page photo in a square
 * one. ui-sdk's ImageCropper does the behavior (drag or arrows to pan, wheel, pinch or plus and minus to zoom) and
 * `cropImage` writes the file; Avenue draws it and adds the step's rules (UX Engineer verdict on the card):
 *
 * - Cropping is optional: ImageCropperUseOriginal ("Use photo as is") is always offered beside ImageCropperSave, and the
 *   crop starts centred.
 * - Each keyboard change is announced politely ("Zoom 150%", "Moved left"), since the selection's own value says the
 *   crop in pixels.
 * - The frame is named after the cropper and its shape ("Profile photo, round frame"); the image keeps its own `alt`.
 *
 *   ImageCropper
 *   ├── ImageCropperViewport
 *   │   ├── ImageCropperImage
 *   │   ├── ImageCropperSelection
 *   │   │   └── ImageCropperGrid
 *   │   └── ImageCropperHandle (box mode only)
 *   ├── ImageCropperZoom
 *   ├── ImageCropperRotate
 *   ├── ImageCropperFlip
 *   ├── ImageCropperUseOriginal
 *   └── ImageCropperSave
 *
 * Unlike ui-sdk, the root defaults to `mode="frame"` and `aspectRatio={1}`, the avatar and logo editor both apps need.
 */

type PrimitiveProps = Loose<ComponentProps<typeof ImageCropperPrimitive>>;

export interface ImageCropperProps extends Omit<PrimitiveProps, "children"> {
  /** The cropped file, from ImageCropperSave. Return a Promise to keep Save pending while it uploads. */
  onCrop?: ((file: File, crop: Required<ImageCrop>) => unknown) | undefined;
  /** "Use photo as is": the person keeps the whole photo. */
  onUseOriginal?: (() => unknown) | undefined;
  children?: PrimitiveProps["children"];
}

type ImageCropperState = {
  src: string | undefined;
  controller: ImageCropperController;
  shape: "rectangle" | "circle";
  /** The frame's name, for the selection: "Profile photo, round frame". Undefined without an aria-label. */
  frameLabel: string | undefined;
  onCrop: ImageCropperProps["onCrop"];
  onUseOriginal: ImageCropperProps["onUseOriginal"];
};

const ImageCropperContext = createContext<ImageCropperState | null>(null);

function useImageCropper(part: string): ImageCropperState | null {
  const state = useContext(ImageCropperContext);
  if (!state) devError(`${part} must be inside an ImageCropper.`);
  return state;
}

function frameName(label: string | undefined, shape: "rectangle" | "circle", aspectRatio: number | undefined) {
  if (!label) return undefined;
  if (shape === "circle") return `${label}, round frame`;
  return aspectRatio === 1 ? `${label}, square frame` : `${label}, frame`;
}

function direction(from: ImageCrop, to: ImageCrop) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? "right" : dx < 0 ? "left" : undefined;
  return dy > 0 ? "down" : "up";
}

/** What a keyboard or button change says, once it lands. Pointer changes and the zoom input (which says its own level) say nothing. */
function announcement(reason: string, from: ImageCrop | undefined, to: Required<ImageCrop>, zoom: number) {
  switch (reason) {
    case "zoom-key":
      return `Zoom ${Math.round(zoom * 100)}%`;
    case "step-key": {
      const way = from && direction(from, to);
      return way ? `Moved ${way}` : undefined;
    }
    case "rotate-key":
    case "rotate-press":
      return `Turned to ${to.rotation} degrees`;
    case "flip-press":
      return "Flipped";
    default:
      return undefined;
  }
}

function ImageCropper({
  mode = "frame",
  aspectRatio = 1,
  shape = "rectangle",
  controller: appController,
  onCropChange,
  onCropCommit,
  onCrop,
  onUseOriginal,
  className,
  ...props
}: ImageCropperProps) {
  const [ownController] = useState(createImageCropperController);
  const controller = appController ?? ownController;
  // The crop as it last landed, to say which way a key moved it.
  const landed = useRef<Required<ImageCrop> | undefined>(undefined);
  const state: ImageCropperState = {
    src: props.src,
    controller,
    shape,
    frameLabel: frameName(props["aria-label"], shape, aspectRatio),
    onCrop,
    onUseOriginal,
  };
  return (
    <ImageCropperContext.Provider value={state}>
      <ImageCropperPrimitive
        {...defined(props)}
        mode={mode}
        aspectRatio={aspectRatio}
        shape={shape}
        controller={controller}
        onCropChange={(crop, details) => {
          if (details.reason === "image-load") landed.current = crop;
          onCropChange?.(crop, details);
        }}
        onCropCommit={(crop, details) => {
          const message = announcement(details.reason, landed.current, crop, controller.getZoom());
          landed.current = crop;
          if (message) announce(message);
          onCropCommit?.(crop, details);
        }}
        className={cn("flex w-full max-w-md flex-col gap-3", className)}
      />
    </ImageCropperContext.Provider>
  );
}

/**
 * The area the photo shows in: muted, lg corner, square in a frame (with room round the frame so the dimmed photo
 * shows past it), or the photo's own shape in box mode.
 */
function ImageCropperViewport({ className, ...props }: Loose<ComponentProps<typeof ImageCropperViewportPrimitive>>) {
  return (
    <ImageCropperViewportPrimitive
      {...defined(props)}
      className={cn(
        "relative touch-none overflow-hidden rounded-lg bg-muted aspect-(--image-cropper-aspect-ratio) data-[mode=frame]:aspect-square data-[mode=frame]:p-6",
        className,
      )}
    />
  );
}

/** The photo. Give it the photo's own `alt`: it's kept, not replaced by the frame's name. */
function ImageCropperImage({ className, ...props }: Loose<ComponentProps<typeof ImageCropperImagePrimitive>>) {
  if (props.alt === undefined) devError("ImageCropperImage needs the photo's alt text.");
  return <ImageCropperImagePrimitive {...defined(props)} className={cn("block size-full object-contain", className)} />;
}

/**
 * The frame over the photo. A slider: Tab to it, arrows pan (Shift for ten times as far), plus and minus zoom. Named
 * after the cropper and its shape unless given an aria-label.
 */
function ImageCropperSelection({ className, ...props }: Loose<ComponentProps<typeof ImageCropperSelectionPrimitive>>) {
  const state = useImageCropper("ImageCropperSelection");
  return (
    <ImageCropperSelectionPrimitive
      {...(state?.frameLabel ? { "aria-label": state.frameLabel } : {})}
      {...defined(props)}
      className={cn(
        // The frame is drawn by ::before, so a round frame still takes a press in its corners, as its box does.
        // The dim round the frame and its white edge stay the same in both themes: they sit on the photo, not the page.
        // One use each, so commented literals, not tokens (docs/tokens.md).
        "outline-none before:pointer-events-none before:absolute before:inset-0 before:outline before:outline-white data-[shape=circle]:before:rounded-full focus-visible:before:outline-3 focus-visible:before:outline-ring data-disabled:opacity-50",
        // oxlint-disable-next-line tailwindcss/no-hardcoded-colors -- the photo's dim, the same in both themes.
        "before:shadow-[0_0_0_100vmax_rgb(0_0_0/0.5)]",
        className,
      )}
    />
  );
}

/** Lines across the frame in thirds, shown only while a pointer drags. */
function ImageCropperGrid({ className, ...props }: Loose<ComponentProps<typeof ImageCropperGridPrimitive>>) {
  return (
    <ImageCropperGridPrimitive
      {...defined(props)}
      className={cn(
        // The lines sit on the photo, so they're white in both themes, as the frame's edge is.
        // oxlint-disable-next-line tailwindcss/no-hardcoded-colors -- one use: the thirds' lines over the photo.
        "pointer-events-none absolute inset-0 data-[shape=circle]:rounded-full opacity-0 transition-opacity duration-fast data-dragging:opacity-100 motion-reduce:transition-none [background:linear-gradient(to_right,transparent_calc(100%/3-0.5px),rgb(255_255_255/0.6)_calc(100%/3-0.5px),rgb(255_255_255/0.6)_calc(100%/3+0.5px),transparent_calc(100%/3+0.5px),transparent_calc(200%/3-0.5px),rgb(255_255_255/0.6)_calc(200%/3-0.5px),rgb(255_255_255/0.6)_calc(200%/3+0.5px),transparent_calc(200%/3+0.5px)),linear-gradient(to_bottom,transparent_calc(100%/3-0.5px),rgb(255_255_255/0.6)_calc(100%/3-0.5px),rgb(255_255_255/0.6)_calc(100%/3+0.5px),transparent_calc(100%/3+0.5px),transparent_calc(200%/3-0.5px),rgb(255_255_255/0.6)_calc(200%/3-0.5px),rgb(255_255_255/0.6)_calc(200%/3+0.5px),transparent_calc(200%/3+0.5px))]",
        className,
      )}
    />
  );
}

/** Resizes the selection from an edge or corner, in box mode: a 12px white square drawn in a 24px target on the edge. */
function ImageCropperHandle({ className, ...props }: Loose<ComponentProps<typeof ImageCropperHandlePrimitive>>) {
  return (
    <ImageCropperHandlePrimitive
      {...defined(props)}
      className={cn(
        "hit-area size-6 -translate-1/2 rounded-sm outline-none before:absolute before:top-1/2 before:left-1/2 before:size-3 before:-translate-1/2 before:rounded-xs before:border before:border-black/40 before:bg-white focus-visible:ring-3 focus-visible:ring-ring",
        className,
      )}
    />
  );
}

/** The zoom, a native range from the whole photo to `maxZoom`. It says its own level, like "150%". */
function ImageCropperZoom({ className, ...props }: Loose<ComponentProps<typeof ImageCropperZoomPrimitive>>) {
  return (
    <ImageCropperZoomPrimitive
      {...defined(props)}
      className={cn(
        // Drawn by Avenue, not the browser: Chromium's own track stays light in dark mode. An 8px fill track and a 16px
        // primary thumb, in both engines' pseudo-elements.
        "relative hit-area h-6 w-full cursor-pointer appearance-none bg-transparent outline-none pointer-coarse:h-11 disabled:cursor-not-allowed disabled:opacity-50",
        "[&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-fill",
        "[&::-webkit-slider-thumb]:-mt-1 [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-control",
        "[&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-fill",
        "[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:shadow-control",
        "focus-visible:[&::-webkit-slider-thumb]:ring-3 focus-visible:[&::-webkit-slider-thumb]:ring-ring/50 focus-visible:[&::-moz-range-thumb]:ring-3 focus-visible:[&::-moz-range-thumb]:ring-ring/50",
        className,
      )}
    />
  );
}

const toolButton = buttonVariants({ variant: "outline", size: "sm" });

/** Turns the photo a quarter clockwise ("Rotate"); R does it from the frame. */
function ImageCropperRotate({
  className,
  children,
  ...props
}: NodeChildren<Loose<ComponentProps<typeof ImageCropperRotatePrimitive>>>) {
  return (
    <ImageCropperRotatePrimitive {...defined(props)} className={cn(toolButton, className)}>
      {children ?? (
        <>
          <RotateCwIcon aria-hidden />
          Rotate
        </>
      )}
    </ImageCropperRotatePrimitive>
  );
}

/** Mirrors the photo ("Flip"), left to right, or top to bottom with `direction="vertical"`. */
function ImageCropperFlip({
  className,
  children,
  ...props
}: NodeChildren<Loose<ComponentProps<typeof ImageCropperFlipPrimitive>>>) {
  return (
    <ImageCropperFlipPrimitive {...defined(props)} className={cn(toolButton, className)}>
      {children ?? (
        <>
          <FlipHorizontal2Icon aria-hidden className={props.direction === "vertical" ? "rotate-90" : undefined} />
          Flip
        </>
      )}
    </ImageCropperFlipPrimitive>
  );
}

type ActionProps = Omit<ButtonProps, "onClick" | "children"> & { children?: ReactNode | undefined };

/** "Use photo as is": keeps the whole photo, through the root's `onUseOriginal`. Always offer it: cropping is optional. */
function ImageCropperUseOriginal({ variant = "outline", children, ...props }: ActionProps) {
  const state = useImageCropper("ImageCropperUseOriginal");
  return (
    <Button {...props} variant={variant} onClick={() => state?.onUseOriginal?.()}>
      {children ?? "Use photo as is"}
    </Button>
  );
}

/**
 * "Save photo": writes the framed part as a file with `cropImage` (round when the frame is) and hands it to the root's
 * `onCrop`. Pending until the file is written and `onCrop`'s Promise, if any, settles.
 */
function ImageCropperSave({
  options,
  children,
  ...props
}: ActionProps & { options?: Omit<CropImageOptions, "shape"> | undefined }) {
  const state = useImageCropper("ImageCropperSave");
  return (
    <Button
      {...props}
      onClick={(_event, details) => {
        const crop = state?.controller.getCrop();
        if (!state?.src || !crop) return;
        const shape = state.shape === "circle" ? { shape: "circle" as const } : {};
        return cropImage(state.src, crop, { ...options, ...shape }).then((file) =>
          withSource(details.source, () => state.onCrop?.(file, crop)),
        );
      }}
    >
      {children ?? "Save photo"}
    </Button>
  );
}

export {
  ImageCropper,
  ImageCropperFlip,
  ImageCropperGrid,
  ImageCropperHandle,
  ImageCropperImage,
  ImageCropperRotate,
  ImageCropperSave,
  ImageCropperSelection,
  ImageCropperUseOriginal,
  ImageCropperViewport,
  ImageCropperZoom,
};
