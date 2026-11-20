import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChevronDownIcon } from "lucide-react";
import { expect } from "storybook/test";
import { Button } from "#avenue/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "#avenue/components/card";

const meta = {
  title: "Components/Card",
  component: Card,
  decorators: [(Story) => <div className="max-w-md p-inset">{Story()}</div>],
} satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Title, description, content and footer. 14px corner, 16px inset. */
export const Default: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Annual meeting</CardTitle>
        <CardDescription>Thursday, April 9, 7 pm, at the clubhouse.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Agenda: the 2026 budget, the pool resurfacing bid and two open board seats.</p>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="outline">Edit</Button>
        <Button>Send reminder</Button>
      </CardFooter>
    </Card>
  ),
  play: async ({ canvas }) => {
    // The title is text-compact, as on the app's screens (AVE-55): 16/24 on web, 14/20 at desktop scale.
    const title = getComputedStyle(canvas.getByText("Annual meeting"));
    const desktop = document.getElementById("avenue-desktop-scale") !== null;
    await expect([title.fontSize, title.lineHeight]).toEqual(desktop ? ["14px", "20px"] : ["16px", "24px"]);
  },
};

/**
 * The card header with an action: the agreed Dues layout from AVE-2 section 6 (Tokens/Radius, "A control in a
 * card's corner"). DUES on the left in uppercase meta; "Account summary ·" and an sm year select on the right, the
 * select 8px from its label, 16px from the card's top and right edges and centred on the header line.
 * The select itself comes from AVE-7; this story uses a button with the same size and corner.
 */
export const HeaderWithAction: Story = {
  render: () => (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="text-meta font-emphasis tracking-wide text-muted-foreground uppercase">Dues</CardTitle>
        <CardAction className="gap-group text-meta text-muted-foreground">
          <span>Account summary ·</span>
          <Button variant="outline" size="sm" className="pr-1" aria-label="Year, 2026">
            2026
            <ChevronDownIcon aria-hidden />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-compact">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Billed</span>
          <span className="font-mono tabular-nums">$240.00</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Paid</span>
          <span className="font-mono tabular-nums">$120.00</span>
        </div>
      </CardContent>
    </Card>
  ),
  play: async ({ canvasElement, canvas }) => {
    const card = canvasElement.querySelector("[data-slot=card]")!.getBoundingClientRect();
    const action = canvas.getByRole("button", { name: "Year, 2026" }).getBoundingClientRect();
    const label = canvas.getByText("Account summary ·").getBoundingClientRect();
    const title = canvas.getByText("Dues");
    const box = title.getBoundingClientRect();
    await expect(getComputedStyle(title).textTransform).toBe("uppercase");
    // The app's Dues title weight (AVE-57).
    await expect(getComputedStyle(title).fontWeight).toBe("550");
    await expect(action.height).toBe(28);
    await expect(Math.round(action.left - label.right)).toBe(8);
    await expect(Math.round(action.top - card.top)).toBe(16);
    await expect(Math.round(card.right - action.right)).toBe(16);
    await expect(Math.round(box.top + box.height / 2)).toBe(Math.round(action.top + action.height / 2));
  },
};

/** The small card: 12px inset, 14px title. */
export const Small: Story = {
  render: () => (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Open complaints</CardTitle>
        <CardDescription>2 need a reply this week.</CardDescription>
      </CardHeader>
      <CardContent>Fence height at 9 Juniper Court; parking on Sorrel Way.</CardContent>
    </Card>
  ),
};

/**
 * Every part takes `render` (AVE-136). Here the card is an `article` and its title an `h3`, so a screen reader
 * user can move between cards by heading. It looks exactly like Default: the classes and `data-slot` stay.
 */
export const AsHeading: Story = {
  render: () => (
    <Card render={<article />}>
      <CardHeader>
        {/* oxlint-disable-next-line jsx-a11y/heading-has-content -- a render element: CardTitle passes its children in. */}
        <CardTitle render={<h3 />}>Annual meeting</CardTitle>
        <CardDescription>Thursday, April 9, 7 pm, at the clubhouse.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Agenda: the 2026 budget, the pool resurfacing bid and two open board seats.</p>
      </CardContent>
    </Card>
  ),
  play: async ({ canvas }) => {
    const heading = canvas.getByRole("heading", { level: 3, name: "Annual meeting" });
    await expect(heading.tagName).toBe("H3");
    await expect(heading).toHaveAttribute("data-slot", "card-title");
    await expect(canvas.getByRole("article")).toHaveAttribute("data-slot", "card");
    // Same type as the div title in Default: the heading's own browser styles don't show through.
    const title = getComputedStyle(heading);
    const desktop = document.getElementById("avenue-desktop-scale") !== null;
    await expect([title.fontSize, title.lineHeight, title.fontWeight]).toEqual(
      desktop ? ["14px", "20px", "500"] : ["16px", "24px", "500"],
    );
  },
};
