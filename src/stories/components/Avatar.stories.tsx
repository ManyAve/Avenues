import type { Meta, StoryObj } from "@storybook/react-vite";
import { CheckIcon } from "lucide-react";
import { Avatar, AvatarBadge, AvatarFallback, AvatarGroup, AvatarGroupCount } from "#avenue/components/avatar";
import { Row, Rows } from "./story-kit";

const meta = {
  title: "Components/Avatar",
  component: Avatar,
} satisfies Meta<typeof Avatar>;
export default meta;
type Story = StoryObj<typeof meta>;

/** sm 24, default 32, lg 40; initials fallback, a status badge and a group with a count. Circles (pills allowed). */
export const Sizes: Story = {
  tags: ["agent"],
  render: () => (
    <Rows>
      {(["sm", "default", "lg"] as const).map((size) => (
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
