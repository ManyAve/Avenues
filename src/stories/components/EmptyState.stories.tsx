import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { FileTextIcon, HomeIcon, InboxIcon, PlusIcon, UsersIcon } from "lucide-react";
import { expect, fn, userEvent } from "storybook/test";
import { buttonVariants } from "#avenue/components/button";
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
import { cn } from "#avenue/lib/utils";
import { Rows } from "./story-kit";

const meta = {
  title: "Components/Empty state",
  component: EmptyState,
} satisfies Meta<typeof EmptyState>;
export default meta;
type Story = StoryObj<typeof meta>;

const logComplaint = fn();

/** The page form: icon, title, one line, and an action. */
export const Default: Story = {
  tags: ["agent"],
  render: () => (
    <EmptyState>
      <EmptyStateIcon>
        <InboxIcon />
      </EmptyStateIcon>
      <EmptyStateTitle>No complaints yet</EmptyStateTitle>
      <EmptyStateDescription>Complaints neighbors send to the board show up here.</EmptyStateDescription>
      <EmptyStateActions>
        <EmptyStateAction onClick={logComplaint}>Log a complaint</EmptyStateAction>
      </EmptyStateActions>
    </EmptyState>
  ),
  play: async ({ canvas }) => {
    logComplaint.mockClear();
    await expect(canvas.getByRole("heading", { level: 3, name: "No complaints yet" })).toBeVisible();
    const action = canvas.getByRole("button", { name: "Log a complaint" });
    await userEvent.tab();
    await expect(action).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(logComplaint).toHaveBeenCalledOnce();
  },
};

