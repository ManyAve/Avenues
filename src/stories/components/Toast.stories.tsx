import type { Meta, StoryObj } from "@storybook/react-vite";
import { createAgent } from "@ui-sdk/react/agent";
import { expect, fn, screen, userEvent, waitFor } from "storybook/test";
import { Button } from "#avenue/components/button";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "#avenue/components/sheet";
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

/**
 * A success with an action stays at least 10s, so F6, a switch or voice can reach Undo in time (WCAG 2.2.1, AVE-41).
 * Still there at 9s, gone soon after 10s.
 */
export const ActionGetsTenSeconds: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Archive notice" }));
    await findToast();
    await wait(9000);
    await expect(toastEl()).toHaveTextContent("Notice archived");
    await gone(3000);
  },
};

/** With an action, the toast stays while focus is on it (F6 reaches it), past its 10s, and hides after focus leaves. */
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
    await wait(11000);
    await expect(toastEl()).not.toBeNull();
    trigger.focus();
    await gone(12000);
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

/** A new success replaces the current one. Ends with the toast showing, for the agent test. */
export const NewReplacesCurrent: Story = {
  tags: ["agent"],
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Archive notice" }));
    await findToast();
    await userEvent.click(canvas.getByRole("button", { name: "Add household" }));
    await waitFor(() => expect(toastEl()).toHaveTextContent("Household added"));
    await waitFor(() => expect(document.querySelectorAll("[data-slot=toast]")).toHaveLength(1));
  },
};

/**
 * A later success never hides an error (AVE-41): the error stays, and the success waits behind it until the error is
 * dismissed. Ends with the error showing.
 */
export const ErrorNotHiddenBySuccess: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Send reminder" }));
    await findToast();
    await userEvent.click(canvas.getByRole("button", { name: "Add household" }));
    await wait(500);
    const toast = toastEl();
    await expect(toast).toHaveAttribute("data-type", "error");
    await expect(toast).toHaveTextContent("Couldn't send the reminder.");
    await expect(document.querySelectorAll("[data-slot=toast]")).toHaveLength(1);

    const dismiss = document.querySelector<HTMLElement>("[data-slot=toast-close]")!;
    dismiss.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(toastEl()).toHaveTextContent("Household added"));
    await expect(toastEl()).toHaveAttribute("data-type", "success");

    await userEvent.click(canvas.getByRole("button", { name: "Send reminder" }));
    await waitFor(() => expect(toastEl()).toHaveAttribute("data-type", "error"));
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

/**
 * A page with the toast region and no toast showing (AVE-43). The region has nothing to name or pause, so the agent
 * snapshot leaves it out and the agent test passes on the screens where it sits empty near the root. ui-sdk
 * 0.1.0-beta.1 listed it as an unnamed `toast`; Avenue patches that (patches/, see AGENTS.md) until ui-sdk fixes it.
 */
export const EmptyRegion: Story = {
  tags: ["agent"],
  render: () => (
    <ToastProvider>
      <Rows>
        <Button>Save</Button>
      </Rows>
    </ToastProvider>
  ),
  play: async () => {
    const onPage = createAgent()
      .snapshot()
      .filter((entry) => !entry.offPage && entry.component !== "more");
    await expect(onPage.find((entry) => entry.component === "button")).toHaveProperty("label", "Save");
    await expect(
      onPage.find((entry) => entry.component === "toast"),
      "The empty toast region is in the agent snapshot again: is the AVE-43 ui-sdk patch still applied?",
    ).toBeUndefined();
  },
};

const phone = { viewport: { value: "phone", isRotated: false } };
const longError = "Couldn't send the reminder. Check the address and try again.";

/** Keeps a 16px gutter each side of a toast at 390px and checks nothing in it is cut. */
async function expectInsidePhoneGutters(toast: HTMLElement) {
  await waitFor(async () => {
    const box = toast.getBoundingClientRect();
    await expect(Math.round(box.left)).toBeGreaterThanOrEqual(16);
    await expect(Math.round(window.innerWidth - box.right)).toBeGreaterThanOrEqual(16);
  });
  const title = toast.querySelector<HTMLElement>("[data-slot=toast-title]")!;
  await expect(title.scrollWidth).toBeLessThanOrEqual(title.clientWidth);
  await expect(title.scrollHeight).toBeLessThanOrEqual(title.clientHeight);
}

/**
 * The longest error on a 390px phone (AVE-40): it wraps inside the 16px gutters and is never cut, and sits 24px above
 * the bottom edge plus the home indicator's safe area (0 in a browser).
 */
export const PhoneLongError: Story = {
  globals: phone,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Send reminder" }));
    const toast = await findToast();
    await expect(toast).toHaveTextContent(longError);
    await expectInsidePhoneGutters(toast);
    // Wrapped, not cut: taller than one line.
    await expect(toast.querySelector<HTMLElement>("[data-slot=toast-title]")!.getBoundingClientRect().height).toBeGreaterThan(24);
    await waitFor(() => expect(Math.round(window.innerHeight - toast.getBoundingClientRect().bottom)).toBe(24));
  },
};

/**
 * An error with an action on a phone: Retry and Dismiss each keep a 44px tap area, and the two don't overlap (the
 * touch story-test project measures them). Ends with the toast showing.
 */
export const PhoneActionAndClose: Story = {
  globals: phone,
  render: () => (
    <ToastProvider>
      <Rows>
        <Trigger
          label="Send reminder"
          text={longError}
          options={{ variant: "error", action: { label: "Retry", onAction: () => {} } }}
        />
      </Rows>
    </ToastProvider>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Send reminder" }));
    const toast = await findToast();
    await expectInsidePhoneGutters(toast);
    await expect(toast.querySelector("[data-slot=toast-action]")).toHaveTextContent("Retry");
    await expect(toast.querySelector("[data-slot=toast-close]")).toHaveAccessibleName("Dismiss");
  },
};

function SheetWithToast() {
  const toast = useToast();
  return (
    <Sheet defaultOpen side="bottom">
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Reminder</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <p>Remind 14 Larkspur Lane that dues are due on Dec 1.</p>
        </SheetBody>
        <SheetFooter>
          <SheetClose render={<Button variant="outline" />}>Cancel</SheetClose>
          <Button onClick={() => toast(longError, { variant: "error" })}>Send reminder</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** With a bottom Sheet open, the toast sits 8px above the sheet's footer, so it never covers its actions (AVE-40). */
export const PhoneAboveSheetFooter: Story = {
  globals: phone,
  render: () => (
    <ToastProvider>
      <SheetWithToast />
    </ToastProvider>
  ),
  play: async () => {
    await screen.findByRole("dialog", { name: "Reminder" });
    await userEvent.click(await screen.findByRole("button", { name: "Send reminder" }));
    const toast = await findToast();
    await expectInsidePhoneGutters(toast);
    const footer = document.querySelector<HTMLElement>("[data-slot=sheet-footer]")!;
    await waitFor(() =>
      expect(Math.round(footer.getBoundingClientRect().top - toast.getBoundingClientRect().bottom)).toBe(8),
    );
  },
};
