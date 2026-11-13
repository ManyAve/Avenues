import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { InitialsAvatar, tintFor } from "#avenue/components/initials-avatar";
import { Row, Rows } from "./story-kit";

const meta = {
  title: "Components/Initials avatar",
  component: InitialsAvatar,
  args: { name: "Robin Avery" },
} satisfies Meta<typeof InitialsAvatar>;
export default meta;
type Story = StoryObj<typeof meta>;

const people = ["Robin Avery", "Sam Okafor", "Jordan Rivera", "Mei Lin", "Priya Natarajan", "Alex Moreau", "Élodie Fontaine"];

/** sm 28 and default 32, one tint per person. Screen readers hear the name, not the initials. */
export const Sizes: Story = {
  tags: ["agent"],
  render: () => (
    <Rows>
      {(["sm", "default"] as const).map((size) => (
        <Row key={size} label={size}>
          {people.map((name) => (
            <InitialsAvatar key={name} name={name} size={size} />
          ))}
        </Row>
      ))}
    </Rows>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByLabelText("Robin Avery")[0]).toHaveAttribute("data-slot", "avatar");
    await expect(canvas.getAllByText("RA")[0]).toHaveAttribute("aria-hidden");
    await expect(canvas.getAllByText("ÉF")[0]).toBeVisible();
  },
};

/** The tint follows `tintKey` (a stable id), so one person keeps one colour even when their name is written two ways. */
export const TintFromId: Story = {
  render: () => (
    <Rows>
      <Row label="by name">
        <InitialsAvatar name="Jordan Rivera" data-testid="name-full" />
        <InitialsAvatar name="J. Rivera" data-testid="name-short" />
      </Row>
      <Row label="by id">
        <InitialsAvatar name="Jordan Rivera" tintKey="household-114" data-testid="id-full" />
        <InitialsAvatar name="J. Rivera" tintKey="household-114" data-testid="id-short" />
      </Row>
    </Rows>
  ),
  play: async ({ canvas }) => {
    const tint = (id: string) =>
      canvas.getByTestId(id).querySelector("[data-tint]")?.getAttribute("data-tint");
    await expect(tint("id-full")).toBe(tintFor("household-114"));
    await expect(tint("id-short")).toBe(tint("id-full"));
    await expect(tint("name-full")).toBe(tintFor("Jordan Rivera"));
    await expect(tint("name-short")).toBe(tintFor("J. Rivera"));
  },
};

/** Beside a visible name the avatar is decorative, so the name is read once. */
export const BesideAName: Story = {
  render: () => (
    <Rows>
      <span className="flex items-center gap-2">
        <InitialsAvatar name="Sam Okafor" decorative data-testid="avatar" />
        Sam Okafor
      </span>
    </Rows>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId("avatar")).toHaveAttribute("aria-hidden", "true");
    await expect(canvas.getAllByText("Sam Okafor")).toHaveLength(1);
  },
};

/** The app's own tint story names: each lands on the same tint as in the app, because the hash is the app's. */
export const Tints: Story = {
  render: () => (
    <Rows>
      <Row label="tints">
        {["Alex Morgan", "Sarah Miller", "Daniel & Priya Shah", "Olivia Chen", "James Wilson", "Maria Santos", "Ethan Brooks", "Grace Kim"].map(
          (name) => (
            <InitialsAvatar key={name} name={name} />
          ),
        )}
      </Row>
    </Rows>
  ),
};
