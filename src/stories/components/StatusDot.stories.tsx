import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bell, MessageSquare } from "lucide-react";
import { expect } from "storybook/test";
import { Button } from "#avenue/components/button";
import { Chip, ChipRow } from "#avenue/components/chip";
import { Status, StatusDot, type StatusTone } from "#avenue/components/status";
import { Row, Rows } from "./story-kit";

const meta = {
  title: "Components/Status dot",
  component: StatusDot,
  args: { tone: "destructive" },
} satisfies Meta<typeof StatusDot>;
export default meta;
type Story = StoryObj<typeof meta>;

const tones: { tone: StatusTone; label: string }[] = [
  { tone: "success", label: "Paid" },
  { tone: "warning", label: "Owing" },
  { tone: "destructive", label: "Needs attention" },
  { tone: "primary", label: "In progress" },
  { tone: "info", label: "Scheduled" },
  { tone: "neutral", label: "Closed" },
];

const dots = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>("[data-slot=status-dot]")];

/**
 * Every tone in both sizes, beside the Status pill of the same tone: the dot is Status's own, so the two always
 * match. `current` takes the colour of the text around it.
 */
export const Tones: Story = {
  render: () => (
    <Rows>
      <Row label="sm (6px)">
        {tones.map(({ tone }) => (
          <StatusDot key={tone} tone={tone} />
        ))}
      </Row>
      <Row label="md (8px)">
        {tones.map(({ tone }) => (
          <StatusDot key={tone} tone={tone} size="md" />
        ))}
      </Row>
      <Row label="current">
        <span className="inline-flex items-center gap-1 text-meta text-success-subtle-foreground">
          <StatusDot tone="current" /> Now
        </span>
        <span className="inline-flex items-center gap-1 text-meta text-muted-foreground">
          <StatusDot tone="current" size="md" /> Yesterday
        </span>
      </Row>
      <Row label="Status">
        {tones.map(({ tone, label }) => (
          <Status key={tone} tone={tone}>
            {label}
          </Status>
        ))}
      </Row>
    </Rows>
  ),
  play: async ({ canvasElement }) => {
    const all = dots(canvasElement);
    await expect(all).toHaveLength(tones.length * 3 + 2);
    for (const dot of all) {
      // Hidden from screen readers: the words beside it carry the meaning.
      await expect(dot).toHaveAttribute("aria-hidden", "true");
      await expect(dot.tabIndex).toBe(-1);
      const { width, height } = dot.getBoundingClientRect();
      await expect(width).toBe(height);
      await expect([6, 8]).toContain(width);
    }
    // A loose dot and the one inside the Status pill of the same tone are the same colour.
    for (const { tone } of tones) {
      const [loose] = dots(canvasElement).filter((d) => d.dataset.tone === tone && !d.closest("[data-slot=status]"));
      const inPill = canvasElement.querySelector<HTMLElement>(`[data-slot=status][data-tone=${tone}] [data-slot=status-dot]`);
      await expect(inPill).not.toBeNull();
      await expect(getComputedStyle(loose!).backgroundColor).toBe(getComputedStyle(inPill!).backgroundColor);
    }
    // `current` follows the text colour.
    const now = canvasElement.querySelector<HTMLElement>("[data-tone=current]")!;
    await expect(getComputedStyle(now).backgroundColor).toBe(getComputedStyle(now.parentElement!).color);
  },
};

/**
 * Over an icon, with `ring`: a 2px halo in the page colour keeps the dot apart from the icon's strokes. On the left
 * the button's own name says it all, so the dot is hidden; on the right the dot is the only sign of something new,
 * so it carries a `label` that screen readers read as part of the button's name.
 */
export const OverAnIcon: Story = {
  render: () => (
    <Rows>
      <Row label="ring">
        <Button variant="ghost" size="icon">
          <Bell aria-hidden />
          <span className="sr-only">Notifications</span>
          <StatusDot tone="destructive" ring className="absolute top-2 right-2" />
        </Button>
        <Button variant="ghost" size="icon">
          <MessageSquare aria-hidden />
          <span className="sr-only">Messages</span>
          <StatusDot tone="primary" size="md" ring label="unread" className="absolute top-1 right-1" />
        </Button>
      </Row>
    </Rows>
  ),
  play: async ({ canvas, canvasElement }) => {
    // Unlabelled: the dot adds nothing to the name.
    await expect(canvas.getByRole("button", { name: "Notifications" })).toBeVisible();
    // Labelled: the dot is read.
    const messages = canvas.getByRole("button", { name: /^Messages ?unread$/ });
    await expect(messages).toBeVisible();
    const labelled = messages.querySelector<HTMLElement>("[data-slot=status-dot]")!;
    await expect(labelled).not.toHaveAttribute("aria-hidden");
    await expect(labelled.tabIndex).toBe(-1);
    // The text is visually hidden: the dot stays 8px.
    await expect(labelled.getBoundingClientRect().width).toBe(8);
    // The halo is the page colour.
    for (const dot of dots(canvasElement)) {
      await expect(getComputedStyle(dot).boxShadow).not.toBe("none");
    }
  },
};

/** In a filter chip, as on an announcement's delivery chips: the chip's words carry the meaning. */
export const InAChip: Story = {
  render: () => (
    <ChipRow aria-label="Delivery">
      <Chip>
        <StatusDot tone="success" /> Delivered
      </Chip>
      <Chip>
        <StatusDot tone="info" /> Sending
      </Chip>
      <Chip defaultPressed>
        <StatusDot tone="destructive" /> Failed
      </Chip>
    </ChipRow>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Delivered" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Failed" })).toHaveAttribute("aria-pressed", "true");
  },
};

/** The same dots on a 390px phone. */
export const Phone: Story = {
  ...OverAnIcon,
  globals: { viewport: { value: "phone" } },
};
