import type { Meta, StoryObj } from "@storybook/react-vite";
import { InboxIcon } from "lucide-react";
import {
  EmptyState,
  EmptyStateAction,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
} from "#avenue/components/empty-state";
import { SideBySide } from "./native-kit";

// Avenue's EmptyState beside Android's (native/android). iOS builds none: the system's ContentUnavailableView already
// is the iPhone's empty state, with VoiceOver and Dynamic Type handled, and takes Avenue's tint from `.avenueTheme()`.
const meta = { title: "Native/Empty state", parameters: { layout: "fullscreen" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const ios = { ios: "SwiftUI's ContentUnavailableView, the system's own empty state, under .avenueTheme()." };

export const Default: Story = {
  render: (_, { globals }) => (
    <SideBySide slug="empty-state-default" title="Empty state" theme={globals["theme"]} instead={ios}>
      <EmptyState>
        <EmptyStateIcon>
          <InboxIcon />
        </EmptyStateIcon>
        <EmptyStateTitle>No complaints yet</EmptyStateTitle>
        <EmptyStateDescription>Complaints neighbors file show up here.</EmptyStateDescription>
        <EmptyStateActions>
          <EmptyStateAction onClick={() => {}}>New complaint</EmptyStateAction>
        </EmptyStateActions>
      </EmptyState>
    </SideBySide>
  ),
};

export const Compact: Story = {
  render: (_, { globals }) => (
    <SideBySide slug="empty-state-compact" title="Compact empty state" theme={globals["theme"]} instead={ios}>
      <EmptyState size="compact">
        <EmptyStateIcon>
          <InboxIcon />
        </EmptyStateIcon>
        <EmptyStateTitle>No payments</EmptyStateTitle>
        <EmptyStateDescription>Payments recorded for this household show up here.</EmptyStateDescription>
      </EmptyState>
    </SideBySide>
  ),
};
