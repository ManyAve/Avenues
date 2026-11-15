import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "#avenue/components/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "#avenue/components/card";
import { SideBySide } from "./native-kit";

// Avenue's Card beside AvenueUI's `Card` (native/ios) and Android's (native/android).
const meta = { title: "Native/Card", parameters: { layout: "fullscreen" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function Dues({ size, footer }: { size: "default" | "sm"; footer: boolean }) {
  return (
    <Card size={size}>
      <CardHeader>
        <CardTitle>Dues 2026</CardTitle>
        <CardDescription>Billed March 1</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm">
            Edit
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>$240.00 per household · 42 households</CardContent>
      {footer && (
        <CardFooter>
          <Button>Request dues</Button>
        </CardFooter>
      )}
    </Card>
  );
}

export const Default: Story = {
  render: (_, { globals }) => (
    <SideBySide slug="card-default" title="Card" theme={globals["theme"]}>
      <Dues size="default" footer />
    </SideBySide>
  ),
};

export const Small: Story = {
  render: (_, { globals }) => (
    <SideBySide slug="card-sm" title="Small card" theme={globals["theme"]}>
      <Dues size="sm" footer={false} />
    </SideBySide>
  ),
};
