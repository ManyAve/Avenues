import type { Meta, StoryObj } from "@storybook/react-vite";
import { Status } from "#avenue/components/status";
import { SideBySide } from "./native-kit";

// Avenue's Status beside AvenueUI's `Status` (native/ios) and Android's (native/android).
const meta = { title: "Native/Status", parameters: { layout: "fullscreen" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function Tones({ filled }: { filled: boolean }) {
  return (
    <div className="flex flex-wrap gap-group">
      <Status tone="success" filled={filled}>Paid</Status>
      <Status tone="warning" filled={filled}>Partial</Status>
      <Status tone="primary" filled={filled}>Scheduled</Status>
      <Status tone="info" filled={filled}>Sent</Status>
      <Status tone="neutral" filled={filled}>Archived</Status>
    </div>
  );
}

export const StatusTones: Story = {
  name: "Tones",
  render: (_, { globals }) => (
    <SideBySide slug="status-tones" title="Status tones" theme={globals["theme"]}>
      <Tones filled={false} />
    </SideBySide>
  ),
};

export const Filled: Story = {
  render: (_, { globals }) => (
    <SideBySide slug="status-filled" title="Filled status tones" theme={globals["theme"]}>
      <Tones filled />
    </SideBySide>
  ),
};
