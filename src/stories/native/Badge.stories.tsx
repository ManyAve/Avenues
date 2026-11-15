import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "#avenue/components/badge";
import { SideBySide } from "./native-kit";

// Avenue's Badge beside AvenueUI's `Badge` (native/ios) and Android's (native/android).
const meta = { title: "Native/Badge", parameters: { layout: "fullscreen" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: (_, { globals }) => (
    <SideBySide slug="badge-variants" title="Badge variants" theme={globals["theme"]}>
      <div className="flex flex-wrap gap-group">
        <Badge>Paid</Badge>
        <Badge variant="secondary">Draft</Badge>
        <Badge variant="destructive">Past due</Badge>
        <Badge variant="outline">12 households</Badge>
      </div>
    </SideBySide>
  ),
};
