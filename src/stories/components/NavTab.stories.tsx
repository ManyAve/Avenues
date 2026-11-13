import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import type { ComponentProps } from "react";
import { NavTab } from "#avenue/components/nav-tab";

/** Stands in for a router's link component. */
function RouterLink({ children, ...props }: ComponentProps<"a">) {
  return (
    <a data-router-link="" {...props}>
      {children}
    </a>
  );
}

const meta = {
  title: "Components/NavTab",
  component: NavTab,
  args: { href: "#households", children: "Households" },
} satisfies Meta<typeof NavTab>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The current section is marked with aria-current="page", which also draws its fill. */
export const Current: Story = {
  args: { current: true, count: 24 },
  play: async ({ canvas }) => {
    const link = canvas.getByRole("link", { name: /households/i });
    await expect(link).toHaveAttribute("aria-current", "page");
    await expect(link.getBoundingClientRect().height).toBe(28);
  },
};

export const WithCount: Story = { args: { count: 24 } };

/** A row of sections, as in the top bar. Each is a real link, reached with Tab and followed with Enter. */
export const Sections: Story = {
  render: () => (
    <nav aria-label="Sections" className="flex gap-1">
      <NavTab href="#households" current count={24}>
        Households
      </NavTab>
      <NavTab href="#dues" count={9}>
        Dues
      </NavTab>
      <NavTab href="#complaints" count={4}>
        Complaints
      </NavTab>
      <NavTab href="#documents">Documents</NavTab>
    </nav>
  ),
  play: async ({ canvas }) => {
    await userEvent.tab();
    await userEvent.tab();
    const dues = canvas.getByRole("link", { name: /dues/i });
    await expect(dues).toHaveFocus();
    await expect(dues).toHaveAttribute("href", "#dues");
    await expect(dues).not.toHaveAttribute("aria-current");
  },
};

/** `render` swaps the element, for a router's own link. */
export const AsRouterLink: Story = {
  render: () => (
    <NavTab current render={<RouterLink href="#announcements" />}>
      Announcements
    </NavTab>
  ),
  play: async ({ canvas }) => {
    const link = canvas.getByRole("link", { name: "Announcements" });
    await expect(link).toHaveAttribute("data-router-link");
    await expect(link).toHaveAttribute("aria-current", "page");
  },
};
