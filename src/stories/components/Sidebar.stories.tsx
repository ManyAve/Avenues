import type { Meta, StoryObj } from "@storybook/react-vite";
import { Home, Inbox, MessageSquare, Users } from "lucide-react";
import { expect, userEvent, within } from "storybook/test";
import {
  Sidebar,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarItem,
} from "#avenue/components/sidebar";
import { StatusDot } from "#avenue/components/status";

const meta = {
  title: "Components/Sidebar",
  component: Sidebar,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Sidebar>;
export default meta;
type Story = StoryObj<typeof meta>;

/** A tool's sections down the side: the page you are on, a count, a group of saved views and a status line at the foot. */
export const Default: Story = {
  render: () => (
    <div className="flex max-md:flex-col">
      <Sidebar aria-label="Main">
        <SidebarHeader>Harbor desk</SidebarHeader>
        <SidebarGroup aria-label="Sections">
          <SidebarItem href="#home" current>
            <Home aria-hidden />
            Home
          </SidebarItem>
          <SidebarItem href="#ask">
            <MessageSquare aria-hidden />
            Ask
          </SidebarItem>
          <SidebarItem href="#inbox" count={7}>
            <Inbox aria-hidden />
            Inbox
          </SidebarItem>
          <SidebarItem href="#customers">
            <Users aria-hidden />
            Customers
          </SidebarItem>
        </SidebarGroup>
        <SidebarGroup aria-labelledby="sidebar-story-saved" className="max-md:hidden">
          <SidebarGroupLabel id="sidebar-story-saved">Saved views</SidebarGroupLabel>
          <SidebarItem href="#stalled">Trials that have not activated</SidebarItem>
          <SidebarItem href="#failed">Failed payments by cause</SidebarItem>
        </SidebarGroup>
        <SidebarFooter className="max-md:hidden">
          <SidebarItem href="#sources">
            <StatusDot tone="warning" size="md" />8 of 9 sources healthy
          </SidebarItem>
        </SidebarFooter>
      </Sidebar>
      <main className="min-w-0 flex-1 p-6 text-muted-foreground">The page goes here.</main>
    </div>
  ),
  play: async ({ canvas }) => {
    const nav = canvas.getByRole("navigation", { name: "Main" });
    const links = within(nav).getAllByRole("link");
    // One link is the page you are on, and only that one says so.
    await expect(within(nav).getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
    await expect(links.filter((link) => link.hasAttribute("aria-current"))).toHaveLength(1);
    // A count reads after its label.
    await expect(within(nav).getByRole("link", { name: /^Inbox\s*7$/ })).toBeVisible();
    // Links are the tab stops, in the order drawn.
    await userEvent.tab();
    await expect(links[0]).toHaveFocus();
    await userEvent.tab();
    await expect(links[1]).toHaveFocus();
    // The current link is filled; the others are not.
    await expect(getComputedStyle(links[0]!).backgroundColor).not.toBe(getComputedStyle(links[3]!).backgroundColor);
    if (matchMedia("(min-width: 48rem)").matches) {
      // From `md` up: a column with its groups stacked and the saved views named by their label.
      await expect(within(nav).getByRole("group", { name: "Saved views" })).toBeVisible();
      await expect(links[1]!.getBoundingClientRect().top).toBeGreaterThan(links[0]!.getBoundingClientRect().bottom - 1);
    } else {
      // Narrower: one row along the top, which scrolls by itself and never widens the page.
      await expect(links[1]!.getBoundingClientRect().left).toBeGreaterThan(links[0]!.getBoundingClientRect().right - 1);
      await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    }
  },
};
