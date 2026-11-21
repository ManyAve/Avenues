import type { Meta, StoryObj } from "@storybook/react-vite";
import { createAgent } from "@ui-sdk/react/agent";
import { useRef, useState, type CSSProperties } from "react";
import { expect, fn, screen, spyOn, userEvent, waitFor, within } from "storybook/test";
import { Button } from "#avenue/components/button";
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "#avenue/components/drawer";
import { ToastProvider, useToast, type ToastOptions } from "#avenue/components/toast";
import { DEVELOPMENT } from "#avenue/lib/dev";
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
          <Trigger label="Send reminder" text="Couldn't send the reminder. Check the address and try again." options={{ type: "error" }} />
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
 * 0.1 beta.1 and beta.2 listed it as an unnamed `toast` and Avenue patched that; beta.7 leaves it out itself, so the
 * patch is gone and this story now guards ui-sdk's own fix.
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
          options={{ type: "error", action: { label: "Retry", onAction: () => {} } }}
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
    <Drawer defaultOpen side="bottom">
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Reminder</DrawerTitle>
        </DrawerHeader>
        <DrawerBody>
          <p>Remind 14 Larkspur Lane that dues are due on Dec 1.</p>
        </DrawerBody>
        <DrawerFooter>
          <DrawerClose render={<Button variant="outline" />}>Cancel</DrawerClose>
          <Button onClick={() => toast(longError, { type: "error" })}>Send reminder</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

/** With a bottom Drawer open, the toast sits 8px above the sheet's footer, so it never covers its actions (AVE-40). */
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

// AVE-118: what the board app's own toast did that Avenue's didn't. Each story renders its own trigger, so the stories
// above keep their pixels.

/** Progress: something started that hasn't finished. A send icon instead of the check; timed and announced like a success. */
export const Progress: Story = {
  render: () => (
    <ToastProvider>
      <Rows>
        <Trigger label="Send announcement" text="Sending to 42 households…" options={{ type: "info" }} />
      </Rows>
    </ToastProvider>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Send announcement" }));
    const toast = await findToast();
    await expect(toast).toHaveTextContent("Sending to 42 households…");
    await expect(toast.querySelector("svg.lucide-send")).not.toBeNull();
    await expect(toast.querySelector("svg.lucide-check")).toBeNull();
    await waitFor(() => expect(liveText("polite")).toContain("Sending to 42 households…"));
    await gone(6000);
  },
};

const restore = fn();

function RemoveSection() {
  const toast = useToast();
  const [removed, setRemoved] = useState(false);
  const removeButton = useRef<HTMLButtonElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  return removed ? (
    <div className="flex items-center gap-controls">
      <p>No sections.</p>
      <Button ref={addButton} variant="outline">
        Add section
      </Button>
    </div>
  ) : (
    <Button
      ref={removeButton}
      variant="outline"
      onClick={() => {
        setRemoved(true);
        toast("Section removed", {
          action: { label: "Undo", onAction: () => { restore(); setRemoved(false); } },
          focus: true,
          // After Undo the section's button is back; dismissed, the nearest control left is Add section.
          returnFocus: () => removeButton.current ?? addButton.current,
        });
      }}
    >
      Remove section
    </Button>
  );
}

const sectionDemo = () => (
  <ToastProvider>
    <Rows>
      <RemoveSection />
    </Rows>
  </ToastProvider>
);

/**
 * `focus`: the button the person pressed is gone, so focus goes to Undo instead of falling to the page. Undo brings
 * the section back, and `returnFocus` puts focus on its button again (AVE-196).
 */
export const FocusesAction: Story = {
  render: sectionDemo,
  play: async ({ canvas }) => {
    restore.mockClear();
    canvas.getByRole("button", { name: "Remove section" }).focus();
    await userEvent.keyboard("{Enter}");
    await findToast();
    const action = await screen.findByRole("button", { name: "Undo" });
    await waitFor(() => expect(action).toHaveFocus());
    await userEvent.keyboard("{Enter}");
    await expect(restore).toHaveBeenCalledOnce();
    const back = await canvas.findByRole("button", { name: "Remove section" });
    await expect(back).toBeVisible();
    await waitFor(() => expect(back).toHaveFocus());
  },
};

