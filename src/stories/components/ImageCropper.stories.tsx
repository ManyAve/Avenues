import type { Meta, StoryObj } from "@storybook/react-vite";
import { createAgent } from "@ui-sdk/react/agent";
import { useState } from "react";
import { expect, fn, screen, userEvent, waitFor } from "storybook/test";
import { Avatar, AvatarFallback, AvatarImage } from "#avenue/components/avatar";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "#avenue/components/dialog";
import { Button } from "#avenue/components/button";
import { FileField, type FileFieldFile } from "#avenue/components/file-field";
import {
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
} from "#avenue/components/image-cropper";
import { listenForAnnouncements } from "./announce-kit";

// AVE-206. Frame a photo before saving it. Fictional pictures only: drawn shapes, no real person or place.

const SCENE = `<rect width="640" height="420" fill="#cfe8f3"/><circle cx="520" cy="80" r="40" fill="#f2c14e"/><rect y="300" width="640" height="120" fill="#7fb77e"/><circle cx="300" cy="170" r="70" fill="#e0b48f"/><path d="M200 420c0-90 45-150 100-150s100 60 100 150z" fill="#5a7fc9"/><path d="M215 140q85-90 170 0z" fill="#c2563a"/><circle cx="275" cy="165" r="7" fill="#3b2f2f"/><circle cx="325" cy="165" r="7" fill="#3b2f2f"/><path d="M275 200q25 20 50 0" stroke="#3b2f2f" stroke-width="5" fill="none"/>`;
const portrait = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420">${SCENE}</svg>`)}`;
const ALT = "Drawing of a neighbor in a red hat, smiling, in a garden";

const LOGO = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><rect width="480" height="360" fill="#f4efe6"/><path d="M140 220 240 130l100 90v80H140z" fill="#2f6f5e"/><rect x="220" y="240" width="40" height="60" fill="#f4efe6"/><path d="M120 225 240 115l120 110" stroke="#c2563a" stroke-width="16" fill="none" stroke-linecap="round"/></svg>`,
)}`;

/** The scene as a PNG file, as if picked from a phone's photos. */
async function pickedPhoto(): Promise<File> {
  const image = new Image();
  image.src = portrait;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 420;
  canvas.getContext("2d")!.drawImage(image, 0, 0);
  const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
  return new File([blob], "garden-portrait.png", { type: "image/png" });
}

