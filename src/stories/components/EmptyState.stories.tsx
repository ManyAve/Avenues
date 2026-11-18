import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { FileTextIcon, HomeIcon, InboxIcon, PlusIcon, UsersIcon } from "lucide-react";
import { expect, fn, userEvent } from "storybook/test";
import { Card } from "#avenue/components/card";
import {
  EmptyState,
  EmptyStateAction,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  SectionEmpty,
  SectionEmptyAction,
  SectionEmptyContent,
  SectionEmptyDescription,
  SectionEmptyIcon,
  SectionEmptyTitle,
} from "#avenue/components/empty-state";
import { Rows } from "./story-kit";

const meta = {
  title: "Components/Empty state",
  component: EmptyState,
  args: {
    icon: InboxIcon,
    title: "No complaints yet",
    description: "Complaints neighbors send to the board show up here.",
  },
} satisfies Meta<typeof EmptyState>;
export default meta;
type Story = StoryObj<typeof meta>;

/** The page form: icon, title, one line, and an action. */
export const Default: Story = {
  tags: ["agent"],
  args: { action: { label: "Log a complaint", onClick: fn() } },
  play: async ({ args, canvas }) => {
    await expect(canvas.getByRole("heading", { level: 3, name: "No complaints yet" })).toBeVisible();
    const action = canvas.getByRole("button", { name: "Log a complaint" });
    await userEvent.tab();
    await expect(action).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(args.action?.onClick).toHaveBeenCalledOnce();
  },
};

/** A quieter second way out, drawn as a link button. */
export const SecondaryAction: Story = {
  args: {
    icon: HomeIcon,
    title: "No association found",
    description: "We couldn't find an association for jordan@example.com.",
    action: { label: "Try again", onClick: fn() },
    secondaryAction: { label: "Use a different email", onClick: fn() },
  },
};

/**
 * An app router's link, standing in for TanStack Router's or Next.js's `Link`: it takes `to`, draws an `a` with
 * that address, and navigates on the client instead of loading the page.
 */
const navigate = fn();
function RouterLink({ to, onClick, ...props }: ComponentProps<"a"> & { to: string }) {
  return (
    // oxlint-disable-next-line jsx-a11y/anchor-has-content -- the label comes from the Button that renders this.
    <a
      {...props}
      href={to}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        event.preventDefault();
        navigate(to);
      }}
    />
  );
}

/**
 * An action that goes somewhere is a link, not a button pretending to be one (AVE-139): `href` draws an `a` with the
 * button's look, so it shows its address and opens in a new tab. The quieter second way out can be a link too.
 */
export const LinkAction: Story = {
  tags: ["agent"],
  args: {
    icon: HomeIcon,
    title: "No households yet",
    description: "Add the homes in the association to send dues and notices.",
    action: { label: "Add a household", href: "#add-household" },
    secondaryAction: { label: "Import from a spreadsheet", href: "#import-households" },
  },
  play: async ({ canvas }) => {
    const action = canvas.getByRole("link", { name: "Add a household" });
    await expect(action.tagName).toBe("A");
    await expect(action).toHaveAttribute("href", "#add-household");
    await expect(canvas.queryByRole("button", { name: "Add a household" })).toBeNull();
    const secondary = canvas.getByRole("link", { name: "Import from a spreadsheet" });
    await expect(secondary).toHaveAttribute("href", "#import-households");
    await userEvent.tab();
    await expect(action).toHaveFocus();
    await userEvent.tab();
    await expect(secondary).toHaveFocus();
  },
};

/** `render` takes the app's own router link, so the action is a link and navigation stays client-side. */
export const RouterLinkAction: Story = {
  tags: ["agent"],
  args: {
    icon: FileTextIcon,
    title: "No documents shared",
    description: "Documents the board shares with neighbors show up here.",
    action: { label: "Share a document", render: <RouterLink to="/documents/new" /> },
  },
  play: async ({ canvas }) => {
    navigate.mockClear();
    const action = canvas.getByRole("link", { name: "Share a document" });
    await expect(action).toHaveAttribute("href", "/documents/new");
    await expect(action).toHaveAttribute("data-slot", "button");
    await userEvent.tab();
    await expect(action).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(navigate).toHaveBeenCalledOnce();
    await expect(navigate).toHaveBeenCalledWith("/documents/new");
  },
};