/** Escape closes a toast that took focus, and `returnFocus` lands it on the nearest control left, not the page (AVE-196). */
export const FocusedToastEscape: Story = {
  render: sectionDemo,
  play: async ({ canvas }) => {
    restore.mockClear();
    canvas.getByRole("button", { name: "Remove section" }).focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(screen.getByRole("button", { name: "Undo" })).toHaveFocus());
    await userEvent.keyboard("{Escape}");
    await gone(2000);
    await expect(restore).not.toHaveBeenCalled();
    await waitFor(() => expect(canvas.getByRole("button", { name: "Add section" })).toHaveFocus());
  },
};

/**
 * A toast reached by F6 and closed by keyboard gives focus back to where it was (AVE-196): Escape, Dismiss and the
 * action each return it to the button that showed the toast. ui-sdk does this itself; Avenue adds nothing.
 */
export const KeyboardCloseReturnsFocus: Story = {
  play: async ({ canvas, step }) => {
    const send = canvas.getByRole("button", { name: "Send reminder" });
    const archive = canvas.getByRole("button", { name: "Archive notice" });
    await step("Escape", async () => {
      send.focus();
      await userEvent.keyboard("{Enter}");
      await findToast();
      await userEvent.keyboard("{F6}");
      await waitFor(() => expect(toastEl()?.contains(document.activeElement)).toBe(true));
      await userEvent.keyboard("{Escape}");
      await gone(2000);
      await expect(send).toHaveFocus();
    });
    await step("Dismiss", async () => {
      await userEvent.keyboard("{Enter}");
      await findToast();
      await userEvent.keyboard("{F6}");
      screen.getByRole("button", { name: "Dismiss" }).focus();
      await userEvent.keyboard("{Enter}");
      await gone(2000);
      await expect(send).toHaveFocus();
    });
    await step("the action", async () => {
      undo.mockClear();
      archive.focus();
      await userEvent.keyboard("{Enter}");
      await findToast();
      await userEvent.keyboard("{F6}");
      screen.getByRole("button", { name: "Undo" }).focus();
      await userEvent.keyboard("{Enter}");
      await expect(undo).toHaveBeenCalledOnce();
      await gone(2000);
      await expect(archive).toHaveFocus();
    });
  },
};

/** Without `focus`, focus stays where it is: the toast never takes it on its own. */
export const KeepsFocusWithoutFocusOption: Story = {
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Archive notice" });
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    await findToast();
    await wait(300);
    await expect(trigger).toHaveFocus();
  },
};

/** `--avenue-toast-bottom` lifts the toast 8px above a bar pinned to the bottom edge, so it never covers it. */
export const LiftedAboveBar: Story = {
  render: () => (
    // On a wrapper around the provider, because the region renders beside the provider's children.
    <div style={{ "--avenue-toast-bottom": "44px" } as CSSProperties}>
      <ToastProvider>
        <Rows>
          <Trigger label="Add household" text="Household added" />
        </Rows>
        <div data-testid="bar" className="fixed inset-x-0 bottom-0 h-11 border-t bg-muted" />
      </ToastProvider>
    </div>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Add household" }));
    const toast = await findToast();
    const bar = canvas.getByTestId("bar");
    await waitFor(() =>
      expect(Math.round(bar.getBoundingClientRect().top - toast.getBoundingClientRect().bottom)).toBe(8),
    );
  },
};

/**
 * A toast with no ToastProvider above it shows nothing. In development the first one logs a `console.error` naming
 * ToastProvider, once per page; a production build (the published Storybook) stays silent (AVE-140). The story tests
 * run ui-sdk strict, where it throws instead, so this story turns strict off while it presses.
 */
export const WithoutAProvider: Story = {
  render: () => (
    <Rows>
      <Trigger label="Add household" text="Household added" />
    </Rows>
  ),
  play: async ({ canvas }) => {
    const strict = Reflect.get(globalThis, "__UI_SDK_STRICT__");
    const error = spyOn(console, "error").mockImplementation(() => {});
    Reflect.set(globalThis, "__UI_SDK_STRICT__", false);
    try {
      const button = canvas.getByRole("button", { name: "Add household" });
      await userEvent.click(button);
      button.focus();
      await userEvent.keyboard("{Enter}");
      await wait(100);
      await expect(toastEl()).toBeNull();
      const named = error.mock.calls.filter((call) => String(call[0]).includes("<ToastProvider>"));
      await expect(named).toHaveLength(DEVELOPMENT ? 1 : 0);
    } finally {
      Reflect.set(globalThis, "__UI_SDK_STRICT__", strict);
      error.mockRestore();
    }
  },
};