/** What the system picker does when someone picks a file: the hidden input is out of reach of pointer events. */
function choose(input: HTMLInputElement, file: File) {
  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

const loaded = (root: Element) => waitFor(() => expect(root.querySelector("[data-slot=image-cropper]:not([data-loading])")).not.toBeNull());

function RoundFrame({ onCrop, onUseOriginal }: { onCrop?: (file: File) => void; onUseOriginal?: () => void }) {
  return (
    <ImageCropper aria-label="Profile photo" src={portrait} shape="circle" maxZoom={4} onCrop={onCrop} onUseOriginal={onUseOriginal}>
      <ImageCropperViewport>
        <ImageCropperImage alt={ALT} />
        <ImageCropperSelection>
          <ImageCropperGrid />
        </ImageCropperSelection>
      </ImageCropperViewport>
      <div className="flex items-center gap-controls">
        <ImageCropperZoom />
        <ImageCropperRotate />
      </div>
      <div className="flex justify-end gap-controls">
        <ImageCropperUseOriginal />
        <ImageCropperSave options={{ width: 256 }} />
      </div>
    </ImageCropper>
  );
}

const meta = {
  title: "Components/Image cropper",
  component: ImageCropper,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ImageCropper>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A profile photo in a round frame: drag or use the arrows to move it, the wheel, a pinch, plus and minus to zoom. */
export const Round: Story = {
  render: () => <RoundFrame />,
  play: async ({ canvas, canvasElement }) => {
    await loaded(canvasElement);
    const frame = canvas.getByRole("slider", { name: "Profile photo, round frame" });
    await expect(frame).toBeInTheDocument();
    await expect(canvas.getByRole("img", { name: ALT })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Use photo as is" })).toBeInTheDocument();
  },
};

/** An association's logo in a square frame. */
export const Square: Story = {
  render: () => (
    <ImageCropper aria-label="Association logo" src={LOGO} maxZoom={3}>
      <ImageCropperViewport>
        <ImageCropperImage alt="Sunnydale HOA logo: a green house under a red roof line" />
        <ImageCropperSelection />
      </ImageCropperViewport>
      <div className="flex items-center gap-controls">
        <ImageCropperZoom />
        <ImageCropperFlip />
      </div>
      <div className="flex justify-end gap-controls">
        <ImageCropperUseOriginal>Use logo as is</ImageCropperUseOriginal>
        <ImageCropperSave>Save logo</ImageCropperSave>
      </div>
    </ImageCropper>
  ),
  play: async ({ canvas, canvasElement }) => {
    await loaded(canvasElement);
    await expect(canvas.getByRole("slider", { name: "Association logo, square frame" })).toBeInTheDocument();
  },
};

/** By keyboard: arrows pan, plus and minus zoom, and each change is said politely. */
export const Keyboard: Story = {
  render: () => <RoundFrame />,
  play: async ({ canvas, canvasElement, step }) => {
    await loaded(canvasElement);
    const frame = canvas.getByRole("slider", { name: "Profile photo, round frame" });
    const listening = listenForAnnouncements();
    try {
      await userEvent.tab();
      await expect(frame).toHaveFocus();
      await step("an arrow moves the frame and says which way", async () => {
        await userEvent.keyboard("{ArrowLeft}");
        await waitFor(() => expect(listening.heard).toContain("Moved left"));
      });
      await step("plus zooms in and says the level", async () => {
        await userEvent.keyboard("+");
        await waitFor(() => expect(listening.heard.some((text) => /^Zoom (\d+)%$/.test(text) && text !== "Zoom 100%")).toBe(true));
      });
      await step("zoomed in, the frame moves up too", async () => {
        await userEvent.keyboard("{ArrowUp}");
        await waitFor(() => expect(listening.heard).toContain("Moved up"));
      });
      await step("minus zooms back out", async () => {
        await userEvent.keyboard("-");
        await waitFor(() => expect(listening.heard.at(-1)).toMatch(/^Zoom \d+%$/));
      });
      await step("the rest is reached by Tab, and Rotate says the turn", async () => {
        await userEvent.tab();
        await expect(canvas.getByRole("slider", { name: /zoom/i })).toHaveFocus();
        await userEvent.tab();
        await expect(canvas.getByRole("button", { name: "Rotate" })).toHaveFocus();
        await userEvent.keyboard("{Enter}");
        await waitFor(() => expect(listening.heard).toContain("Turned to 90 degrees"));
      });
    } finally {
      listening.stop();
    }
  },
};

/** A cover photo in box mode: move the selection over the whole photo and drag its corners. */
export const Box: Story = {
  render: () => (
    <ImageCropper aria-label="Cover photo" src={portrait} mode="box" aspectRatio={3} minWidth={120}>
      <ImageCropperViewport>
        <ImageCropperImage alt={ALT} />
        <ImageCropperSelection>
          <ImageCropperGrid />
        </ImageCropperSelection>
        {(["nw", "ne", "se", "sw"] as const).map((position) => (
          <ImageCropperHandle key={position} position={position} />
        ))}
      </ImageCropperViewport>
      <div className="flex justify-end gap-controls">
        <ImageCropperUseOriginal />
        <ImageCropperSave>Save cover</ImageCropperSave>
      </div>
    </ImageCropper>
  ),
  play: async ({ canvas, canvasElement }) => {
    await loaded(canvasElement);
    await expect(canvas.getByRole("slider", { name: "Cover photo, frame" })).toBeInTheDocument();
  },
};

const FIELD_ID = "profile-photo";

/** The whole step: pick a photo in the file field, frame it in a dialog, and see it in the field and the avatar. */
function ProfilePhoto({ onCrop }: { onCrop?: (file: File) => void }) {
  const [saved, setSaved] = useState<FileFieldFile | null>(null);
  const [picked, setPicked] = useState<{ file: File; url: string } | null>(null);
  const [open, setOpen] = useState(false);
  const keep = (file: File) => {
    setSaved({ name: file.name, url: URL.createObjectURL(file) });
    setOpen(false);
  };
  return (
    <div className="flex max-w-md flex-col gap-6">
      <div className="flex items-center gap-3">
        <Avatar size="lg">
          {saved?.url && <AvatarImage src={saved.url} alt="Your profile photo" />}
          <AvatarFallback aria-hidden>AL</AvatarFallback>
        </Avatar>
        <p className="text-sm">Avery Lane</p>
      </div>
      <FileField
        id={FIELD_ID}
        label="Profile photo"
        hint="PNG, JPEG or WebP. Shown beside your posts."
        kind="image"
        file={saved}
        onFileChange={(file) => {
          setPicked({ file, url: URL.createObjectURL(file) });
          setOpen(true);
        }}
        onRemove={() => setSaved(null)}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent finalFocus={`#${FIELD_ID} [data-slot=file-input-trigger]`}>
          <DialogHeader>
            <DialogTitle>Frame your photo</DialogTitle>
            <DialogDescription>Drag it or use the arrow keys to move it, and plus and minus to zoom.</DialogDescription>
          </DialogHeader>
          {picked && (
            <ImageCropper
              aria-label="Profile photo"
              src={picked.url}
              shape="circle"
              maxZoom={4}
              onCrop={(file) => {
                onCrop?.(file);
                keep(file);
              }}
              onUseOriginal={() => keep(picked.file)}
              className="max-w-none"
            >
              <ImageCropperViewport>
                <ImageCropperImage alt={ALT} />
                <ImageCropperSelection>
                  <ImageCropperGrid />
                </ImageCropperSelection>
              </ImageCropperViewport>
              <ImageCropperZoom />
              <DialogFooter>
                <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
                <ImageCropperUseOriginal />
                <ImageCropperSave options={{ width: 256 }} />
              </DialogFooter>
            </ImageCropper>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

const imageSize = (src: string) =>
  new Promise<{ width: number; height: number }>((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.src = src;
  });

/** With File field and Avatar: after a crop, focus is back on the field's button and both show the cropped photo. */
export const WithFileField: Story = {
  render: () => <ProfilePhoto />,
  play: async ({ canvas, canvasElement, step }) => {
    const input = canvasElement.querySelector<HTMLInputElement>("input[type=file]")!;
    const photo = await pickedPhoto();

    await step("picking a photo opens the frame, centred", async () => {
      choose(input, photo);
      const dialog = await screen.findByRole("dialog", { name: "Frame your photo" });
      await loaded(dialog);
      await expect(screen.getByRole("img", { name: ALT })).toBeInTheDocument();
    });

    await step("zoom by keyboard, then Save photo", async () => {
      const frame = screen.getByRole("slider", { name: "Profile photo, round frame" });
      frame.focus();
      await userEvent.keyboard("++");
      await userEvent.tab();
      await userEvent.tab();
      await userEvent.tab();
      await userEvent.tab();
      await expect(screen.getByRole("button", { name: "Save photo" })).toHaveFocus();
      await userEvent.keyboard("{Enter}");
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), { timeout: 5000 });
    });

    await step("focus is back on the field's button, and the field and avatar show the crop", async () => {
      const trigger = await canvas.findByRole("button", { name: /Replace photo/ });
      await waitFor(() => expect(trigger).toHaveFocus(), { timeout: 5000 });
      const thumbnail = canvasElement.querySelector<HTMLImageElement>("[data-slot=file-thumbnail]")!;
      await expect(thumbnail.src).toMatch(/^blob:/);
      await expect(await imageSize(thumbnail.src)).toEqual({ width: 256, height: 256 });
      await waitFor(() => expect(canvas.getByRole("img", { name: "Your profile photo" })).toHaveAttribute("src", thumbnail.src));
    });

    await step("Use photo as is keeps the whole photo, and focus comes back the same way", async () => {
      choose(input, photo);
      const dialog = await screen.findByRole("dialog", { name: "Frame your photo" });
      await loaded(dialog);
      screen.getByRole("button", { name: "Use photo as is" }).focus();
      await userEvent.keyboard("{Enter}");
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), { timeout: 5000 });
      await waitFor(() => expect(canvas.getByRole("button", { name: /Replace photo/ })).toHaveFocus());
      const thumbnail = canvasElement.querySelector<HTMLImageElement>("[data-slot=file-thumbnail]")!;
      await expect(await imageSize(thumbnail.src)).toEqual({ width: 640, height: 420 });
    });
  },
};

const agent = createAgent();

/** An agent finds the cropper by name, zooms it, and saves the photo with Save photo. */
export const Agent: Story = {
  tags: ["agent"],
  args: { onCrop: fn() },
  render: (args) => <RoundFrame onCrop={args.onCrop as (file: File) => void} />,
  play: async ({ canvasElement, args }) => {
    await loaded(canvasElement);
    const labels = agent
      .snapshot()
      .filter((entry) => !entry.offPage && entry.component !== "more")
      .map((entry) => entry.label);
    await expect(labels).toEqual(expect.arrayContaining(["Profile photo", "Use photo as is", "Save photo"]));
    const result = await agent.act({
      steps: [
        { ref: "Profile photo", action: "setZoom", args: [2] },
        { ref: "Save photo", action: "press" },
      ],
    });
    await expect(result.ok, result.error?.message).toBe(true);
    await waitFor(() => expect(args.onCrop).toHaveBeenCalledWith(expect.any(File), expect.objectContaining({ width: 210, height: 210 })));
  },
};
