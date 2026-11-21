import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Card, CardContent } from "#avenue/components/card";
import { Money } from "#avenue/components/money";
import { Stat, StatLabel, StatUnit, StatValue } from "#avenue/components/stat";
import { Rows } from "./story-kit";

const meta = {
  title: "Components/Stat",
  component: Stat,
} satisfies Meta<typeof Stat>;
export default meta;
type Story = StoryObj<typeof meta>;

/** A board's key numbers in a row: a money figure through Money, a count with a unit beside it, and a plain count. */
export const Default: Story = {
  render: () => (
    <Rows>
      <div className="flex flex-wrap gap-x-10 gap-y-6">
        <Stat>
          <StatValue>
            <Money cents={428000} />
          </StatValue>
          <StatLabel>collected this year</StatLabel>
        </Stat>
        <Stat>
          <StatValue>
            34 <StatUnit>of 52</StatUnit>
          </StatValue>
          <StatLabel>households paid</StatLabel>
        </Stat>
        <Stat>
          <StatValue>3</StatValue>
          <StatLabel>open requests</StatLabel>
        </Stat>
      </div>
    </Rows>
  ),
  play: async ({ canvas, canvasElement }) => {
    const money = canvasElement.querySelector<HTMLElement>("[data-slot=stat] [data-slot=money]");
    await expect(money).toHaveTextContent("$4,280.00");
    // The figure draws in the text face (font-sans, as the page does), not Money's mono; its tabular digits stay.
    const style = getComputedStyle(money!);
    await expect(style.fontFamily).toBe(getComputedStyle(document.body).fontFamily);
    await expect(style.fontVariantNumeric).toContain("tabular-nums");
    // Reading order: the figure, then what it counts.
    const stat = canvas.getByText("households paid").closest("[data-slot=stat]")!;
    await expect(stat).toHaveTextContent(/^34 of 52households paid$/);
    const unit = canvas.getByText("of 52");
    await expect(parseFloat(getComputedStyle(unit).fontSize)).toBeLessThan(
      parseFloat(getComputedStyle(unit.parentElement!).fontSize),
    );
  },
};

/** A credit or debt keeps its sign and its spoken word: a figure is never heard as the opposite. */
export const SignedMoney: Story = {
  render: () => (
    <Rows>
      <div className="flex flex-wrap gap-x-10 gap-y-6">
        <Stat>
          <StatValue>
            <Money cents={-12000} />
          </StatValue>
          <StatLabel>balance</StatLabel>
        </Stat>
        <Stat>
          <StatValue>
            <Money cents={2500} signed />
          </StatValue>
          <StatLabel>credit on file</StatLabel>
        </Stat>
        <Stat>
          <StatValue>
            <Money cents={null} />
          </StatValue>
          <StatLabel>last payment</StatLabel>
        </Stat>
      </div>
    </Rows>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText("-$120.00")).toBeVisible();
    await expect(canvas.getByText("minus $120.00")).toHaveClass("sr-only");
    await expect(canvas.getByText("plus $25.00")).toHaveClass("sr-only");
    await expect(canvas.getByText("No amount")).toBeInTheDocument();
  },
};

/** A page's hero figure: `size="lg"` is text-hero from the small breakpoint up, text-display on phones. */
export const Hero: Story = {
  render: () => (
    <Rows>
      <Stat size="lg">
        <StatValue>
          <Money cents={1284060} />
        </StatValue>
        <StatLabel>collected of $18,200.00 billed</StatLabel>
      </Stat>
    </Rows>
  ),
  play: async ({ canvasElement }) => {
    const value = canvasElement.querySelector<HTMLElement>("[data-slot=stat-value]")!;
    const px = parseFloat(getComputedStyle(value).fontSize);
    const wide = window.matchMedia("(min-width: 40rem)").matches;
    await expect(px).toBe(wide ? 48 : 32);
  },
};

/** On a phone the hero figure steps down to text-display. */
export const HeroOnAPhone: Story = {
  ...Hero,
  globals: { viewport: { value: "phone", isRotated: false } },
};

/** Stats heading cards in a grid, the way a dashboard leads. */
export const InCards: Story = {
  render: () => (
    <div className="grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
      {[
        { value: <Money cents={428000} />, label: "collected" },
        { value: <>34 <StatUnit>of 52</StatUnit></>, label: "households paid" },
        { value: "3", label: "open requests" },
      ].map((s) => (
        <Card key={s.label}>
          <CardContent>
            <Stat>
              <StatValue>{s.value}</StatValue>
              <StatLabel>{s.label}</StatLabel>
            </Stat>
          </CardContent>
        </Card>
      ))}
    </div>
  ),
};