/**
 * Drags the toast from the middle of its message with a mouse (pointer events, as ui-sdk reads them): down, `steps`
 * moves of `step` px each, then up unless `release` is false. Returns the release, for a drag held open.
 */
async function drag(toast: HTMLElement, { step, steps, release = true }: { step: number; steps: number; release?: boolean }) {
  const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
  const title = toast.querySelector<HTMLElement>("[data-slot=toast-title]")!.getBoundingClientRect();
  const x = title.left + title.width / 2;
  let y = title.top + title.height / 2;
  const fire = (type: string, buttons: number) =>
    toast.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
        clientX: x,
        clientY: y,
        button: 0,
        buttons,
      }),
    );
  fire("pointerdown", 1);
  for (let i = 0; i < steps; i += 1) {
    y += step;
    fire("pointermove", 1);
    await frame();
  }
  const up = () => fire("pointerup", 0);
  if (release) up();
  return up;
}

/** The toast, once it has finished entering (its first frame starts 8px low). */
async function settled() {
  const toast = await findToast();
  await waitFor(() => expect(toast).not.toHaveAttribute("data-starting-style"));
  return toast;
}

const offset = (toast: HTMLElement) => {
  const [x = "0px", y = "0px"] = getComputedStyle(toast).translate.split(" ");
  return { x: Number.parseFloat(x) || 0, y: Number.parseFloat(y) || 0 };
};

/**
 * A toast follows a swipe (AVE-192): dragged 30px down from its text, it moves 30px with no transition, and the text
 * isn't selected. Let go short of dismissing, it settles back where it was and stays.
 */
export const SwipeFollows: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Add household" }));
    const toast = await settled();
    await expect(getComputedStyle(toast).userSelect).toBe("none");
    await expect(offset(toast)).toEqual({ x: 0, y: 0 });
    const release = await drag(toast, { step: 2, steps: 15, release: false });
    await expect(toast).toHaveAttribute("data-swiping");
    await expect(getComputedStyle(toast).transitionDuration).toBe("0s");
    await expect(offset(toast)).toEqual({ x: 0, y: 30 });
    await expect(document.getSelection()?.toString() ?? "").toBe("");
    release();
    await waitFor(() => expect(toast).not.toHaveAttribute("data-swiping"));
    await expect(offset(toast)).toEqual({ x: 0, y: 0 });
    await expect(toastEl()).toBe(toast);
  },
};

/**
 * Swiped down past the threshold, a toast is dismissed and carries on down, past where the finger let go, as it
 * fades (AVE-192). An upward drag only stretches a little (ui-sdk resists it) and never dismisses.
 */
export const SwipeAway: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Add household" }));
    const toast = await settled();
    const releaseUp = await drag(toast, { step: -5, steps: 10, release: false });
    await expect(offset(toast).y).toBeLessThan(0);
    await expect(offset(toast).y).toBeGreaterThan(-20);
    releaseUp();
    await waitFor(() => expect(toast).not.toHaveAttribute("data-swiping"));
    await expect(toastEl()).toBe(toast);

    // The preview turns transitions off under test, and a toast with nothing to animate unmounts at once. Slow its
    // transitions as it's let go, so it stays to be measured, and read where its slide ends.
    const releaseDown = await drag(toast, { step: 10, steps: 6, release: false });
    toast.style.setProperty("transition-duration", "30s", "important");
    releaseDown();
    await expect(toast).toHaveAttribute("data-swipe-direction", "down");
    const slide = toast
      .getAnimations()
      .find((animation) => animation instanceof CSSTransition && animation.transitionProperty === "translate");
    const end = slide?.effect instanceof KeyframeEffect ? slide.effect.getKeyframes().at(-1) : undefined;
    // From where it was let go (60px down) to its own height further on.
    await expect(end?.["translate"]).toBe("0px calc(100% + 60px)");
    for (const animation of toast.getAnimations()) animation.finish();
    await gone(2000);
  },
};

// ---- Undo instead of asking first (AVE-198, docs/undo-or-confirm.md)

const NOTICES = ["Pool hours", "Parking lot sweep", "Board meeting"];

/**
 * A notices list where Archive happens at once and offers Undo. Archived notices keep a Restore button, so the way back
 * outlives the toast (AVE-41): that is where the toast's second line points.
 */
