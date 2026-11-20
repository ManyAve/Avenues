import type { Meta, StoryObj } from "@storybook/react-vite";
import { CheckIcon } from "lucide-react";
import { expect } from "storybook/test";
import { Avatar, AvatarBadge, AvatarFallback, AvatarGroup, AvatarGroupCount } from "#avenue/components/avatar";
import { Row, Rows } from "./story-kit";

const meta = {
  title: "Components/Avatar",
  component: Avatar,
} satisfies Meta<typeof Avatar>;
export default meta;
type Story = StoryObj<typeof meta>;

/** sm 24, md 32, lg 40; initials fallback, a status badge and a group with a count. Circles (pills allowed). */
export const Sizes: Story = {
  tags: ["agent"],
  render: () => (
    <Rows>
      {(["sm", "md", "lg"] as const).map((size) => (
        <Row key={size} label={size}>
          <Avatar size={size} aria-label="Robin Avery">
            <AvatarFallback>RA</AvatarFallback>
          </Avatar>
          <Avatar size={size} aria-label="Sam Okafor">
            <AvatarFallback>SO</AvatarFallback>
            <AvatarBadge>
              <CheckIcon aria-hidden />
            </AvatarBadge>
          </Avatar>
          <AvatarGroup>
            <Avatar size={size} aria-label="Robin Avery">
              <AvatarFallback>RA</AvatarFallback>
            </Avatar>
            <Avatar size={size} aria-label="Sam Okafor">
              <AvatarFallback>SO</AvatarFallback>
            </Avatar>
            <AvatarGroupCount>+3</AvatarGroupCount>
          </AvatarGroup>
        </Row>
      ))}
    </Rows>
  ),
};

/** Beside a name the initials are hidden from screen readers, so the name is read once. */
export const WithName: Story = {
  render: () => (
    <Rows>
      <span className="flex items-center gap-2">
        <Avatar>
          <AvatarFallback aria-hidden>RA</AvatarFallback>
        </Avatar>
        Robin Avery
      </span>
    </Rows>
  ),
};

/**
 * AVE-99: in a group, every avatar's initials show in full. Each covers at most a quarter of the one before, with a
 * 2px ring in the card's colour, on a card as groups are used. The widest everyday initials (LM, SO) are the test.
 */
export const GroupOnACard: Story = {
  render: () => (
    <Rows>
      {(["sm", "md", "lg"] as const).map((size) => (
        <Row key={size} label={size}>
          <div className="rounded-xl bg-card p-inset ring-1 ring-border">
            <AvatarGroup data-testid={`group-${size}`} aria-label="Committee">
              {["RA", "SO", "LM", "DK"].map((initials) => (
                <Avatar key={initials} size={size}>
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              ))}
              <AvatarGroupCount>+2</AvatarGroupCount>
            </AvatarGroup>
          </div>
        </Row>
      ))}
    </Rows>
  ),
  play: async ({ canvas }) => {
    for (const size of ["sm", "md", "lg"]) {
      const group = canvas.getByTestId(`group-${size}`);
      const items = [...group.children] as HTMLElement[];
      for (const [i, item] of items.slice(0, -1).entries()) {
        const box = item.getBoundingClientRect();
        // The next item and its 2px ring cover this one's end.
        const shown = items[i + 1]!.getBoundingClientRect().left - 2;
        await expect(box.right - shown).toBeLessThanOrEqual(box.width / 4);
        const fallback = item.querySelector<HTMLElement>("[data-slot=avatar-fallback]")!;
        const range = document.createRange();
        range.selectNodeContents(fallback);
        const text = range.getBoundingClientRect();
        await expect(text.left).toBeGreaterThanOrEqual(box.left);
        await expect(text.right).toBeLessThanOrEqual(shown);
      }
      await expect(getComputedStyle(items[0]!).boxShadow).toContain(getComputedStyle(group.parentElement!).backgroundColor);
    }
  },
};
