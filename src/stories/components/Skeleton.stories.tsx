import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor } from "storybook/test";
import { Card, CardContent, CardHeader } from "#avenue/components/card";
import { Loading, Skeleton, SkeletonText } from "#avenue/components/skeleton";

// AVE-128. Placeholder shapes while a card or page loads. The app decides when to show them: after about 300ms, so
// a fast load doesn't flash, and at the real layout's size, so nothing jumps when the content arrives.

const meta = {
  title: "Components/Skeleton",
  component: Skeleton,
} satisfies Meta<typeof Skeleton>;
export default meta;
type Story = StoryObj<typeof meta>;

type Canvas = Parameters<NonNullable<Story["play"]>>[0]["canvas"];

/** The colour of the nearest surface behind an element: the first ancestor that paints a background. */
function surfaceUnder(el: HTMLElement) {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const colour = getComputedStyle(node).backgroundColor;
    if (colour !== "rgba(0, 0, 0, 0)" && colour !== "transparent") return colour;
  }
  return getComputedStyle(document.body).backgroundColor;
}

/**
 * What every loading story proves: one polite status per region, read once ("Loading <label>"), the region marked
 * busy, every shape hidden from screen readers, and nothing inside it to Tab to.
 */
async function expectLoading(canvas: Canvas, labels: string[]) {
  await waitFor(() =>
    expect(canvas.getAllByRole("status").map((status) => status.textContent)).toEqual(labels.map((l) => `Loading ${l}`)),
  );
  const regions = [...document.querySelectorAll<HTMLElement>("[data-slot=loading]")];
  await expect(regions).toHaveLength(labels.length);
  for (const region of regions) await expect(region).toHaveAttribute("aria-busy", "true");
  const shapes = document.querySelectorAll<HTMLElement>("[data-slot=skeleton]");
  await expect(shapes.length).toBeGreaterThan(0);
  for (const shape of shapes) {
    await expect(shape.closest("[aria-hidden=true]")).not.toBeNull();
    await expect(shape.getBoundingClientRect().height).toBeGreaterThan(0);
    // Seen on whatever it sits on: the page or a card, light or dark (muted is the dark card's own colour).
    await expect(getComputedStyle(shape).backgroundColor).not.toBe(surfaceUnder(shape));
  }
  // Nothing in a region is in the accessibility tree, so a screen reader hears only the status.
  for (const region of regions) {
    const exposed = [...region.querySelectorAll<HTMLElement>("*")].filter((el) => !el.closest("[aria-hidden=true]"));
    await expect(exposed.filter((el) => !["DIV", "SPAN"].includes(el.tagName) || el.hasAttribute("role"))).toEqual([]);
    await expect(region.textContent).toBe("");
  }
  await userEvent.tab();
  for (const region of regions) await expect(region.contains(document.activeElement)).toBe(false);
}

const sizes = [
  { name: "meta", className: "text-meta", text: "Due March 1" },
  { name: "compact", className: "text-compact", text: "14 Elm Street" },
  { name: "title", className: "text-title", text: "Dues for 2027" },
  { name: "heading", className: "text-heading", text: "Households" },
] as const;

/**
 * One line per text step, beside the text it stands for: a `shape="text"` line is as tall as that step's line in
 * both type scales, so a loaded line takes its place without moving anything. `SkeletonText` is a paragraph.
 */
export const TextLines: Story = {
  render: () => (
    <div className="grid max-w-lg grid-cols-2 items-start gap-4 p-inset">
      {/* The loaded text, outside the region, to measure against. */}
      <div className="flex flex-col gap-4">
        {sizes.map((size) => (
          <p key={size.name} data-testid={`text-${size.name}`} className={size.className}>
            {size.text}
          </p>
        ))}
      </div>
      <Loading label="text" className="flex flex-col gap-4">
        {sizes.map((size) => (
          <Skeleton key={size.name} data-testid={`line-${size.name}`} shape="text" className={`${size.className} w-32`} />
        ))}
      </Loading>
      <Loading label="the notice" className="col-span-2">
        <SkeletonText lines={3} className="text-compact" />
      </Loading>
    </div>
  ),
  play: async ({ canvas }) => {
    await expectLoading(canvas, ["text", "the notice"]);
    for (const size of sizes) {
      const text = canvas.getByTestId(`text-${size.name}`).getBoundingClientRect();
      const line = document.querySelector<HTMLElement>(`[data-testid=line-${size.name}]`)!;
      await expect(line.getBoundingClientRect().height).toBeCloseTo(text.height, 1);
      await expect(line.getBoundingClientRect().top).toBeCloseTo(text.top, 1);
      // The visible bar is the font size, centred in the line, so it reads as a line of text, not a box.
      const style = getComputedStyle(line);
      await expect(style.backgroundClip).toBe("content-box");
      await expect(Number.parseFloat(style.height) - Number.parseFloat(style.paddingTop) * 2).toBeCloseTo(
        Number.parseFloat(style.fontSize),
        1,
      );
    }
    const paragraph = document.querySelectorAll<HTMLElement>("[data-slot=skeleton-text] > [data-slot=skeleton]");
    await expect(paragraph).toHaveLength(3);
    const [first, , last] = [...paragraph].map((l) => l.getBoundingClientRect());
    await expect(last!.width).toBeLessThan(first!.width);
    await expect(last!.top - first!.top).toBeCloseTo(first!.height * 2, 1);
  },
};

