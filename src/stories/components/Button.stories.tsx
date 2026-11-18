import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowRightIcon, DownloadIcon, PlusIcon, Settings2Icon } from "lucide-react";
import { expect, fn, userEvent } from "storybook/test";
import { Button } from "#avenue/components/button";
import { Row, Rows } from "./story-kit";

const variants = ["default", "outline", "secondary", "ghost", "destructive", "link", "text"] as const;
const sizes = ["xs", "sm", "md", "lg"] as const;
const iconSizes = ["icon-xs", "icon-sm", "icon-md", "icon-lg"] as const;

const meta = {
  title: "Components/Button",
  component: Button,
  args: { children: "Record payment", onClick: fn() },
  argTypes: {
    variant: { control: "radio", options: variants },
    size: { control: "radio", options: [...sizes, ...iconSizes] },
  },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

/** One button; use the controls to try each variant and size. */
export const Playground: Story = {
  play: async ({ canvas, args }) => {
    const button = canvas.getByRole("button", { name: "Record payment" });
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};

/** Every variant at the default size, md (32px, 10px corner). `text` is the inline text action. */
export const Variants: Story = {
  render: () => (
    <Rows>
      {variants.map((variant) => (
        <Row key={variant} label={variant}>
          <Button variant={variant}>Record payment</Button>
          <Button variant={variant}>
            <PlusIcon aria-hidden data-icon="inline-start" />
            New household
          </Button>
          <Button variant={variant} disabled>
            Disabled
          </Button>
        </Row>
      ))}
    </Rows>
  ),
};

/**
 * Every variant on a card, where most buttons sit (AVE-99). In dark the page is darker than a card, so an outline
 * button takes the card's own surface, never the page's: it must not read as a hole in the card.
 */
export const VariantsOnACard: Story = {
  render: () => (
    <div data-testid="card" className="m-inset rounded-xl bg-card p-inset text-card-foreground ring-1 ring-foreground/10">
      <Rows>
        {variants.map((variant) => (
          <Row key={variant} label={variant}>
            <Button variant={variant}>Record payment</Button>
            <Button variant={variant}>
              <PlusIcon aria-hidden data-icon="inline-start" />
              Add another person
            </Button>
          </Row>
        ))}
      </Rows>
    </div>
  ),
  play: async ({ canvas }) => {
    const card = getComputedStyle(canvas.getByTestId("card")).backgroundColor;
    const outline = canvas.getAllByRole("button", { name: "Record payment" })[variants.indexOf("outline")]!;
    await expect(getComputedStyle(outline).backgroundColor).toBe(card);
  },
};

/** AVE-2 heights: xs 24 and sm 28 with an 8px corner, md 32 and lg 40 with a 10px corner. Icon buttons match. */
export const Sizes: Story = {
  render: () => (
    <Rows>
      {sizes.map((size, i) => (
        <Row key={size} label={size}>
          <Button size={size}>Save</Button>
          <Button size={size} variant="outline">
            <DownloadIcon aria-hidden data-icon="inline-start" />
            Export
          </Button>
          <Button size={size} variant="outline">
            Next
            <ArrowRightIcon aria-hidden data-icon="inline-end" />
          </Button>
          <Button size={iconSizes[i]} variant="outline" aria-label="Display options">
            <Settings2Icon aria-hidden />
          </Button>
        </Row>
      ))}
    </Rows>
  ),
  play: async ({ canvas }) => {
    // On a phone (the touch story-test project) xs is 28px, so 28 + the 16px controls gap reaches 44 (AVE-22).
    const xs = matchMedia("(pointer: coarse)").matches ? 28 : 24;
    const heights = canvas.getAllByRole("button", { name: "Save" }).map((b) => b.getBoundingClientRect().height);
    await expect(heights).toEqual([xs, 28, 32, 40]);
    const icons = canvas.getAllByRole("button", { name: "Display options" }).map((b) => b.getBoundingClientRect().width);
    await expect(icons).toEqual([xs, 28, 32, 40]);
  },
};

/** Hover, keyboard focus, pressed menu trigger (aria-expanded), invalid and disabled. */
export const States: Story = {
  render: () => (
    <Rows>
      <Row label="focus (Tab)">
        <Button variant="outline">Focus me</Button>
        <Button>Focus me</Button>
      </Row>
      <Row label="expanded">
        <Button variant="outline" aria-expanded="true">
          Group
        </Button>
        <Button variant="ghost" aria-expanded="true">
          Sort
        </Button>
      </Row>
      <Row label="invalid">
        <Button variant="outline" aria-invalid="true">
          Choose a file
        </Button>
      </Row>
      <Row label="disabled">
        <Button disabled>Send notice</Button>
        <Button variant="outline" disabled>
          Export
        </Button>
      </Row>
    </Rows>
  ),
  play: async ({ canvas }) => {
    await userEvent.tab();
    await expect(canvas.getAllByRole("button", { name: "Focus me" })[0]).toHaveFocus();
    await expect(canvas.getByRole("button", { name: "Send notice" })).toBeDisabled();
  },
};

/**
 * A disabled action that says why (UX.md: one muted line under it). The button stays in the Tab order and reads its
 * reason, so keyboard and screen-reader users learn it too; touch users see the line. Replaces title tooltips.
 */
export const DisabledWithReason: Story = {
  tags: ["agent"],
  args: { onClick: fn() },
  render: (args) => (
    <Rows>
      <Button {...args} disabledReason="Only a board admin can send a live notice. You can send a practice notice.">
        Send live notice
      </Button>
      <Button variant="outline">Send practice notice</Button>
    </Rows>
  ),
  play: async ({ canvas, args }) => {
    const button = canvas.getByRole("button", { name: "Send live notice" });
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await expect(button).toHaveAttribute("aria-disabled", "true");
    await expect(button).toHaveAccessibleDescription(
      "Only a board admin can send a live notice. You can send a practice notice.",
    );
    await userEvent.keyboard("{Enter}");
    await userEvent.click(button);
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

/** The inline text action in running text (the app's `textAction`), with a focus ring and a taller hit area. */
export const TextAction: Story = {
  render: () => (
    <p className="max-w-md p-inset text-sm">
      No owner on file for 14 Larkspur Lane.{" "}
      <Button variant="text" onClick={() => {}}>
        Add an owner
      </Button>{" "}
      to send dues notices.
    </p>
  ),
  play: async ({ canvas }) => {
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "Add an owner" })).toHaveFocus();
  },
};