/** A disabled link can't navigate and leaves the tab order (ui-sdk's Button). */
export const DisabledLinkAction: Story = {
  args: { action: { label: "Log a complaint", href: "#log-complaint", disabled: true } },
  play: async ({ canvas }) => {
    const action = canvas.getByText("Log a complaint");
    await expect(action.closest("a")).toHaveAttribute("aria-disabled", "true");
    await userEvent.tab();
    await expect(action.closest("a")).not.toHaveFocus();
  },
};

/** A page outside the app stays a real link, not a button: it has an href and opens in a new tab. */
export const ExternalLink: Story = {
  args: {
    icon: HomeIcon,
    title: "No associations yet",
    description: "You're not on the board of any association.",
    externalLink: { lead: "Starting a new association?", label: "Set it up on the web", href: "https://example.com/start" },
  },
  play: async ({ canvas }) => {
    const link = canvas.getByRole("link", { name: "Set it up on the web (opens in a new tab)" });
    await expect(link.tagName).toBe("A");
    await expect(link).toHaveAttribute("href", "https://example.com/start");
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    await expect(canvas.queryByRole("button", { name: "Set it up on the web" })).toBeNull();
  },
};

/** A disabled action keeps its place. */
export const DisabledAction: Story = {
  args: { action: { label: "Log a complaint", disabled: true } },
};

/** Compact: fits inside a card on a 390px phone (AVE-23). */
export const CompactInACard: Story = {
  args: {
    size: "compact",
    icon: UsersIcon,
    title: "No events this month",
    description: "Porch light: Saturday 6pm was the last one at Maple Court.",
    action: { label: "Plan an event", onClick: fn() },
  },
  render: (args) => (
    <div className="w-[390px] bg-background p-inset">
      <Card>
        <EmptyState {...args} />
      </Card>
    </div>
  ),
};

/** SectionEmpty: one row inside a card section, with the next step when there is one. */
export const Section: Story = {
  render: () => (
    <Rows>
      <div className="flex max-w-xl flex-col gap-section">
        <Card className="p-inset">
          <SectionEmpty
            icon={FileTextIcon}
            title="No notes"
            line="Notes the board adds about this household show here."
            action={{ label: "Add note", icon: PlusIcon, onClick: fn() }}
          />
        </Card>
        <Card className="p-inset">
          <SectionEmpty icon={UsersIcon} title="No other residents" line="Residents join when they accept an invite." />
        </Card>
      </div>
    </Rows>
  ),
};

/** SectionEmpty's next step can be a link too: `href`, or the app's router link with `render` (AVE-139). */
export const SectionLink: Story = {
  render: () => (
    <Rows>
      <div className="flex max-w-xl flex-col gap-section">
        <Card className="p-inset">
          <SectionEmpty
            icon={UsersIcon}
            title="No other residents"
            line="Residents join when they accept an invite."
            action={{ label: "Invite a resident", icon: PlusIcon, render: <RouterLink to="/residents/invite" /> }}
          />
        </Card>
        <Card className="p-inset">
          <SectionEmpty
            icon={FileTextIcon}
            title="No documents"
            line="Documents shared with this household show here."
            action={{ label: "See all documents", href: "#documents" }}
          />
        </Card>
      </div>
    </Rows>
  ),
  play: async ({ canvas }) => {
    navigate.mockClear();
    const invite = canvas.getByRole("link", { name: "Invite a resident" });
    const documents = canvas.getByRole("link", { name: "See all documents" });
    await expect(invite).toHaveAttribute("href", "/residents/invite");
    await expect(documents).toHaveAttribute("href", "#documents");
    await userEvent.tab();
    await expect(invite).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(navigate).toHaveBeenCalledOnce();
    await expect(navigate).toHaveBeenCalledWith("/residents/invite");
    await userEvent.tab();
    await expect(documents).toHaveFocus();
  },
};

