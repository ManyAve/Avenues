import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";
import { Button } from "#avenue/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "#avenue/components/card";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "#avenue/components/dialog";
import { Field, FieldContent, FieldDescription, FieldLabel } from "#avenue/components/field";
import { SectionCard, SectionCardTitle } from "#avenue/components/section-card";
import { Switch } from "#avenue/components/switch";
import { Well } from "#avenue/components/well";

// AVE-211: related settings grouped in a soft well instead of an outlined box, and corners that nest. All names and
// settings are fictional.

const meta = {
  title: "Components/Well",
  component: Well,
  decorators: [(Story) => <div className="max-w-md p-inset">{Story()}</div>],
} satisfies Meta<typeof Well>;
export default meta;
type Story = StoryObj<typeof meta>;

const px = (el: Element, prop: string) => getComputedStyle(el).getPropertyValue(prop);

/** The settings a board member keeps for notices: three switch rows in one well, split by dividers. */
function NoticeSettings() {
  return (
    <Well>
      <Field orientation="horizontal">
        <FieldContent>
          <FieldLabel>Quiet hours</FieldLabel>
          <FieldDescription>No notices from 9 pm to 7 am.</FieldDescription>
        </FieldContent>
        <Switch defaultChecked />
      </Field>
      <Field orientation="horizontal">
        <FieldContent>
          <FieldLabel>Email digest</FieldLabel>
          <FieldDescription>One email each Monday with the week's requests.</FieldDescription>
        </FieldContent>
        <Switch />
      </Field>
      <Field orientation="horizontal">
        <FieldContent>
          <FieldLabel>Meeting reminders</FieldLabel>
          <FieldDescription>A day before each board meeting.</FieldDescription>
        </FieldContent>
        <Switch defaultChecked />
      </Field>
    </Well>
  );
}

/**
 * SectionCard rows inside a well: the card holds the section, the well groups its settings on the `fill` surface
 * with no outline, and dividers split the rows. The well's corner is lg (10px), nested inside the card's 14px.
 */
export const InASectionCard: Story = {
  tags: ["agent"],
  render: () => (
    <SectionCard>
      <CardHeader>
        <SectionCardTitle>Notices</SectionCardTitle>
      </CardHeader>
      <CardContent>
        <NoticeSettings />
      </CardContent>
    </SectionCard>
  ),
  play: async ({ canvas, canvasElement }) => {
    const well = canvasElement.querySelector("[data-slot=well]")!;
    const card = canvasElement.querySelector("[data-slot=card]")!;
    // A well groups; it doesn't outline: no border of its own, and a fill a step off the card's.
    await expect(px(well, "border-top-width")).toBe("0px");
    await expect(px(well, "background-color")).not.toBe(px(card, "background-color"));
    await expect(px(well, "border-top-left-radius")).toBe("10px");
    // Dividers between the rows, none below the last.
    const rows = [...well.children];
    await expect(rows.map((row) => px(row, "border-bottom-width"))).toEqual(["1px", "1px", "0px"]);

    // Every switch by keyboard: Space turns it over.
    for (const [name, before] of [
      ["Quiet hours", true],
      ["Email digest", false],
      ["Meeting reminders", true],
    ] as const) {
      const control = canvas.getByRole("switch", { name });
      control.focus();
      await userEvent.keyboard(" ");
      await waitFor(() => expect(control).toHaveAttribute("aria-checked", String(!before)));
    }
  },
};

/** One well, three places: on the page it keeps its own lg corner, in a card lg, in a small card xs (14 - 12 = 2). */
export const CornersNest: Story = {
  render: () => (
    <div className="flex flex-col gap-section">
      <Well data-where="page">
        <p>On the page: its own 10px corner.</p>
      </Well>
      <Card>
        <CardHeader>
          <CardTitle>In a card</CardTitle>
        </CardHeader>
        <CardContent>
          <Well data-where="card">
            <p>16px from a 14px corner: room for its own 10px.</p>
          </Well>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardHeader>
          <CardTitle>In a small card</CardTitle>
        </CardHeader>
        <CardContent>
          <Well data-where="small-card">
            <p>12px from a 14px corner: 2px left, so xs (4px).</p>
          </Well>
        </CardContent>
      </Card>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const radius = (where: string) =>
      px(canvasElement.querySelector(`[data-where=${where}]`)!, "border-top-left-radius");
    await expect([radius("page"), radius("card"), radius("small-card")]).toEqual(["10px", "10px", "4px"]);
  },
};

/** In a dialog (14px corner, 16px inset) the well keeps lg, as in a card. */
export const InADialog: Story = {
  render: () => (
    <Dialog defaultOpen>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Notice settings</DialogTitle>
        </DialogHeader>
        <NoticeSettings />
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  play: async () => {
    const dialog = await screen.findByRole("dialog", { name: "Notice settings" });
    const well = dialog.querySelector("[data-slot=well]")!;
    await expect(px(well, "border-top-left-radius")).toBe("10px");
    // Every switch by keyboard, then the close button.
    for (const control of within(dialog).getAllByRole("switch")) {
      const before = control.getAttribute("aria-checked");
      control.focus();
      await userEvent.keyboard(" ");
      await waitFor(() => expect(control).not.toHaveAttribute("aria-checked", before ?? ""));
    }
    within(dialog).getByRole("button", { name: "Close" }).focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
  },
};
