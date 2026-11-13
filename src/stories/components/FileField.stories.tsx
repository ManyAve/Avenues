import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import { FileField, type FileFieldFile, type FileFieldStatus } from "#avenue/components/file-field";

// AVE-35. Fictional data only: Sunnydale Commons is not a real association.

const pool =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 48"><rect width="64" height="48" fill="#cfe8f3"/><rect y="30" width="64" height="18" fill="#5aa9c9"/><circle cx="50" cy="12" r="6" fill="#f2c14e"/><path d="M0 30h64" stroke="#fff" stroke-width="2"/></svg>`,
  );

const photo: FileFieldFile = { name: "sunnydale-pool.jpg", url: pool };
const rules: FileFieldFile = { name: "sunnydale-pool-rules.pdf" };
const longName: FileFieldFile = {
  name: "sunnydale-commons-annual-meeting-minutes-and-approved-pool-rules-2026-final.pdf",
};

/** What the system picker does when someone picks a file: the hidden input is out of reach of pointer events. */
function choose(input: HTMLInputElement, file: File) {
  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

const imageHint = "PNG, JPEG or WebP, up to 10 MB. Shown at the top of the home page.";
const documentHint = "PDF, Word or an image, up to 25 MB.";

const meta = {
  title: "Components/File field",
  component: FileField,
  tags: ["agent"],
  parameters: { layout: "padded" },
  args: { label: "Home page photo", kind: "image", hint: imageHint, onFileChange: fn(), onRemove: fn(), onRetry: fn() },
  decorators: [
    (Story) => (
      <div className="w-full max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FileField>;
export default meta;
type Story = StoryObj<typeof meta>;

const states: Array<{ status: FileFieldStatus; progress?: number; disabledReason?: string }> = [
  { status: "empty" },
  { status: "chosen" },
  { status: "uploading", progress: 42 },
  { status: "uploaded" },
  { status: "failed" },
  { status: "unconfirmed" },
  { status: "uploaded", disabledReason: "Only board members can change the website." },
];

function StateGrid({ kind }: { kind: "image" | "document" }) {
  const file = kind === "image" ? photo : rules;
  return (
    <div className="flex flex-col gap-section">
      {states.map(({ status, progress, disabledReason }) => (
        <FileField
          key={`${status}-${disabledReason ? "reason" : ""}`}
          kind={kind}
          label={`${kind === "image" ? "Pool photo" : "Pool rules"}, ${disabledReason ? "disabled" : status}`}
          hint={kind === "image" ? imageHint : documentHint}
          file={status === "empty" ? null : file}
          status={status}
          progress={progress}
          disabledReason={disabledReason}
          onFileChange={() => {}}
          onRemove={() => {}}
          onRetry={() => {}}
        />
      ))}
    </div>
  );
}

/** Every state as a photo: empty, chosen, uploading 42%, uploaded, failed, couldn't confirm, disabled with a reason. */
export const ImageStates: Story = {
  render: () => <StateGrid kind="image" />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: /Choose photo/ })).toBeEnabled();
    const uploading = canvas.getByRole("button", { name: /Uploading 42%/ });
    await expect(uploading).toHaveAttribute("aria-disabled", "true");
    await expect(canvas.getAllByRole("button", { name: "Remove sunnydale-pool.jpg" }).length).toBeGreaterThan(0);
    await expect(canvas.getByText(/Couldn't upload sunnydale-pool.jpg/)).toBeVisible();
    await expect(canvas.getByText(/Couldn't confirm sunnydale-pool.jpg was saved/)).toBeVisible();
    await expect(canvas.getByText("Only board members can change the website.")).toBeVisible();
  },
};

/** Every state as a document: the name shows in place of the thumbnail. */
export const DocumentStates: Story = {
  args: { label: "Pool rules", kind: "document", hint: documentHint },
  render: () => <StateGrid kind="document" />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: /Choose file/ })).toBeEnabled();
    await expect(canvas.getAllByText("sunnydale-pool-rules.pdf", { exact: false }).length).toBeGreaterThan(0);
    await expect(canvas.getByRole("button", { name: /Try again/ })).toBeEnabled();
    await expect(canvas.getByRole("button", { name: /Check again/ })).toBeEnabled();
  },
};