/** A card loading: the title line, two lines of detail and a block where the figure goes. */
export const InACard: Story = {
  render: () => (
    <div className="max-w-sm p-inset">
      <Card>
        <Loading label="the dues card" className="flex flex-col gap-(--card-spacing)">
          <CardHeader>
            <Skeleton shape="text" className="w-28 text-compact" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Skeleton className="h-9 w-32" />
            <SkeletonText lines={2} className="text-meta" />
          </CardContent>
        </Loading>
      </Card>
    </div>
  ),
  play: async ({ canvas }) => {
    await expectLoading(canvas, ["the dues card"]);
    const card = document.querySelector<HTMLElement>("[data-slot=card]")!;
    for (const shape of card.querySelectorAll<HTMLElement>("[data-slot=skeleton]")) {
      // Inside a card nothing is rounder than the card (AVE-2): lines rounded-sm, blocks rounded-md.
      const radius = Number.parseFloat(getComputedStyle(shape).borderTopLeftRadius);
      await expect(radius).toBeLessThan(Number.parseFloat(getComputedStyle(card).borderTopLeftRadius));
    }
  },
};

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-row-y">
      <Skeleton shape="circle" className="size-8" />
      <div className="flex min-w-0 flex-1 flex-col">
        <Skeleton shape="text" className="w-40 max-w-full text-compact" />
        <Skeleton shape="text" className="w-24 text-meta" />
      </div>
    </div>
  );
}

/** A list of people loading: a round avatar and two lines (name, then household), the shape the loaded row has. */
export const ListRows: Story = {
  render: () => (
    <div className="max-w-md p-inset">
      {/* Not a list while it loads: a list of empty items would be read as "list, 3 items". */}
      <Loading label="neighbors" className="flex flex-col divide-y">
        <RowSkeleton />
        <RowSkeleton />
        <RowSkeleton />
      </Loading>
    </div>
  ),
  play: async ({ canvas }) => {
    await expectLoading(canvas, ["neighbors"]);
    for (const avatar of document.querySelectorAll<HTMLElement>("[data-shape=circle]")) {
      const box = avatar.getBoundingClientRect();
      await expect(box.width).toBe(32);
      await expect(box.height).toBe(32);
      await expect(getComputedStyle(avatar).borderTopLeftRadius).not.toBe("0px");
    }
  },
};

function PageSkeleton() {
  return (
    <div className="flex max-w-layout flex-col gap-section px-page py-inset">
      <Loading label="households" className="flex flex-col gap-1">
        <Skeleton shape="text" className="w-48 text-heading" />
        <Skeleton shape="text" className="w-64 max-w-full text-meta" />
      </Loading>
      <div className="grid gap-group sm:grid-cols-2">
        {["the dues card", "the board card"].map((label) => (
          <Card key={label}>
            <Loading label={label} className="flex flex-col gap-(--card-spacing)">
              <CardHeader>
                <Skeleton shape="text" className="w-28 text-compact" />
              </CardHeader>
              <CardContent>
                <SkeletonText lines={3} className="text-meta" />
              </CardContent>
            </Loading>
          </Card>
        ))}
      </div>
    </div>
  );
}

/**
 * A whole page loading: the page header and two cards. Each region that loads on its own has its own `Loading`, so
 * a screen reader hears each once, and each can be replaced as its data arrives.
 */
export const FullPage: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <PageSkeleton />,
  play: async ({ canvas }) => {
    await expectLoading(canvas, ["households", "the dues card", "the board card"]);
  },
};

/** The same page on a 390px phone: the cards stack and every line stays inside its card. */
export const Phone: Story = {
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "phone" } },
  render: () => <PageSkeleton />,
  play: async ({ canvas }) => {
    await expectLoading(canvas, ["households", "the dues card", "the board card"]);
    for (const card of document.querySelectorAll<HTMLElement>("[data-slot=card]")) {
      const edge = card.getBoundingClientRect();
      for (const shape of card.querySelectorAll<HTMLElement>("[data-slot=skeleton]")) {
        await expect(shape.getBoundingClientRect().right).toBeLessThanOrEqual(edge.right);
      }
    }
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  },
};

/**
 * Under reduced motion the pulse stops and each shape is a still block: every shape carries
 * `motion-reduce:animate-none`, on top of Avenue's stylesheet finishing every animation at once (Foundations/Motion).
 */
export const ReducedMotion: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-3 p-inset">
      <Loading label="the notice" className="flex items-center gap-3">
        <Skeleton shape="circle" className="size-8" />
        <SkeletonText lines={2} className="text-meta" />
      </Loading>
    </div>
  ),
  play: async ({ canvas }) => {
    await expectLoading(canvas, ["the notice"]);
    for (const shape of document.querySelectorAll<HTMLElement>("[data-slot=skeleton]")) {
      await expect(shape).toHaveClass("animate-pulse", "motion-reduce:animate-none");
    }
  },
};