/** A quieter second way out, drawn as a link button. */
export const SecondaryAction: Story = {
  render: () => (
    <EmptyState>
      <EmptyStateIcon>
        <HomeIcon />
      </EmptyStateIcon>
      <EmptyStateTitle>No association found</EmptyStateTitle>
      <EmptyStateDescription>We couldn't find an association for jordan@example.com.</EmptyStateDescription>
      <EmptyStateActions>
        <EmptyStateAction onClick={fn()}>Try again</EmptyStateAction>
        <EmptyStateAction variant="link" onClick={fn()}>
          Use a different email
        </EmptyStateAction>
      </EmptyStateActions>
    </EmptyState>
  ),
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
 * An action that goes somewhere is a link, not a button pretending to be one (AVE-139): `render={<a href="…" />}`
 * draws an `a` with the button's look, so it shows its address and opens in a new tab. The quieter second way out can
 * be a link too.
 */
export const LinkAction: Story = {
  tags: ["agent"],
  render: () => (
    <EmptyState>
      <EmptyStateIcon>
        <HomeIcon />
      </EmptyStateIcon>
      <EmptyStateTitle>No households yet</EmptyStateTitle>
      <EmptyStateDescription>Add the homes in the association to send dues and notices.</EmptyStateDescription>
      <EmptyStateActions>
        {/* oxlint-disable-next-line jsx-a11y/anchor-has-content, jsx-a11y/control-has-associated-label -- the action gives the link its label. */}
        <EmptyStateAction render={<a href="#add-household" />}>Add a household</EmptyStateAction>
        {/* oxlint-disable-next-line jsx-a11y/anchor-has-content, jsx-a11y/control-has-associated-label -- the action gives the link its label. */}
        <EmptyStateAction variant="link" render={<a href="#import-households" />}>
          Import from a spreadsheet
        </EmptyStateAction>
      </EmptyStateActions>
    </EmptyState>
  ),
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
  render: () => (
    <EmptyState>
      <EmptyStateIcon>
        <FileTextIcon />
      </EmptyStateIcon>
      <EmptyStateTitle>No documents shared</EmptyStateTitle>
      <EmptyStateDescription>Documents the board shares with neighbors show up here.</EmptyStateDescription>
      <EmptyStateActions>
        <EmptyStateAction render={<RouterLink to="/documents/new" />}>Share a document</EmptyStateAction>
      </EmptyStateActions>
    </EmptyState>
  ),
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
  render: () => (
    <EmptyState>
      <EmptyStateIcon>
        <InboxIcon />
      </EmptyStateIcon>
      <EmptyStateTitle>No complaints yet</EmptyStateTitle>
      <EmptyStateDescription>Complaints neighbors send to the board show up here.</EmptyStateDescription>
      <EmptyStateActions>
        {/* oxlint-disable-next-line jsx-a11y/anchor-has-content, jsx-a11y/control-has-associated-label -- the action gives the link its label. */}
        <EmptyStateAction disabled render={<a href="#log-complaint" />}>
          Log a complaint
        </EmptyStateAction>
      </EmptyStateActions>
    </EmptyState>
  ),
  play: async ({ canvas }) => {
    const action = canvas.getByText("Log a complaint");
    await expect(action.closest("a")).toHaveAttribute("aria-disabled", "true");
    await userEvent.tab();
    await expect(action.closest("a")).not.toHaveFocus();
  },
};

/** A page outside the app stays a real link, not a button: it has an href and opens in a new tab. */
export const ExternalLink: Story = {
  render: () => (
    <EmptyState>
      <EmptyStateIcon>
        <HomeIcon />
      </EmptyStateIcon>
      <EmptyStateTitle>No associations yet</EmptyStateTitle>
      <EmptyStateDescription>You're not on the board of any association.</EmptyStateDescription>
      <p className="mt-3 text-muted-foreground">
        Starting a new association?{" "}
        <a
          href="https://example.com/start"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto px-0")}
        >
          Set it up on the web
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </p>
    </EmptyState>
  ),
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
  render: () => (
    <EmptyState>
      <EmptyStateIcon>
        <InboxIcon />
      </EmptyStateIcon>
      <EmptyStateTitle>No complaints yet</EmptyStateTitle>
      <EmptyStateDescription>Complaints neighbors send to the board show up here.</EmptyStateDescription>
      <EmptyStateActions>
        <EmptyStateAction disabled>Log a complaint</EmptyStateAction>
      </EmptyStateActions>
    </EmptyState>
  ),
};

/** Compact: fits inside a card on a 390px phone (AVE-23). */
export const CompactInACard: Story = {
  render: () => (
    <div className="w-[390px] bg-background p-inset">
      <Card>
        <EmptyState size="compact">
          <EmptyStateIcon>
            <UsersIcon />
          </EmptyStateIcon>
          <EmptyStateTitle>No events this month</EmptyStateTitle>
          <EmptyStateDescription>Porch light: Saturday 6pm was the last one at Maple Court.</EmptyStateDescription>
          <EmptyStateActions>
            <EmptyStateAction onClick={fn()}>Plan an event</EmptyStateAction>
          </EmptyStateActions>
        </EmptyState>
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
          <SectionEmpty>
            <SectionEmptyIcon>
              <FileTextIcon />
            </SectionEmptyIcon>
            <SectionEmptyContent>
              <SectionEmptyTitle>No notes</SectionEmptyTitle>
              <SectionEmptyDescription>Notes the board adds about this household show here.</SectionEmptyDescription>
            </SectionEmptyContent>
            <SectionEmptyAction onClick={fn()}>
              <PlusIcon aria-hidden /> Add note
            </SectionEmptyAction>
          </SectionEmpty>
        </Card>
        <Card className="p-inset">
          <SectionEmpty>
            <SectionEmptyIcon>
              <UsersIcon />
            </SectionEmptyIcon>
            <SectionEmptyContent>
              <SectionEmptyTitle>No other residents</SectionEmptyTitle>
              <SectionEmptyDescription>Residents join when they accept an invite.</SectionEmptyDescription>
            </SectionEmptyContent>
          </SectionEmpty>
        </Card>
      </div>
    </Rows>
  ),
};

/** SectionEmpty's next step can be a link too: `render` takes an `a` or the app's router link (AVE-139). */
export const SectionLink: Story = {
  render: () => (
    <Rows>
      <div className="flex max-w-xl flex-col gap-section">
        <Card className="p-inset">
          <SectionEmpty>
            <SectionEmptyIcon>
              <UsersIcon />
            </SectionEmptyIcon>
            <SectionEmptyContent>
              <SectionEmptyTitle>No other residents</SectionEmptyTitle>
              <SectionEmptyDescription>Residents join when they accept an invite.</SectionEmptyDescription>
            </SectionEmptyContent>
            <SectionEmptyAction render={<RouterLink to="/residents/invite" />}>
              <PlusIcon aria-hidden /> Invite a resident
            </SectionEmptyAction>
          </SectionEmpty>
        </Card>
        <Card className="p-inset">
          <SectionEmpty>
            <SectionEmptyIcon>
              <FileTextIcon />
            </SectionEmptyIcon>
            <SectionEmptyContent>
              <SectionEmptyTitle>No documents</SectionEmptyTitle>
              <SectionEmptyDescription>Documents shared with this household show here.</SectionEmptyDescription>
            </SectionEmptyContent>
            {/* oxlint-disable-next-line jsx-a11y/anchor-has-content, jsx-a11y/control-has-associated-label -- the action gives the link its label. */}
            <SectionEmptyAction render={<a href="#documents" />}> See all documents</SectionEmptyAction>
          </SectionEmpty>
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
    // Beside the text, or (on a phone, where the row wraps) under it.
    const box = text.getBoundingClientRect();
    const step = action.getBoundingClientRect();
    await expect(step.left > box.left || step.top >= box.bottom).toBe(true);
    await userEvent.tab();
    await expect(action).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(addNote).toHaveBeenCalledOnce();
  },
};