function NoticeBoard() {
  const toast = useToast();
  const [archived, setArchived] = useState<string[]>([]);
  const restoreNotice = (name: string) => setArchived((now) => now.filter((n) => n !== name));
  return (
    <Rows>
      <section aria-label="Notices" className="flex flex-col gap-controls">
        {NOTICES.filter((name) => !archived.includes(name)).map((name) => (
          <div key={name} className="flex items-center justify-between gap-controls">
            <span>{name}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setArchived((now) => [...now, name]);
                toast.undo({
                  id: "archive-notice",
                  title: (count) => (count === 1 ? "Notice archived" : `${count} notices archived`),
                  elsewhere: (count) => `You can also restore ${count === 1 ? "it" : "them"} from Archived.`,
                  onUndo: () => restoreNotice(name),
                });
              }}
            >
              Archive {name}
            </Button>
          </div>
        ))}
      </section>
      <section aria-label="Archived" className="flex flex-col gap-controls">
        <h3 className="font-heading">Archived</h3>
        {archived.length === 0 && <p className="text-muted-foreground">Nothing archived.</p>}
        {archived.map((name) => (
          <div key={name} className="flex items-center justify-between gap-controls">
            <span>{name}</span>
            <Button variant="ghost" size="sm" onClick={() => restoreNotice(name)}>
              Restore {name}
            </Button>
          </div>
        ))}
      </section>
    </Rows>
  );
}

const noticeBoard = () => (
  <ToastProvider>
    <NoticeBoard />
  </ToastProvider>
);
const notices = () => screen.getByRole("region", { name: "Notices" });
const archivedList = () => screen.getByRole("region", { name: "Archived" });

/**
 * Archive happens at once and the toast offers Undo, with where to undo later on its second line. F6 reaches Undo, and
 * Enter puts the notice back.
 */
export const UndoOne: Story = {
  render: noticeBoard,
  play: async ({ canvas }) => {
    canvas.getByRole("button", { name: "Archive Pool hours" }).focus();
    await userEvent.keyboard("{Enter}");
    const toast = await findToast();
    await expect(toast).toHaveTextContent("Notice archived");
    await expect(toast.querySelector("[data-slot=toast-description]")).toHaveTextContent(
      "You can also restore it from Archived.",
    );
    await expect(archivedList()).toHaveTextContent("Pool hours");
    await waitFor(() => expect(liveText("polite")).toContain("Notice archived"));

    await userEvent.keyboard("{F6}");
    const action = screen.getByRole("button", { name: "Undo" });
    await waitFor(() => expect(toast.contains(document.activeElement)).toBe(true));
    action.focus();
    await userEvent.keyboard("{Enter}");
    await gone(2000);
    await expect(notices()).toHaveTextContent("Pool hours");
    await expect(archivedList()).toHaveTextContent("Nothing archived.");
  },
};

/**
 * Three archives in a row stay one toast that counts them, never a stack (one toast at a time, AVE-8, AVE-41). Its Undo
 * takes back all three. Ends with the counted toast showing and Undo focused, for comparing the look.
 */
export const UndoCountsARun: Story = {
  render: noticeBoard,
  play: async ({ canvas }) => {
    for (const name of NOTICES) await userEvent.click(canvas.getByRole("button", { name: `Archive ${name}` }));
    await waitFor(() => expect(toastEl()).toHaveTextContent("3 notices archived"));
    await expect(toastEl()).toHaveTextContent("You can also restore them from Archived.");
    await waitFor(() => expect(document.querySelectorAll("[data-slot=toast]")).toHaveLength(1));
    await waitFor(() => expect(liveText("polite")).toContain("3 notices archived"));
    await expect(screen.getAllByRole("button", { name: "Undo" })).toHaveLength(1);

    await userEvent.keyboard("{F6}");
    screen.getByRole("button", { name: "Undo" }).focus();
    await userEvent.keyboard("{Enter}");
    await gone(2000);
    for (const name of NOTICES) await expect(notices()).toHaveTextContent(name);
    await expect(archivedList()).toHaveTextContent("Nothing archived.");

    // A new run starts at one again, and stays on screen with Undo focused.
    await userEvent.click(canvas.getByRole("button", { name: "Archive Pool hours" }));
    await waitFor(() => expect(toastEl()).toHaveTextContent("Notice archived"));
    await userEvent.click(canvas.getByRole("button", { name: "Archive Board meeting" }));
    await waitFor(() => expect(toastEl()).toHaveTextContent("2 notices archived"));
    screen.getByRole("button", { name: "Undo" }).focus();
  },
};

