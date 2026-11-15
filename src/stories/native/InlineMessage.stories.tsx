import type { Meta, StoryObj } from "@storybook/react-vite";
import { InlineMessage } from "#avenue/components/inline-message";
import { SideBySide } from "./native-kit";

// Avenue's InlineMessage beside AvenueUI's (native/ios) and Android's (native/android).
const meta = { title: "Native/Inline message", parameters: { layout: "fullscreen" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Tones: Story = {
  render: (_, { globals }) => (
    <SideBySide slug="inline-message-tones" title="Inline message tones" theme={globals["theme"]}>
      <div className="flex flex-col gap-controls">
        <InlineMessage tone="error">Couldn't save. Check your connection and try again.</InlineMessage>
        <InlineMessage tone="warning">This household has no mailing address.</InlineMessage>
        <InlineMessage tone="info">Changes save automatically.</InlineMessage>
        <InlineMessage tone="pending">Saving…</InlineMessage>
      </div>
    </SideBySide>
  ),
};
