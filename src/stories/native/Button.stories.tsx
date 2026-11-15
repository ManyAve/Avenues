import type { Meta, StoryObj } from "@storybook/react-vite";
import { PlusIcon } from "lucide-react";
import { Button } from "#avenue/components/button";
import { SideBySide } from "./native-kit";

// Avenue's Button beside AvenueUI's `.buttonStyle(.avenue(…))` (native/ios) and Android's AvenueButton (native/android).
const meta = { title: "Native/Button", parameters: { layout: "fullscreen" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: (_, { globals }) => (
    <SideBySide slug="button-variants" title="Button variants" theme={globals["theme"]}>
      <div className="flex flex-col items-start gap-controls">
        <Button>Record payment</Button>
        <Button variant="outline">Export</Button>
        <Button variant="secondary">Add note</Button>
        <Button variant="ghost">Skip</Button>
        <Button variant="destructive">Delete</Button>
        <Button variant="link">View history</Button>
      </div>
    </SideBySide>
  ),
};

export const Sizes: Story = {
  render: (_, { globals }) => (
    <SideBySide slug="button-sizes" title="Button sizes" theme={globals["theme"]}>
      <div className="flex flex-col items-start gap-controls">
        <Button size="xs">Extra small</Button>
        <Button size="sm">Small</Button>
        <Button>Default</Button>
        <Button size="lg">Large</Button>
        <Button variant="outline" size="icon" aria-label="Add household">
          <PlusIcon aria-hidden />
        </Button>
      </div>
    </SideBySide>
  ),
};

export const DisabledReason: Story = {
  name: "Disabled reason",
  render: (_, { globals }) => (
    <SideBySide slug="button-disabled-reason" title="Button with a disabled reason" theme={globals["theme"]}>
      <Button disabledReason="Add a mailing address first.">Send notices</Button>
    </SideBySide>
  ),
};
