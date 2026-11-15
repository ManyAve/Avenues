import type { Meta, StoryObj } from "@storybook/react-vite";
import { InitialsAvatar } from "#avenue/components/initials-avatar";
import { SideBySide } from "./native-kit";

// Avenue's InitialsAvatar beside AvenueUI's (native/ios) and Android's (native/android). The four names fall on the
// four tints, and all three platforms hash them the same way (web tintFor).
const meta = { title: "Native/Initials avatar", parameters: { layout: "fullscreen" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const names = ["Sam Ortiz", "Avery Quinn", "Riley Park", "Morgan Diaz"];

export const Sizes: Story = {
  render: (_, { globals }) => (
    <SideBySide slug="initials-avatar-sizes" title="Initials avatar sizes" theme={globals["theme"]}>
      <div className="flex flex-col gap-controls">
        {(["sm", "default"] as const).map((size) => (
          <div key={size} className="flex gap-group">
            {names.map((name) => (
              <InitialsAvatar key={name} name={name} size={size} />
            ))}
          </div>
        ))}
      </div>
    </SideBySide>
  ),
};
