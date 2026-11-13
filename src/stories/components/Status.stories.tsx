import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor } from "storybook/test";
import { Count, Status, type StatusTone } from "#avenue/components/status";
import { Row, Rows } from "./story-kit";

const queryTip = () => document.querySelector<HTMLElement>("[data-slot=tooltip-content]:not([hidden])");
const findTip = () => waitFor(() => queryTip() ?? Promise.reject(new Error("tooltip not open")));

const meta = {
  title: "Components/Status",
  component: Status,
} satisfies Meta<typeof Status>;
export default meta;
type Story = StoryObj<typeof meta>;

const tones: { tone: StatusTone; label: string }[] = [
  { tone: "success", label: "Paid" },
  { tone: "warning", label: "Owing" },
  { tone: "primary", label: "In progress" },
  { tone: "info", label: "Scheduled" },
  { tone: "neutral", label: "Closed" },
];

/** Each tone outlined with a dot, and filled (the complaints register). The words carry the meaning; the colour repeats it. */
export const Tones: Story = {
  args: { tone: "success" },
  render: () => (
    <Rows>
      <Row label="outline">
        {tones.map(({ tone, label }) => (
          <Status key={tone} tone={tone}>
            {label}
          </Status>
        ))}
      </Row>
      <Row label="filled">
        {tones.map(({ tone, label }) => (
          <Status key={tone} tone={tone} filled>
            {label}
          </Status>
        ))}
      </Row>
    </Rows>
  ),
  play: async ({ canvas }) => {
    for (const { label } of tones) {
      for (const pill of canvas.getAllByText(label)) {
        await expect(pill).toBeVisible();
        // Outline and filled are both 20px labels (AVE-2).
        await expect(pill.getBoundingClientRect().height).toBe(20);
      }
    }
  },
};

/** Help opens on hover, keyboard focus and tap, from a help button beside the label, never from the label alone. */
export const WithHelp: Story = {
  tags: ["agent"],
  args: { tone: "warning" },
  render: () => (
    <Rows>
      <Row label="help">
        <Status tone="warning" help="Dues were not paid by the due date, March 1.">
          Past due
        </Status>
        <Status tone="info" filled help="A board member will reply within two days.">
          Waiting on board
        </Status>
      </Row>
    </Rows>
  ),
  play: async ({ canvas }) => {
    const help = canvas.getByRole("button", { name: "About Past due" });
    await expect(canvas.getByText("Past due")).toBeVisible();
    await userEvent.tab();
    await expect(help).toHaveFocus();
    await expect(await findTip()).toHaveTextContent("Dues were not paid by the due date, March 1.");
    await expect(help).toHaveAccessibleDescription("Dues were not paid by the due date, March 1.");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(queryTip()).toBeNull());
    await userEvent.click(help);
    // The tip fades in from opacity 0 (data-starting-style), so wait for it to finish rather than check once.
    await waitFor(async () => expect(await findTip()).toBeVisible());
    await userEvent.click(help);
    await waitFor(() => expect(queryTip()).toBeNull());
    await expect(canvas.getByRole("button", { name: "About Waiting on board" })).toBeVisible();
  },
};

/** Count: a small muted number beside a label, as in the nav tabs and filter chips. */
export const Counts: Story = {
  args: { tone: "neutral" },
  render: () => (
    <Rows>
      <Row label="beside a label">
        <span className="inline-flex items-center gap-1">
          Households <Count value={24} />
        </span>
        <span className="inline-flex items-center gap-1">
          Complaints <Count value={0} />
        </span>
        <span className="inline-flex items-center gap-1">
          Documents <Count value={1280} />
        </span>
      </Row>
    </Rows>
  ),
};