const addHousehold = fn();

/**
 * The parts, as ui-sdk composes (AVE-149). Written here out of order on purpose: the root draws icon, title, line and
 * actions in that order whatever order they come in (the UX rule), and anything else after them. The title is an h2
 * with `render`.
 */
export const Parts: Story = {
  tags: ["agent"],
  render: () => (
    <EmptyState>
      <EmptyStateActions>
        <EmptyStateAction onClick={addHousehold}>Add a household</EmptyStateAction>
        {/* oxlint-disable-next-line jsx-a11y/anchor-has-content, jsx-a11y/control-has-associated-label -- the action gives the link its label. */}
        <EmptyStateAction variant="link" render={<a href="#import-households" />}>
          Import from a spreadsheet
        </EmptyStateAction>
      </EmptyStateActions>
      <p className="mt-3 text-muted-foreground">Households you add show here.</p>
      {/* oxlint-disable-next-line jsx-a11y/heading-has-content -- EmptyStateTitle passes its children into the h2. */}
      <EmptyStateTitle render={<h2 />}>No households yet</EmptyStateTitle>
      <EmptyStateDescription>Add the homes in the association to send dues and notices.</EmptyStateDescription>
      <EmptyStateIcon>
        <HomeIcon />
      </EmptyStateIcon>
    </EmptyState>
  ),
  play: async ({ canvas, canvasElement }) => {
    addHousehold.mockClear();
    const title = canvas.getByRole("heading", { level: 2, name: "No households yet" });
    const at = (el: Element) => el.getBoundingClientRect().top;
    const icon = canvasElement.querySelector("[data-slot=empty-state-icon]")!;
    const line = canvas.getByText("Add the homes in the association to send dues and notices.");
    const action = canvas.getByRole("button", { name: "Add a household" });
    const extra = canvas.getByText("Households you add show here.");
    await expect(at(icon)).toBeLessThan(at(title));
    await expect(at(title)).toBeLessThan(at(line));
    await expect(at(line)).toBeLessThan(at(action));
    await expect(at(action)).toBeLessThan(at(extra));
    await userEvent.tab();
    await expect(action).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(addHousehold).toHaveBeenCalledOnce();
    await userEvent.tab();
    await expect(canvas.getByRole("link", { name: "Import from a spreadsheet" })).toHaveFocus();
  },
};

const addNote = fn();

/** SectionEmpty's parts, also out of order: the tile, the text and the step still draw in that order. */
export const SectionParts: Story = {
  render: () => (
    <div className="max-w-xl">
      <Card className="p-inset">
        <SectionEmpty>
          <SectionEmptyAction onClick={addNote}>
            <PlusIcon aria-hidden /> Add note
          </SectionEmptyAction>
          <SectionEmptyContent>
            <SectionEmptyTitle>No notes</SectionEmptyTitle>
            <SectionEmptyDescription>Notes the board adds about this household show here.</SectionEmptyDescription>
          </SectionEmptyContent>
          <SectionEmptyIcon>
            <FileTextIcon />
          </SectionEmptyIcon>
        </SectionEmpty>
      </Card>
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    addNote.mockClear();
    const left = (el: Element) => el.getBoundingClientRect().left;
    const tile = canvasElement.querySelector("[data-slot=section-empty-icon]")!;
    const text = canvas.getByText("No notes");
    const action = canvas.getByRole("button", { name: "Add note" });
    await expect(left(tile)).toBeLessThan(left(text));
    await expect(left(text)).toBeLessThan(left(action));
    await userEvent.tab();
    await expect(action).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(addNote).toHaveBeenCalledOnce();
  },
};
