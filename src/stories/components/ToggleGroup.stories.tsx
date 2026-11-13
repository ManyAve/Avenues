import type { Meta, StoryObj } from "@storybook/react-vite";
import { CodeIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { expect, userEvent } from "storybook/test";
import { ToggleGroup, ToggleGroupItem } from "#avenue/components/toggle-group";
import { Row, Rows } from "./story-kit";

const meta = {
  title: "Components/Toggle group",
  component: ToggleGroup,
} satisfies Meta<typeof ToggleGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

const densities = ["Compact", "Comfortable", "Roomy"];

/** Spaced (8px apart) and joined (`spacing={0}`), in each size. Joined groups take the size's outer corner. */
export const Variants: Story = {
  render: () => (
    <Rows>
      {(["sm", "default", "lg"] as const).map((size) => (
        <Row key={size} label={`outline, ${size}`}>
          <ToggleGroup variant="outline" size={size} defaultValue="Comfortable" aria-label={`Row height ${size}`}>
            {densities.map((d) => (
              <ToggleGroupItem key={d} value={d}>
                {d}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <ToggleGroup
            variant="outline"
            size={size}
            spacing={0}
            defaultValue="light"
            aria-label={`Theme ${size}`}
          >
            <ToggleGroupItem value="light" aria-label="Light">
              <SunIcon aria-hidden />
            </ToggleGroupItem>
            <ToggleGroupItem value="dark" aria-label="Dark">
              <MoonIcon aria-hidden />
            </ToggleGroupItem>
            <ToggleGroupItem value="system" aria-label="Match system">
              <MonitorIcon aria-hidden />
            </ToggleGroupItem>
          </ToggleGroup>
        </Row>
      ))}
      <Row label="multiple">
        <ToggleGroup multiple variant="outline" size="sm" spacing={0} aria-label="Developer mode">
          <ToggleGroupItem value="dev">
            <CodeIcon aria-hidden data-icon="inline-start" />
            Dev
          </ToggleGroupItem>
        </ToggleGroup>
      </Row>
      <Row label="vertical">
        <ToggleGroup variant="outline" orientation="vertical" defaultValue="print" aria-label="Mailing mode">
          <ToggleGroupItem value="print">Print and mail</ToggleGroupItem>
          <ToggleGroupItem value="email">Email only</ToggleGroupItem>
        </ToggleGroup>
      </Row>
      <Row label="disabled">
        <ToggleGroup variant="outline" disabled defaultValue="Compact" aria-label="Row height disabled">
          {densities.map((d) => (
            <ToggleGroupItem key={d} value={d}>
              {d}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Row>
    </Rows>
  ),
};

/**
 * A single-choice group is a radio group: one Tab stop that lands on the chosen item, and the arrow keys move and
 * select together, wrapping at the ends.
 */
export const Keyboard: Story = {
  tags: ["agent"],
  render: () => (
    <Rows>
      <button type="button">Before the group</button>
      <ToggleGroup variant="outline" size="sm" defaultValue="Comfortable" aria-label="Row height">
        {densities.map((d) => (
          <ToggleGroupItem key={d} value={d}>
            {d}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <button type="button">After the group</button>
    </Rows>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("radiogroup", { name: "Row height" })).toBeInTheDocument();
    const [compact, comfortable, roomy] = densities.map((d) => canvas.getByRole("radio", { name: d }));
    await userEvent.click(canvas.getByRole("button", { name: "Before the group" }));
    await userEvent.tab();
    await expect(comfortable).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(roomy).toHaveFocus();
    await expect(roomy).toBeChecked();
    await expect(comfortable).not.toBeChecked();
    await userEvent.keyboard("{ArrowRight}");
    await expect(compact).toHaveFocus();
    await expect(compact).toBeChecked();
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "After the group" })).toHaveFocus();
  },
};

/** Independent on/off items (`multiple`): one Tab stop, arrows move, Space or Enter presses without moving others. */
export const KeyboardMultiple: Story = {
  render: () => (
    <Rows>
      <ToggleGroup multiple variant="outline" size="sm" defaultValue={["unpaid"]} aria-label="Show">
        <ToggleGroupItem value="unpaid">Unpaid</ToggleGroupItem>
        <ToggleGroupItem value="archived">Archived</ToggleGroupItem>
      </ToggleGroup>
      <button type="button">After the group</button>
    </Rows>
  ),
  play: async ({ canvas }) => {
    const unpaid = canvas.getByRole("button", { name: "Unpaid" });
    const archived = canvas.getByRole("button", { name: "Archived" });
    await userEvent.tab();
    await expect(unpaid).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(archived).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect(archived).toHaveAttribute("aria-pressed", "true");
    await expect(unpaid).toHaveAttribute("aria-pressed", "true");
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "After the group" })).toHaveFocus();
  },
};

const categories = ["News", "For sale", "Events"];

/**
 * A segmented control on a 390px phone (AVE-33): choosing a post's category in the composer. Built the way
 * Management builds its full-width single-choice groups (row height in DisplayOptions, mailing mode in lob-mail, at
 * a547a7e): spaced 8px apart, full width with equal-width items, and the chosen item drawn with a `primary` border
 * and the `primary-subtle` fill, the same chosen look as a choice card: `variant="choice"` (AVE-37). `md` 32px tall. Labels never truncate; past
 * three or four short labels, use Tabs or a Select instead. Same radio-group keys as on desktop.
 */
export const Phone: Story = {
  render: () => (
    <div className="w-[390px] bg-background p-inset" data-width="390">
      <ToggleGroup variant="choice" defaultValue="News" aria-label="Post category" className="w-full">
        {categories.map((c) => (
          <ToggleGroupItem key={c} value={c} className="flex-1 basis-0">
            {c}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  ),
  play: async ({ canvas }) => {
    const items = categories.map((c) => canvas.getByRole("radio", { name: c }));
    const widths = items.map((item) => item.getBoundingClientRect().width);
    // Full width of the phone's content box (390 less 16px each side, less two gaps), split evenly; no label is cut.
    // The gap is 8px with a mouse and 16px on a touch screen, so neighbouring 44px tap areas don't overlap (AVE-22).
    const gap = matchMedia("(pointer: coarse)").matches ? 16 : 8;
    await expect(Math.round(widths.reduce((a, b) => a + b, 0))).toBe(390 - 32 - 2 * gap);
    await expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(1);
    for (const item of items) await expect(item.scrollWidth).toBeLessThanOrEqual(item.clientWidth);
    await userEvent.tab();
    await expect(items[0]).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(items[1]).toHaveFocus();
    await expect(items[1]).toBeChecked();
  },
};