/** A long name truncates in the middle, so ".pdf" stays visible; the whole name is still read out. */
export const LongName: Story = {
  args: { label: "Annual meeting minutes", kind: "document", hint: documentHint, file: longName, status: "chosen" },
  play: async ({ canvasElement, canvas }) => {
    const name = canvasElement.querySelector<HTMLElement>("[data-slot=file-name]")!;
    await expect(name).toHaveTextContent(longName.name);
    const [head, tail] = [...name.children] as HTMLElement[];
    await expect(tail).toBeVisible();
    await expect(tail!.textContent).toMatch(/\.pdf$/);
    await expect(head!.scrollWidth).toBeGreaterThan(head!.clientWidth);
    await expect(canvas.getByRole("button", { name: `Remove ${longName.name}` })).toBeVisible();
  },
};

/** At 390px (358px inside the page inset) the row wraps; the buttons keep their 28px height. */
export const Phone: Story = {
  args: { kind: "document", label: "Annual meeting minutes", hint: documentHint, file: longName, status: "failed" },
  decorators: [
    (Story) => (
      <div className="w-[358px]">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    const replace = canvas.getByRole("button", { name: /Replace file/ });
    await expect(replace.getBoundingClientRect().height).toBe(28);
    await expect(replace.getBoundingClientRect().right).toBeLessThanOrEqual(358 + 24);
  },
};

/** The upload, the app's job, simulated: choose a file by keyboard, watch progress, fail, retry, then remove. */
export const Upload: Story = {
  args: { label: "Pool rules", kind: "document", hint: documentHint, accept: [".pdf", ".docx", "image/*"] },
  render: function Render(args) {
    const [file, setFile] = useState<FileFieldFile | null>(null);
    const [status, setStatus] = useState<FileFieldStatus>("empty");
    const [progress, setProgress] = useState<number>();
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
      if (status !== "uploading") return;
      const timer = setInterval(() => {
        setProgress((p = 0) => {
          if (p >= 100) {
            clearInterval(timer);
            setStatus(attempt === 1 ? "failed" : "uploaded");
            return p;
          }
          return p + 25;
        });
      }, 30);
      return () => clearInterval(timer);
    }, [status, attempt]);
    const upload = () => {
      setProgress(0);
      setAttempt((n) => n + 1);
      setStatus("uploading");
    };
    return (
      <FileField
        {...args}
        file={file}
        status={status}
        progress={progress}
        onFileChange={(next) => {
          args.onFileChange(next);
          setFile({ name: next.name });
          upload();
        }}
        onRetry={upload}
        onRemove={() => {
          args.onRemove?.();
          setFile(null);
          setStatus("empty");
        }}
      />
    );
  },
  play: async ({ canvas, canvasElement, args, step }) => {
    const input = canvasElement.querySelector<HTMLInputElement>("input[type=file]")!;
    const trigger = canvas.getByRole("button", { name: /Choose file/ });

    await step("the field's label and the button name the trigger, and Enter opens the picker", async () => {
      await expect(trigger).toHaveAccessibleName(/Pool rules/);
      const opened = fn();
      input.addEventListener("click", (event) => {
        event.preventDefault();
        opened();
      });
      await userEvent.tab();
      await expect(trigger).toHaveFocus();
      await userEvent.keyboard("{Enter}");
      await expect(opened).toHaveBeenCalled();
      await expect(input).not.toBeVisible();
      await expect(input.tabIndex).toBe(-1);
    });

    await step("a chosen file uploads with progress in the button and a polite status", async () => {
      choose(input, new File(["rules"], "sunnydale-pool-rules.pdf", { type: "application/pdf" }));
      await expect(args.onFileChange).toHaveBeenCalledOnce();
      await waitFor(() => expect(canvas.getByRole("button", { name: /Uploading \d+%/ })).toBeVisible());
      await expect(canvasElement.querySelector("[data-slot=file-field-status]")).toHaveTextContent(/Uploading/);
      // Disabled while uploading, but still focusable, so focus isn't dropped on the page.
      await expect(canvas.getByRole("button", { name: /Uploading/ })).toHaveFocus();
    });

    await step("the first try fails: an alert says what happened, and Try again works by keyboard", async () => {
      await waitFor(() => expect(canvas.getByRole("alert")).toHaveTextContent("Couldn't upload sunnydale-pool-rules.pdf"));
      const retry = canvas.getByRole("button", { name: "Try again" });
      retry.focus();
      await userEvent.keyboard("{Enter}");
      // Try again is gone once the upload restarts; focus moves to the trigger, not the page (AVE-49).
      await waitFor(() => expect(retry).not.toBeInTheDocument());
      await expect(canvas.getByRole("button", { name: /Uploading/ })).toHaveFocus();
      await waitFor(() => expect(canvas.getByRole("button", { name: /Replace file/ })).toBeEnabled());
      await expect(canvas.getByRole("button", { name: /Replace file/ })).toHaveFocus();
      await expect(canvasElement.querySelector("[data-slot=file-field-status]")).toHaveTextContent("Uploaded");
    });

    await step("Remove names the file, asks an agent to confirm, and works by keyboard", async () => {
      const remove = canvas.getByRole("button", { name: "Remove sunnydale-pool-rules.pdf" });
      await expect(remove).toHaveAttribute("data-agent-confirm", "Removes sunnydale-pool-rules.pdf");
      remove.focus();
      await userEvent.keyboard(" ");
      await expect(args.onRemove).toHaveBeenCalledOnce();
      // The field is empty again; focus is on Choose file, not dropped on the page (AVE-49).
      await expect(canvas.getByRole("button", { name: /Choose file/ })).toBeVisible();
      await expect(canvas.getByRole("button", { name: /Choose file/ })).toHaveFocus();
    });
  },
};

