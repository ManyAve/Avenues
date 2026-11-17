import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef, useState } from "react";
import { expect, screen, userEvent, waitFor } from "storybook/test";
import { Button } from "#avenue/components/button";
import { Checkbox } from "#avenue/components/checkbox";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "#avenue/components/field";
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "#avenue/components/drawer";
import { Textarea } from "#avenue/components/textarea";

const meta = {
  title: "Components/Drawer",
  component: Drawer,
} satisfies Meta<typeof Drawer>;
export default meta;
type Story = StoryObj<typeof meta>;

const phone = { viewport: { value: "phone", isRotated: false } };
const categories = ["For sale", "Free", "Wanted", "Services", "Lost and found", "Events"];

function ListingFilters({
  side,
  defaultOpen = false,
  title = "Filter listings",
}: {
  side?: "bottom" | "right" | "left" | undefined;
  defaultOpen?: boolean;
  title?: string;
}) {
  return (
    <Drawer side={side ?? "bottom"} defaultOpen={defaultOpen}>
      <DrawerTrigger render={<Button variant="outline" />}>Filters</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>Show listings from Maple Hollow only.</DrawerDescription>
        </DrawerHeader>
        <DrawerBody>
          <FieldSet>
            <FieldLegend variant="label">Category</FieldLegend>
            <FieldGroup className="gap-3">
              {categories.map((category, index) => (
                <Field key={category} orientation="horizontal">
                  <Checkbox defaultChecked={index < 2} />
                  <FieldLabel>{category}</FieldLabel>
                </Field>
              ))}
            </FieldGroup>
          </FieldSet>
        </DrawerBody>
        <DrawerFooter>
          <DrawerClose render={<Button variant="outline" />}>Cancel</DrawerClose>
          <DrawerClose render={<Button />}>Show 12 listings</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

/** Measures the sheet against the screen edge it comes from, and its corners. */
async function expectSheetAgainst(side: "bottom" | "right" | "left", name: string) {
  const sheet = await screen.findByRole("dialog", { name });
  await expect(sheet).toHaveAttribute("aria-modal", "true");
  await waitFor(() => {
    const box = sheet.getBoundingClientRect();
    if (side === "bottom") expect(Math.round(box.bottom)).toBe(window.innerHeight);
    if (side === "right") expect(Math.round(box.right)).toBe(window.innerWidth);
    if (side === "left") expect(Math.round(box.left)).toBe(0);
  });
  const corners = getComputedStyle(sheet);
  if (side === "bottom") {
    await expect([corners.borderTopLeftRadius, corners.borderTopRightRadius]).toEqual(["14px", "14px"]);
    await expect([corners.borderBottomLeftRadius, corners.borderBottomRightRadius]).toEqual(["0px", "0px"]);
  } else {
    const inner = side === "right" ? corners.borderTopLeftRadius : corners.borderTopRightRadius;
    const outer = side === "right" ? corners.borderTopRightRadius : corners.borderTopLeftRadius;
    await expect([inner, outer]).toEqual(["14px", "0px"]);
  }
  return sheet;
}

/** Closed: only the trigger shows. */
export const Closed: Story = {
  globals: phone,
  render: () => <ListingFilters />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Filters" })).toHaveAttribute("aria-haspopup", "dialog");
    await expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  },
};

/**
 * Filters on a 390px phone: the sheet rests on the bottom edge, rounds only its top corners (14px) and shows the drag
 * handle. The Close button sits on the title's line, 16px from the edge.
 */
export const BottomOnPhone: Story = {
  globals: phone,
  render: () => <ListingFilters defaultOpen />,
  play: async () => {
    const sheet = await expectSheetAgainst("bottom", "Filter listings");
    const close = screen.getByRole("button", { name: "Close" }).getBoundingClientRect();
    const box = sheet.getBoundingClientRect();
    await expect(Math.round(box.right - close.right)).toBe(16);
    const title = screen.getByText("Filter listings", { selector: "h2" }).getBoundingClientRect();
    await expect(Math.round(title.top + title.height / 2)).toBe(Math.round(close.top + close.height / 2));
    const handle = sheet.querySelector<HTMLElement>("[data-slot=sheet-handle]")!.getBoundingClientRect();
    await expect([handle.width, handle.height]).toEqual([36, 4]);
  },
};

/** The same filters on a wide screen: a bottom sheet keeps a 512px measure, centred. */
export const BottomOnDesktop: Story = {
  render: () => <ListingFilters defaultOpen />,
  // A wide screen is the case, so the touch story-test project keeps its default viewport here, not the phone.
  parameters: { viewport: { disabled: true } },
  play: async () => {
    const sheet = await expectSheetAgainst("bottom", "Filter listings");
    await expect(Math.round(sheet.getBoundingClientRect().width)).toBe(512);
  },
};

/** A side sheet: full height, from the right, rounding only its inner edge. */
export const SideOnDesktop: Story = {
  render: () => <ListingFilters side="right" defaultOpen />,
  play: async () => {
    await expectSheetAgainst("right", "Filter listings");
    await expect(screen.getByRole("dialog").querySelector("[data-slot=sheet-handle]")).not.toBeVisible();
  },
};

/** A side sheet on a phone takes three quarters of the width, so the page behind still shows. */
export const SideOnPhone: Story = {
  globals: phone,
  render: () => <ListingFilters side="left" defaultOpen />,
  play: async () => {
    const sheet = await expectSheetAgainst("left", "Filter listings");
    await expect(Math.round(sheet.getBoundingClientRect().width)).toBe(Math.round(390 * 0.75));
  },
};

/** A long title wraps under the Close button's column; it never truncates or runs under the button. */
export const LongTitle: Story = {
  globals: phone,
  render: () => (
    <ListingFilters defaultOpen title="Filter the listings your neighbors posted in Maple Hollow this month" />
  ),
  play: async () => {
    const title = screen.getByText(/^Filter the listings/, { selector: "h2" });
    const box = title.getBoundingClientRect();
    await expect(box.height).toBeGreaterThan(24);
    await expect(title.scrollWidth).toBeLessThanOrEqual(title.clientWidth);
    const close = screen.getByRole("button", { name: "Close" }).getBoundingClientRect();
    await expect(box.right).toBeLessThanOrEqual(close.left);
  },
};

/** Keyboard: Enter opens it, focus moves in, Tab stays inside, Esc closes it and focus returns to the trigger. */
export const Keyboard: Story = {
  tags: ["agent"],
  globals: phone,
  render: () => <ListingFilters />,
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Filters" });
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    const sheet = await screen.findByRole("dialog", { name: "Filter listings" });
    await waitFor(() => expect(sheet.contains(document.activeElement)).toBe(true));
    for (let i = 0; i < 12; i += 1) {
      await userEvent.tab();
      await expect(sheet.contains(document.activeElement)).toBe(true);
    }
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await expect(trigger).toHaveFocus();
  },
};

