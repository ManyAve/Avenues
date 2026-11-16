import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor } from "storybook/test";
import { useState } from "react";
import { Count } from "#avenue/components/status";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#avenue/components/tabs";
import { Textarea } from "#avenue/components/textarea";

const meta = {
  title: "Components/Tabs",
  component: Tabs,
} satisfies Meta<typeof Tabs>;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The announcement composer's three views. One Tab stop reaches the chosen tab; the arrow keys move and choose, Home
 * and End jump to the ends, and Tab from a tab goes into its panel.
 */
export const Default: Story = {
  tags: ["agent"],
  render: () => (
    <Tabs defaultValue="recipients" className="w-full max-w-xl">
      <TabsList aria-label="Announcement">
        <TabsTrigger value="recipients">
          Recipients <Count value={128} />
        </TabsTrigger>
        <TabsTrigger value="letters">
          No email <Count value={6} />
        </TabsTrigger>
        <TabsTrigger value="message">Message</TabsTrigger>
      </TabsList>
      <TabsContent value="recipients">128 households on Maple Court and Birch Lane will get this announcement.</TabsContent>
      <TabsContent value="letters">6 households have no email address and get a printed letter instead.</TabsContent>
      <TabsContent value="message">
        <Textarea aria-label="Message" defaultValue="The pool opens Saturday at 10 AM." />
      </TabsContent>
    </Tabs>
  ),
  play: async ({ canvas }) => {
    const list = canvas.getByRole("tablist", { name: "Announcement" });
    const recipients = canvas.getByRole("tab", { name: /recipients/i });
    const letters = canvas.getByRole("tab", { name: /no email/i });
    const message = canvas.getByRole("tab", { name: "Message" });
    // 40px with a mouse, 48px on a phone so each tab's 44px tap area fits inside the scrolling list.
    const coarse = matchMedia("(pointer: coarse)").matches;
    await expect(list.getBoundingClientRect().height).toBe(coarse ? 48 : 40);
    await expect(recipients).toHaveAttribute("aria-selected", "true");
    // Only the chosen tab draws its underline and the foreground colour.
    const underline = (tab: HTMLElement) => getComputedStyle(tab, "::before").opacity;
    await expect(underline(recipients)).toBe("1");
    await expect(underline(letters)).toBe("0");
    await expect(getComputedStyle(recipients).color).not.toBe(getComputedStyle(letters).color);

    await userEvent.tab();
    await expect(recipients).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(letters).toHaveFocus();
    await expect(letters).toHaveAttribute("aria-selected", "true");
    await expect(canvas.getByRole("tabpanel")).toHaveTextContent(/printed letter/);
    await userEvent.keyboard("{End}");
    await expect(message).toHaveAttribute("aria-selected", "true");
    await userEvent.keyboard("{ArrowRight}");
    await expect(recipients).toHaveAttribute("aria-selected", "true");
    await userEvent.keyboard("{ArrowLeft}");
    await expect(message).toHaveAttribute("aria-selected", "true");

    // Tab leaves the list for the panel's field; Shift+Tab comes back to the chosen tab.
    await userEvent.tab();
    await expect(canvas.getByRole("textbox", { name: "Message" })).toHaveFocus();
    await userEvent.tab({ shift: true });
    await expect(message).toHaveFocus();

    // A panel with nothing focusable is a Tab stop of its own, labelled by its tab.
    await userEvent.keyboard("{Home}");
    await userEvent.tab();
    const panel = canvas.getByRole("tabpanel");
    await expect(panel).toHaveFocus();
    await expect(panel).toHaveAccessibleName(/recipients/i);
  },
};