/** A file the field doesn't accept never reaches `onFileChange`; `onReject` gets the reason so the app can say so. */
export const Rejected: Story = {
  args: { label: "Home page photo", kind: "image", hint: imageHint, onReject: fn() },
  render: function Render(args) {
    const [error, setError] = useState<string>();
    return (
      <FileField
        {...args}
        status={error ? "failed" : "empty"}
        error={error}
        onReject={(rejected) => {
          args.onReject?.(rejected);
          setError("That type of file can't be used as a photo. Choose a PNG, JPEG or WebP image.");
        }}
      />
    );
  },
  play: async ({ canvasElement, canvas, args }) => {
    const input = canvasElement.querySelector<HTMLInputElement>("input[type=file]")!;
    choose(input, new File(["%PDF"], "sunnydale-pool-rules.pdf", { type: "application/pdf" }));
    await expect(args.onFileChange).not.toHaveBeenCalled();
    await expect(args.onReject).toHaveBeenCalledOnce();
    await expect(canvas.getByRole("alert")).toHaveTextContent("Choose a PNG, JPEG or WebP image.");
    await expect(canvas.getByRole("button", { name: /Choose photo/ })).toHaveAttribute("aria-invalid", "true");
  },
};

/** Disabled with a reason: still focusable, so keyboard and screen reader users hear why. */
export const DisabledWithReason: Story = {
  args: {
    file: photo,
    status: "uploaded",
    disabledReason: "Only board members can change the website.",
  },
  play: async ({ canvas, canvasElement, args }) => {
    const replace = canvas.getByRole("button", { name: /Replace photo/ });
    await userEvent.tab();
    await expect(replace).toHaveFocus();
    await expect(replace).toHaveAccessibleDescription(/Only board members can change the website/);
    const opened = fn();
    canvasElement.querySelector("input[type=file]")!.addEventListener("click", (e) => {
      e.preventDefault();
      opened();
    });
    await userEvent.keyboard("{Enter}");
    await userEvent.click(canvas.getByText("Home page photo"));
    await expect(opened).not.toHaveBeenCalled();
    await userEvent.click(canvas.getByRole("button", { name: "Remove sunnydale-pool.jpg" }));
    await expect(args.onRemove).not.toHaveBeenCalled();
  },
};

/** A failed upload while the field is disabled: Try again stays focusable and says why it can't be used (AVE-49). */
export const DisabledRetry: Story = {
  args: {
    label: "Pool rules",
    kind: "document",
    file: { name: "sunnydale-pool-rules.pdf" },
    status: "failed",
    disabledReason: "Only board members can change the documents.",
  },
  play: async ({ canvas, args }) => {
    const retry = canvas.getByRole("button", { name: "Try again" });
    await expect(retry).toHaveAttribute("aria-disabled", "true");
    await expect(retry).toHaveAccessibleDescription("Only board members can change the documents.");
    retry.focus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onRetry).not.toHaveBeenCalled();
    await expect(retry).toHaveFocus();
  },
};