function NewPost() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [confirming, setConfirming] = useState(false);
  const keep = useRef<HTMLButtonElement>(null);
  // The question appears where the actions were; focus moves to the safe answer, so a screen reader reads it.
  useEffect(() => {
    if (confirming) keep.current?.focus();
  }, [confirming]);
  return (
    <Drawer
      open={open}
      onOpenChange={(next, details) => {
        if (!next && text.trim() !== "" && details.returnValue !== "discard" && details.returnValue !== "post") {
          details.cancel();
          setConfirming(true);
          return;
        }
        setOpen(next);
        if (!next) {
          setText("");
          setConfirming(false);
        }
      }}
    >
      <DrawerTrigger render={<Button />}>New post</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>New post</DrawerTitle>
          <DrawerDescription>Neighbors in Maple Hollow see it on the wall.</DrawerDescription>
        </DrawerHeader>
        <Field>
          <FieldLabel>Post</FieldLabel>
          <Textarea value={text} onValueChange={(value) => setText(value)} rows={4} />
        </Field>
        {confirming && (
          <p id="discard-question" className="text-sm font-medium">
            Discard changes?
          </p>
        )}
        {confirming ? (
          <DrawerFooter>
            <Button ref={keep} variant="outline" aria-describedby="discard-question" onClick={() => setConfirming(false)}>
              Keep editing
            </Button>
            <DrawerClose
              value="discard"
              render={<Button variant="destructive" />}
              data-agent-confirm="Discards the unsent post"
            >
              Discard
            </DrawerClose>
          </DrawerFooter>
        ) : (
          <DrawerFooter>
            <DrawerClose render={<Button variant="outline" />}>Cancel</DrawerClose>
            <DrawerClose value="post" render={<Button />} disabled={text.trim() === ""}>
              Post
            </DrawerClose>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}

/**
 * Unsaved changes: while the post has text, every way of closing (Esc, the backdrop, a swipe, the Close button) is
 * held, and the sheet asks "Discard changes?" in place of its actions, with focus on Keep editing, the safe answer.
 * Keep editing goes back to the text; Discard closes the sheet and focus returns to the trigger.
 */
export const UnsavedChanges: Story = {
  tags: ["agent"],
  globals: phone,
  render: () => <NewPost />,
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "New post" });
    await userEvent.click(trigger);
    const sheet = await screen.findByRole("dialog", { name: "New post" });
    await userEvent.click(screen.getByRole("textbox", { name: "Post" }));
    await userEvent.keyboard("Spare ladder, free to a good home");

    await userEvent.keyboard("{Escape}");
    await expect(sheet).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Keep editing" })).toHaveFocus());
    await expect(screen.getByRole("button", { name: "Keep editing" })).toHaveAccessibleDescription("Discard changes?");

    await userEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    await expect(screen.getByRole("textbox", { name: "Post" })).toHaveValue("Spare ladder, free to a good home");

    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    await expect(sheet).toBeInTheDocument();
    const discard = await screen.findByRole("button", { name: "Discard" });
    await userEvent.click(discard);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await expect(trigger).toHaveFocus();
  },
};