/** A disabled tab can be reached with the arrow keys, so people find it, but can't be chosen. */
export const WithADisabledTab: Story = {
  tags: ["agent"],
  render: () => (
    <Tabs defaultValue="draft" className="w-full max-w-xl">
      <TabsList aria-label="Newsletter">
        <TabsTrigger value="draft">Draft</TabsTrigger>
        <TabsTrigger value="preview">Preview</TabsTrigger>
        <TabsTrigger value="sent" disabled>
          Sent
        </TabsTrigger>
      </TabsList>
      <TabsContent value="draft">The spring newsletter, last edited Tuesday.</TabsContent>
      <TabsContent value="preview">How the newsletter looks in an inbox.</TabsContent>
      <TabsContent value="sent">Delivery results, once it is sent.</TabsContent>
    </Tabs>
  ),
  play: async ({ canvas }) => {
    const draft = canvas.getByRole("tab", { name: "Draft" });
    const sent = canvas.getByRole("tab", { name: "Sent" });
    await expect(sent).toHaveAttribute("aria-disabled", "true");
    await userEvent.tab();
    await expect(draft).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}{ArrowRight}");
    await expect(sent).toHaveFocus();
    await expect(sent).toHaveAttribute("aria-selected", "false");
    await userEvent.keyboard("{Enter}");
    await expect(sent).toHaveAttribute("aria-selected", "false");
    await expect(canvas.getByRole("tabpanel")).toHaveTextContent(/inbox/);
  },
};

const sections = ["Overview", "Households", "Dues", "Requests", "Documents", "Announcements", "Settings"];

/**
 * More tabs than a 390px phone holds: the list scrolls sideways, without a scrollbar, and the cut-off tab at the edge
 * shows there is more. A tab the arrow keys reach scrolls into view. The list is 48px tall on a phone and the labels
 * 24px apart, so every tap area is 44px.
 */
export const ManyTabsOnAPhone: Story = {
  globals: { viewport: { value: "phone", isRotated: false } },
  render: () => (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList aria-label="Association">
        {sections.map((section) => (
          <TabsTrigger key={section} value={section.toLowerCase()}>
            {section}
          </TabsTrigger>
        ))}
      </TabsList>
      {sections.map((section) => (
        <TabsContent key={section} value={section.toLowerCase()}>
          {section} for Sunnydale HOA.
        </TabsContent>
      ))}
    </Tabs>
  ),
  play: async ({ canvas }) => {
    const list = canvas.getByRole("tablist", { name: "Association" });
    await expect(list.scrollWidth).toBeGreaterThan(list.clientWidth);
    await userEvent.tab();
    await userEvent.keyboard("{End}");
    const settings = canvas.getByRole("tab", { name: "Settings" });
    await expect(settings).toHaveAttribute("aria-selected", "true");
    await waitFor(() => {
      const box = list.getBoundingClientRect();
      const tab = settings.getBoundingClientRect();
      expect(tab.right).toBeLessThanOrEqual(box.right);
    });
  },
};

/** Controlled: the app owns the chosen view, as the composer does to open on Message after a retry. */
export const Controlled: Story = {
  render: function Render() {
    const [tab, setTab] = useState<string | null>("message");
    return (
      <div className="flex w-full max-w-xl flex-col gap-3">
        <p className="text-meta text-muted-foreground" data-testid="chosen">
          Showing {tab}
        </p>
        <Tabs value={tab} onValueChange={(next) => setTab(next)}>
          <TabsList aria-label="Composer">
            <TabsTrigger value="recipients">Recipients</TabsTrigger>
            <TabsTrigger value="message">Message</TabsTrigger>
          </TabsList>
          <TabsContent value="recipients">Everyone in Sunnydale HOA.</TabsContent>
          <TabsContent value="message">The pool opens Saturday at 10 AM.</TabsContent>
        </Tabs>
      </div>
    );
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId("chosen")).toHaveTextContent("Showing message");
    await userEvent.tab();
    await expect(canvas.getByRole("tab", { name: "Message" })).toHaveFocus();
    await userEvent.keyboard("{ArrowLeft}");
    await expect(canvas.getByTestId("chosen")).toHaveTextContent("Showing recipients");
  },
};