/** Any other toast ends a run: the next archive counts from one again. */
export const UndoRunEndsOnAnotherToast: Story = {
  render: () => (
    <ToastProvider>
      <NoticeBoard />
      <Rows>
        <Trigger label="Add household" text="Household added" />
      </Rows>
    </ToastProvider>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Archive Pool hours" }));
    await findToast();
    await userEvent.click(canvas.getByRole("button", { name: "Add household" }));
    await waitFor(() => expect(toastEl()).toHaveTextContent("Household added"));
    await userEvent.click(canvas.getByRole("button", { name: "Archive Board meeting" }));
    await waitFor(() => expect(toastEl()).toHaveTextContent("Notice archived"));
    await expect(toastEl()).not.toHaveTextContent("2 notices");
    await waitFor(() => expect(document.querySelectorAll("[data-slot=toast]")).toHaveLength(1));
  },
};

/**
 * Undo after the toast has gone: it isn't on screen to press, and the toast said where to undo instead. After its 10s
 * the notice is restored from Archived.
 */
export const UndoAfterTheToastIsGone: Story = {
  render: noticeBoard,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Archive Parking lot sweep" }));
    const toast = await findToast();
    await expect(toast).toHaveTextContent("You can also restore it from Archived.");
    await gone(12_000);
    await expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
    await userEvent.click(within(archivedList()).getByRole("button", { name: "Restore Parking lot sweep" }));
    await expect(notices()).toHaveTextContent("Parking lot sweep");
  },
};

/**
 * An agent presses Undo through ui-sdk's bridge, as a person would: the bridge lists the toast by its title with Undo
 * among its buttons, and its `press` takes the button's name. Ends
 * with a counted toast showing, for the agent test.
 */
export const UndoByAnAgent: Story = {
  tags: ["agent"],
  render: noticeBoard,
  play: async ({ canvas }) => {
    const agent = createAgent();
    await userEvent.click(canvas.getByRole("button", { name: "Archive Pool hours" }));
    await findToast();
    // The bridge lists the toast by its title, with Undo among its buttons; pressing takes the button's name.
    const entry = agent.snapshot().find((e) => e.component === "toast");
    await expect(entry).toMatchObject({ label: "Notice archived", buttons: ["Undo"] });
    const result = await agent.act({ steps: [{ ref: "Notice archived", action: "press", args: ["Undo"] }] });
    await expect(result.ok, result.error?.message).toBe(true);
    await waitFor(() => expect(notices()).toHaveTextContent("Pool hours"));
    await gone(2000);

    await userEvent.click(canvas.getByRole("button", { name: "Archive Pool hours" }));
    await userEvent.click(canvas.getByRole("button", { name: "Archive Board meeting" }));
    await waitFor(() => expect(toastEl()).toHaveTextContent("2 notices archived"));
  },
};

/** A slow Undo stays pending, and one that fails keeps the toast; pressing again retries only what is left. */
export const UndoFailsThenRetries: Story = {
  render: () => {
    function Flaky() {
      const toast = useToast();
      const [log, setLog] = useState<string[]>([]);
      const fails = useRef(1);
      return (
        <Rows>
          <Button
            variant="outline"
            onClick={() => {
              for (const name of ["first", "second"]) {
                toast.undo({
                  id: "flaky",
                  title: (count) => `${count} moved`,
                  elsewhere: "You can also move them back from the list.",
                  onUndo: () =>
                    new Promise<void>((resolve, reject) =>
                      setTimeout(() => {
                        if (name === "first" && fails.current > 0) {
                          fails.current = 0;
                          reject(new Error("offline"));
                          return;
                        }
                        setLog((now) => [...now, name]);
                        resolve();
                      }, 100),
                    ),
                });
              }
            }}
          >
            Move two
          </Button>
          <output aria-label="Undone">{log.join(", ")}</output>
        </Rows>
      );
    }
    return (
      <ToastProvider>
        <Flaky />
      </ToastProvider>
    );
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Move two" }));
    await waitFor(() => expect(toastEl()).toHaveTextContent("2 moved"));
    const action = screen.getByRole("button", { name: "Undo" });
    action.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(action).toHaveAttribute("data-pending"));
    // The second (newest) is undone first, then the first fails: the toast stays.
    await waitFor(() => expect(canvas.getByLabelText("Undone")).toHaveTextContent("second"));
    await waitFor(() => expect(action).not.toHaveAttribute("data-pending"));
    await expect(toastEl()).not.toBeNull();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(canvas.getByLabelText("Undone")).toHaveTextContent("second, first"));
    await gone(2000);
  },
};
