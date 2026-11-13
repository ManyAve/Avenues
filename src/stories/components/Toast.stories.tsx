import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import { Button } from "#avenue/components/button";
import { ToastProvider, useToast, type ToastOptions } from "#avenue/components/toast";
import { Rows } from "./story-kit";

const toastEl = () => document.querySelector<HTMLElement>("[data-slot=toast]:not([data-ending-style])");
const findToast = () => waitFor(() => toastEl() ?? Promise.reject(new Error("no toast")));
const gone = (timeout: number) => waitFor(() => expect(toastEl()).toBeNull(), { timeout });
const liveText = (politeness: "polite" | "assertive") =>
  [...document.querySelectorAll(`[aria-live=${politeness}]`)].map((n) => n.textContent).join(" ");
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function Trigger({ label, text, options }: { label: string; text: string; options?: ToastOptions }) {
  const toast = useToast();
  return (
    <Button variant="outline" onClick={() => toast(text, options)}>
      {label}
    </Button>
  );
}

const undo = fn();

function Demo() {
  return (
    <ToastProvider>
      <Rows>
        <div className="flex flex-wrap gap-controls">
          <Trigger label="Add household" text="Household added" />
          <Trigger label="Archive notice" text="Notice archived" options={{ action: { label: "Undo", onAction: undo } }} />
          <Trigger label="Send reminder" text="Couldn't send the reminder. Check the address and try again." options={{ variant: "error" }} />
        </div>
      </Rows>
    </ToastProvider>
  );
}

const meta = {
  title: "Components/Toast",
  component: ToastProvider,
  args: { children: null },
  render: () => <Demo />,
  parameters: { layout: "fullscreen" },
  decorators: [(Story) => <div className="min-h-64">{Story()}</div>],
} satisfies Meta<typeof ToastProvider>;
export default meta;
type Story = StoryObj<typeof meta>;

/** A success: a check and the message, announced politely, gone after 4.2s. */
export const Success: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Add household" }));
    await expect(await findToast()).toHaveTextContent("Household added");
    await waitFor(() => expect(liveText("polite")).toContain("Household added"));
    await wait(3000);
    await expect(toastEl()).not.toBeNull();
    await gone(3000);
  },
};

/** With an action, the toast stays while focus is on it (F6 reaches it), and hides 4.2s after focus leaves. */
export const ActionKeepsItWhileFocused: Story = {
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Archive notice" });
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    await findToast();
    const action = await waitFor(() => {
      const el = document.querySelector<HTMLElement>("[data-slot=toast-action]");
      return el ?? Promise.reject(new Error("no action"));
    });
    action.focus();
    await expect(action).toHaveFocus();
    await wait(5000);
    await expect(toastEl()).not.toBeNull();
    trigger.focus();
    await gone(6000);
  },
};

/** The action runs on Enter and closes the toast. */
export const ActionRuns: Story = {
  play: async ({ canvas }) => {
    undo.mockClear();
    await userEvent.click(canvas.getByRole("button", { name: "Archive notice" }));
    await findToast();
    await userEvent.keyboard("{F6}");
    const action = document.querySelector<HTMLElement>("[data-slot=toast-action]")!;
    action.focus();
    await userEvent.keyboard("{Enter}");
    await expect(undo).toHaveBeenCalledOnce();
    await gone(2000);
  },
};

/** An error: announced at once, and it stays until the user dismisses it. */
export const ErrorStays: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Send reminder" }));
    const toast = await findToast();
    await expect(toast).toHaveAttribute("data-type", "error");
    await waitFor(() => expect(liveText("assertive")).toContain("Couldn't send the reminder."));
    await wait(5000);
    await expect(toastEl()).not.toBeNull();
    const dismiss = document.querySelector<HTMLElement>("[data-slot=toast-close]")!;
    await expect(dismiss).toHaveAccessibleName("Dismiss");
    dismiss.focus();
    await userEvent.keyboard("{Enter}");
    await gone(2000);
  },
};

/** A new toast replaces the current one. Ends with the toast showing, for the agent test. */
export const NewReplacesCurrent: Story = {
  tags: ["agent"],
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Send reminder" }));
    await findToast();
    await userEvent.click(canvas.getByRole("button", { name: "Add household" }));
    await waitFor(() => expect(toastEl()).toHaveTextContent("Household added"));
    await waitFor(() => expect(document.querySelectorAll("[data-slot=toast]")).toHaveLength(1));
  },
};

/** A success with an action, kept on screen because its action has focus (for comparing the look with the app). */
export const SuccessWithAction: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Archive notice" }));
    await findToast();
    document.querySelector<HTMLElement>("[data-slot=toast-action]")!.focus();
  },
};

/** An error, as it stays on screen until dismissed (for comparing the look with the app). */
export const ErrorShown: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Send reminder" }));
    const toast = await findToast();
    await expect(toast).toHaveAttribute("data-type", "error");
    // Whole and centred at the bottom of the window, as in the app, once it has slid in.
    await waitFor(async () => {
      const box = toast.getBoundingClientRect();
      await expect(box.left).toBeGreaterThanOrEqual(0);
      await expect(box.right).toBeLessThanOrEqual(window.innerWidth);
      await expect(Math.abs(box.left + box.width / 2 - window.innerWidth / 2)).toBeLessThanOrEqual(1);
      await expect(Math.round(window.innerHeight - box.bottom)).toBe(24);
    });
  },
};
