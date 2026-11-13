import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor } from "storybook/test";
import { NavTab } from "#avenue/components/nav-tab";
import { TopBar } from "#avenue/components/top-bar";

// AVE-9 part 4: the top bar. The association and counts are fictional; the mark is a stand-in for ManyAve's logo,
// which the app passes in.

const meta = { title: "Composites/Top bar", parameters: { layout: "fullscreen" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const desktop = { viewport: { value: "desktop", isRotated: false } };
const wide = { viewport: { value: "wide", isRotated: false } };
const phone = { viewport: { value: "phone", isRotated: false } };

const sections = [
  { label: "Households", count: 24 },
  { label: "Dues" },
  { label: "Complaints" },
  { label: "Announcements" },
  { label: "Documents" },
  { label: "Website" },
];

// A stand-in mark, 24 x 22 like ManyAve's logo: a rounded square in the primary colour.
const mark =
  "data:image/svg+xml," +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="22"><rect width="24" height="22" rx="6" fill="#5b4b8a"/></svg>');

function Bar({ current = "Households" }: { current?: string }) {
  return (
    <TopBar logo={<img src={mark} alt="" width={24} height={22} />} org="LCHOA">
      {sections.map((s) => (
        <NavTab key={s.label} href={`#${s.label.toLowerCase()}`} current={s.label === current} count={s.count}>
          {s.label}
        </NavTab>
      ))}
    </TopBar>
  );
}

/** 1440px: brand, association, sections and Help on one row. Tab visits each link in order. */
export const Wide: Story = {
  globals: wide,
  render: () => <Bar />,
  play: async ({ canvas }) => {
    await userEvent.tab();
    await expect(canvas.getByRole("link", { name: "manyave home" })).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole("link", { name: /Households/ })).toHaveFocus();
    await expect(canvas.getByRole("link", { name: /Households/ })).toHaveAttribute("aria-current", "page");
    const nav = canvas.getByRole("navigation", { name: "Neighborhood sections" });
    await expect(nav.querySelectorAll("a")).toHaveLength(sections.length);
    for (let i = 1; i < sections.length; i++) await userEvent.tab();
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "Help" })).toHaveFocus();
  },
};

/** 900px, the desktop minimum: the sections move to their own row under the brand. */
export const DesktopMinimum: Story = {
  globals: desktop,
  render: () => <Bar />,
  play: async ({ canvas }) => {
    const home = canvas.getByRole("link", { name: "manyave home" }).getBoundingClientRect();
    const nav = canvas.getByRole("navigation", { name: "Neighborhood sections" }).getBoundingClientRect();
    await expect(nav.top).toBeGreaterThanOrEqual(home.bottom);
  },
};

/** A phone: the mark alone, and the sections as one scrolling strip that keeps the current one in view. */
export const Phone: Story = {
  globals: phone,
  render: () => <Bar current="Website" />,
  play: async ({ canvas }) => {
    const nav = canvas.getByRole("navigation", { name: "Neighborhood sections" });
    const current = canvas.getByRole("link", { name: "Website" });
    await waitFor(() => {
      const strip = nav.getBoundingClientRect();
      const link = current.getBoundingClientRect();
      return expect(link.right).toBeLessThanOrEqual(strip.right + 1);
    });
    await expect(canvas.getByText("manyave")).not.toBeVisible();
  },
};
