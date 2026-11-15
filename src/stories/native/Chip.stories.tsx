import type { Meta, StoryObj } from "@storybook/react-vite";
import { Chip, ChipRow } from "#avenue/components/chip";
import { SideBySide } from "./native-kit";

// Avenue's Chip and ChipRow beside AvenueUI's (native/ios) and Android's (native/android).
const meta = { title: "Native/Chip", parameters: { layout: "fullscreen" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  render: (_, { globals }) => (
    <SideBySide slug="chip-states" title="Chip states" theme={globals["theme"]}>
      <ChipRow>
        <Chip count={4}>Open</Chip>
        <Chip count={12} defaultPressed>
          Closed
        </Chip>
        <Chip>Mine</Chip>
      </ChipRow>
    </SideBySide>
  ),
};

export const Row: Story = {
  render: (_, { globals }) => (
    <SideBySide slug="chip-row" title="Chip row" theme={globals["theme"]}>
      <ChipRow>
        <Chip>All</Chip>
        <Chip count={31}>Paid</Chip>
        <Chip count={3}>Partial</Chip>
        <Chip count={6} defaultPressed>
          Past due
        </Chip>
        <Chip count={2}>Credit</Chip>
        <Chip>Archived</Chip>
      </ChipRow>
    </SideBySide>
  ),
};
