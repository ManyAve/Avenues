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
};

/**
 * The card header with an action (AVE-2 section 6, the year select in the Dues card): the sm control (28px, 8px
 * corner) sits on the title's line, centred on it, 16px from the card's top and right edges.
 * The select itself comes from AVE-7; this story uses a button with the same size.
 */
export const HeaderWithAction: Story = {
  render: () => (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Dues</CardTitle>
        <CardDescription>Account summary</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" aria-label="Year, 2026">
            2026
            <ChevronDownIcon aria-hidden />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-y-2 tabular-nums">
        <span className="text-muted-foreground">Assessed</span>
        <span className="text-right">$480.00</span>
        <span className="text-muted-foreground">Paid</span>
        <span className="text-right">$240.00</span>
        <span className="font-medium">Balance</span>
        <span className="text-right font-medium">$240.00</span>
      </CardContent>
    </Card>
  ),
  play: async ({ canvasElement, canvas }) => {
    const card = canvasElement.querySelector("[data-slot=card]")!.getBoundingClientRect();
    const action = canvas.getByRole("button", { name: "Year, 2026" }).getBoundingClientRect();
    const title = canvas.getByText("Dues").getBoundingClientRect();
    await expect(action.height).toBe(28);
    await expect(Math.round(action.top - card.top)).toBe(16);
    await expect(Math.round(card.right - action.right)).toBe(16);
    await expect(Math.round(title.top + title.height / 2)).toBe(Math.round(action.top + action.height / 2));
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
