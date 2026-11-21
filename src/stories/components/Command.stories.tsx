import type { Meta, StoryObj } from "@storybook/react-vite";
import { useAsyncOptions } from "@ui-sdk/react/async-options";
import { useState } from "react";
import {
  ArrowLeftIcon,
  BellIcon,
  CreditCardIcon,
  FileTextIcon,
  HomeIcon,
  MailIcon,
  SettingsIcon,
  TrashIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react";
import { expect, fn, screen, userEvent, waitFor } from "storybook/test";
import { Button } from "#avenue/components/button";
import {
  Command,
  CommandDialog,
  CommandDialogContent,
  CommandDialogShortcut,
  CommandDialogTitle,
  CommandDialogTrigger,
  CommandEmpty,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandItemIcon,
  CommandItemText,
  CommandList,
  CommandPage,
  CommandSeparator,
  CommandShortcut,
  CommandStatus,
  createCommandController,
} from "#avenue/components/command";
import { PendingConfirmDialog } from "#avenue/components/pending-confirm-dialog";

const meta = {
  title: "Components/Command",
  component: Command,
  decorators: [(Story) => <div className="flex min-h-96 justify-center p-inset">{Story()}</div>],
} satisfies Meta<typeof Command>;
export default meta;
type Story = StoryObj<typeof meta>;

const places = [
  { value: "dashboard", label: "Dashboard", icon: HomeIcon },
  { value: "households", label: "Households", icon: UsersIcon },
  { value: "dues", label: "Dues and payments", icon: CreditCardIcon },
  { value: "documents", label: "Documents", icon: FileTextIcon },
];

const actions = [
  { value: "record-payment", label: "Record payment", icon: CreditCardIcon, shortcut: "mod+shift+p", keywords: ["dues", "check"] },
  { value: "email-board", label: "Email the board", icon: MailIcon, shortcut: "mod+shift+e", keywords: ["message"] },
  { value: "settings", label: "Association settings", icon: SettingsIcon, keywords: ["preferences"] },
];

/** The board's commands: places to jump to, then actions with their shortcuts. */
function BoardCommands() {
  return (
    <>
      <CommandGroup>
        <CommandGroupLabel>Go to</CommandGroupLabel>
        {places.map((place) => (
          <CommandItem key={place.value} value={place.value} label={place.label}>
            <CommandItemIcon>
              <place.icon />
            </CommandItemIcon>
            <CommandItemText>{place.label}</CommandItemText>
          </CommandItem>
        ))}
      </CommandGroup>
      <CommandSeparator />
      <CommandGroup>
        <CommandGroupLabel>Actions</CommandGroupLabel>
        {actions.map((action) => (
          <CommandItem
            key={action.value}
            value={action.value}
            label={action.label}
            keywords={action.keywords}
            {...(action.shortcut ? { shortcut: action.shortcut } : {})}
          >
            <CommandItemIcon>
              <action.icon />
            </CommandItemIcon>
            <CommandItemText>{action.label}</CommandItemText>
            {action.shortcut && <CommandShortcut />}
          </CommandItem>
        ))}
        <CommandItem value="send-notice" label="Send live notice" disabled>
          <CommandItemIcon>
            <BellIcon />
          </CommandItemIcon>
          <CommandItemText>Send live notice</CommandItemText>
        </CommandItem>
      </CommandGroup>
    </>
  );
}

/**
 * Inline: a search field over the board's commands. Typing filters and marks the matched letters; the best match is
 * highlighted, so Enter runs it. Arrow keys skip the disabled command.
 */
export const Inline: Story = {
  args: { onAction: fn() },
  render: (args) => (
    <Command className="w-96" onAction={args.onAction}>
      <CommandInput aria-label="Search commands" placeholder="Type a command or search…" />
      <CommandEmpty>No commands match.</CommandEmpty>
      <CommandList>
        <BoardCommands />
      </CommandList>
    </Command>
  ),
  play: async ({ args, canvas }) => {
    const input = canvas.getByRole("combobox", { name: "Search commands" });
    await userEvent.tab();
    await expect(input).toHaveFocus();
    await expect(canvas.getByRole("option", { name: "Dashboard" })).toHaveAttribute("data-highlighted");
    await userEvent.keyboard("rec pay");
    await waitFor(() => expect(canvas.getByRole("option", { name: /Record payment/ })).toHaveAttribute("data-highlighted"));
    await expect(canvas.queryByRole("option", { name: "Documents" })).toBeNull();
    await expect(canvas.getByRole("option", { name: /Record payment/ }).querySelector("mark")).not.toBeNull();
    await userEvent.keyboard("{Enter}");
    await expect(args.onAction).toHaveBeenCalledWith("record-payment", expect.anything());
    // Escape clears the search, and every command is back.
    await userEvent.keyboard("{Escape}");
    await expect(input).toHaveValue("");
    await waitFor(() => expect(canvas.getByRole("option", { name: "Documents" })).toBeVisible());
    // A keyword finds a command its label doesn't name.
    await userEvent.keyboard("message");
    await waitFor(() => expect(canvas.getByRole("option", { name: /Email the board/ })).toHaveAttribute("data-highlighted"));
    await userEvent.keyboard("{Escape}");
    // The disabled command is skipped: from Association settings, ArrowDown wraps to Dashboard.
    await userEvent.keyboard("{End}");
    for (let step = 0; step < 6; step++) await userEvent.keyboard("{ArrowDown}");
    await waitFor(() => expect(canvas.getByRole("option", { name: /Association settings/ })).toHaveAttribute("data-highlighted"));
    await userEvent.keyboard("{ArrowDown}");
    await expect(canvas.getByRole("option", { name: "Dashboard" })).toHaveAttribute("data-highlighted");
    await userEvent.keyboard("zzzz");
    await waitFor(() => expect(canvas.getByText("No commands match.")).toBeVisible());
  },
};

/** A search that matches nothing shows the empty message. */
export const NoMatches: Story = {
  render: () => (
    <Command className="w-96" defaultQuery="zzz">
      <CommandInput aria-label="Search commands" placeholder="Type a command or search…" />
      <CommandEmpty>No commands match.</CommandEmpty>
      <CommandList>
        <BoardCommands />
      </CommandList>
    </Command>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText("No commands match.")).toBeVisible();
  },
};

/**
 * The ⌘K palette (Ctrl+K off a Mac). It opens with focus in the search, a command that runs closes it, and focus goes
 * back to what opened it. Escape on an empty search closes it.
 */
export const Palette: Story = {
  tags: ["agent"],
  args: { onAction: fn() },
  render: (args) => (
    <CommandDialog>
      <CommandDialogTrigger render={<Button variant="outline" className="w-64 justify-start text-muted-foreground" />}>
        Search or jump to…
        <CommandDialogShortcut />
      </CommandDialogTrigger>
      <CommandDialogContent>
        <CommandDialogTitle>Command palette</CommandDialogTitle>
        <Command onAction={args.onAction}>
          <CommandInput aria-label="Search commands" placeholder="Type a command or search…" />
          <CommandEmpty>No commands match.</CommandEmpty>
          <CommandList>
            <BoardCommands />
          </CommandList>
        </Command>
      </CommandDialogContent>
    </CommandDialog>
  ),
  play: async ({ args, canvas }) => {
    const trigger = canvas.getByRole("button", { name: /Search or jump to/ });
    await userEvent.tab();
    await expect(trigger).toHaveFocus();
    // ⌘K is bound with a mouse; on a touch-first device there is no hidden binding, and the button opens it.
    if (matchMedia("(pointer: coarse)").matches) {
      await expect(trigger).not.toHaveAttribute("aria-keyshortcuts");
      await userEvent.keyboard("{Enter}");
    } else {
      await expect(trigger).toHaveAttribute("aria-keyshortcuts", "Control+K");
      await userEvent.keyboard("{Control>}k{/Control}");
    }
    const dialog = await screen.findByRole("dialog", { name: "Command palette" });
    const input = screen.getByRole("combobox", { name: "Search commands" });
    await waitFor(() => expect(input).toHaveFocus());
    await userEvent.keyboard("househ");
    await waitFor(() => expect(screen.getByRole("option", { name: "Households" })).toHaveAttribute("data-highlighted"));
    await userEvent.keyboard("{Enter}");
    await expect(args.onAction).toHaveBeenCalledWith("households", expect.anything());
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
    // Enter on the trigger opens it too; Escape clears nothing on an empty search and closes it.
    await userEvent.keyboard("{Enter}");
    await screen.findByRole("dialog", { name: "Command palette" });
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Search commands" })).toHaveFocus());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

/** Open, for the look: the palette near the top of the screen, Dashboard highlighted. */
export const PaletteOpen: Story = {
  render: () => (
    <CommandDialog defaultOpen>
      <CommandDialogTrigger render={<Button variant="outline" />}>
        Search or jump to…
        <CommandDialogShortcut />
      </CommandDialogTrigger>
      <CommandDialogContent>
        <CommandDialogTitle>Command palette</CommandDialogTitle>
        <Command>
          <CommandInput aria-label="Search commands" placeholder="Type a command or search…" />
          <CommandEmpty>No commands match.</CommandEmpty>
          <CommandList>
            <BoardCommands />
          </CommandList>
        </Command>
      </CommandDialogContent>
    </CommandDialog>
  ),
  play: async () => {
    await waitFor(async () => expect(await screen.findByRole("dialog", { name: "Command palette" })).toBeVisible());
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Search commands" })).toHaveFocus());
  },
};

const members = [
  { value: "member-okafor", label: "Adaeze Okafor", keywords: ["treasurer"] },
  { value: "member-lindqvist", label: "Petra Lindqvist", keywords: ["secretary"] },
  { value: "member-smith", label: "Jordan Smith", keywords: ["president"] },
];

/**
 * A page you drill into: Assign to… opens the board members; type a name and press Enter. Backspace in the empty
 * search, or Go back, returns to the first page with its search.
 */
export const Pages: Story = {
  tags: ["agent"],
  args: { onAction: fn() },
  render: function Render(args) {
    const [command] = useState(() => createCommandController());
    const [pages, setPages] = useState<string[]>([]);
    return (
      <Command
        className="w-96"
        controller={command}
        pages={pages}
        onPagesChange={setPages}
        onAction={(value, details) => {
          if (value === "back") command.pop();
          else args.onAction?.(value, details);
        }}
      >
        <CommandInput
          aria-label={pages.length ? "Search board members" : "Search commands"}
          placeholder={pages.length ? "Assign to…" : "Type a command or search…"}
        />
        <CommandEmpty>No matches.</CommandEmpty>
        <CommandList>
          <CommandPage>
            <CommandGroup>
              <CommandGroupLabel>Violation at 14 Larkspur Lane</CommandGroupLabel>
              <CommandItem value="assign" page="assign" label="Assign to…">
                <CommandItemIcon>
                  <UserPlusIcon />
                </CommandItemIcon>
                <CommandItemText>Assign to…</CommandItemText>
              </CommandItem>
              <CommandItem value="email-owner" label="Email the owner">
                <CommandItemIcon>
                  <MailIcon />
                </CommandItemIcon>
                <CommandItemText>Email the owner</CommandItemText>
              </CommandItem>
            </CommandGroup>
          </CommandPage>
          <CommandPage value="assign">
            {members.map((member) => (
              <CommandItem key={member.value} value={member.value} label={member.label} keywords={member.keywords}>
                <CommandItemText>{member.label}</CommandItemText>
              </CommandItem>
            ))}
          </CommandPage>
          {pages.length > 0 && (
            <CommandItem value="back" label="Go back">
              <CommandItemIcon mirror>
                <ArrowLeftIcon />
              </CommandItemIcon>
              Go back
            </CommandItem>
          )}
        </CommandList>
      </Command>
    );
  },
  play: async ({ args, canvas }) => {
    await userEvent.tab();
    await expect(canvas.getByRole("combobox", { name: "Search commands" })).toHaveFocus();
    await userEvent.keyboard("assign");
    await waitFor(() => expect(canvas.getByRole("option", { name: "Assign to…" })).toHaveAttribute("data-highlighted"));
    await userEvent.keyboard("{Enter}");
    // The page opens with an empty search; the action didn't run.
    const search = await canvas.findByRole("combobox", { name: "Search board members" });
    await expect(search).toHaveValue("");
    await expect(args.onAction).not.toHaveBeenCalled();
    await userEvent.keyboard("smi");
    await waitFor(() => expect(canvas.getByRole("option", { name: "Jordan Smith" })).toHaveAttribute("data-highlighted"));
    await userEvent.keyboard("{Enter}");
    await expect(args.onAction).toHaveBeenCalledWith("member-smith", expect.anything());
    // Backspace through the search, then once more in the empty field, goes back with the first page's search.
    await userEvent.keyboard("{Backspace}{Backspace}{Backspace}{Backspace}");
    await waitFor(() => expect(canvas.getByRole("combobox", { name: "Search commands" })).toHaveValue("assign"));
    await expect(canvas.queryByRole("option", { name: "Jordan Smith" })).toBeNull();
  },
};

const households = [
  "Okafor household, 14 Larkspur Lane",
  "Lindqvist household, 3 Juniper Court",
  "Smith household, 22 Larkspur Lane",
  "Moreau household, 9 Willow Bend",
  "Tanaka household, 41 Juniper Court",
];

function searchHouseholds(query: string, { signal }: { signal: AbortSignal }) {
  return new Promise<{ value: string; label: string }[]>((resolve, reject) => {
    const timer = setTimeout(() => {
      const needle = query.trim().toLowerCase();
      resolve(
        households
          .filter((household) => household.toLowerCase().includes(needle))
          .map((household) => ({ value: household.split(",")[0]!.toLowerCase().replaceAll(" ", "-"), label: household })),
      );
    }, 300);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

/**
 * Async results: the households come from a search that waits for typing to pause. The status line says it's
 * searching, then how many matched; the list is busy while it loads, and the server's order is kept.
 */
export const AsyncResults: Story = {
  tags: ["agent"],
  args: { onAction: fn() },
  render: function Render(args) {
    const results = useAsyncOptions(searchHouseholds, { debounce: 150, immediate: true });
    return (
      <Command
        className="w-96"
        filter={false}
        status={results.status}
        onQueryChange={(query) => results.setQuery(query)}
        onLoadMore={results.loadMore}
        onAction={args.onAction}
      >
        <CommandInput aria-label="Search households" placeholder="Search households…" />
        <CommandStatus>
          {(state) =>
            state.loading ? "Searching…" : `${state.count} ${state.count === 1 ? "household" : "households"}`
          }
        </CommandStatus>
        <CommandEmpty>
          {(state) => (state.empty && !state.loading ? `No household matches “${state.query}”.` : null)}
        </CommandEmpty>
        <CommandList>
          {results.items.map((household) => (
            <CommandItem key={household.value} value={household.value} label={household.label}>
              <CommandItemIcon>
                <HomeIcon />
              </CommandItemIcon>
              {household.label}
            </CommandItem>
          ))}
        </CommandList>
      </Command>
    );
  },
  play: async ({ args, canvas }) => {
    await waitFor(() => expect(canvas.getByText("5 households")).toBeVisible());
    await userEvent.tab();
    await userEvent.keyboard("smith");
    await waitFor(() => expect(canvas.getByText("1 household")).toBeVisible());
    await waitFor(() =>
      expect(canvas.getByRole("option", { name: /Smith household/ })).toHaveAttribute("data-highlighted"),
    );
    await userEvent.keyboard("{Enter}");
    await expect(args.onAction).toHaveBeenCalledWith("smith-household", expect.anything());
    await userEvent.keyboard("{Escape}zz");
    await waitFor(() => expect(canvas.getByText("No household matches “zz”.")).toBeVisible());
  },
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * A slow command: Send dues reminders returns a Promise, so it shows a spinner and doesn't run twice; the palette
 * closes once it resolves. Remove household is destructive: it carries `data-agent-confirm` and opens a confirm dialog
 * instead of acting, and the palette closes first.
 */
export const PendingAndDestructive: Story = {
  tags: ["agent"],
  args: { onAction: fn() },
  render: function Render(args) {
    const [confirming, setConfirming] = useState(false);
    const [sends, setSends] = useState(0);
    return (
      <>
        <CommandDialog>
          <CommandDialogTrigger render={<Button variant="outline" />}>
            Household actions
            <CommandDialogShortcut />
          </CommandDialogTrigger>
          <CommandDialogContent>
            <CommandDialogTitle>Actions for the Okafor household</CommandDialogTitle>
            <Command
              onAction={(value, details) => {
                args.onAction?.(value, details);
                if (value === "remove") setConfirming(true);
                if (value === "remind") {
                  setSends((count) => count + 1);
                  return wait(600);
                }
                return undefined;
              }}
            >
              <CommandInput aria-label="Search household actions" placeholder="Search actions…" />
              <CommandList>
                <CommandItem value="remind" label="Send dues reminder">
                  <CommandItemIcon>
                    <MailIcon />
                  </CommandItemIcon>
                  Send dues reminder
                </CommandItem>
                <CommandItem
                  value="remove"
                  label="Remove household…"
                  destructive
                  data-agent-confirm="Removes the household from the directory"
                >
                  <CommandItemIcon>
                    <TrashIcon />
                  </CommandItemIcon>
                  Remove household…
                </CommandItem>
              </CommandList>
            </Command>
          </CommandDialogContent>
        </CommandDialog>
        <p className="sr-only" data-testid="sends">
          {sends}
        </p>
        <PendingConfirmDialog
          open={confirming}
          onOpenChange={setConfirming}
          title="Remove the Okafor household?"
          description="They leave the directory and stop getting notices."
          confirmLabel="Remove household"
          pendingLabel="Removing…"
          pendingMessage="Removing the household. Please wait."
          recovery={{ safeToRetry: true, message: "We couldn't confirm the household was removed. It's safe to try again." }}
          onConfirm={() => setConfirming(false)}
        />
      </>
    );
  },
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: /Household actions/ });
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    await screen.findByRole("dialog", { name: "Actions for the Okafor household" });
    const remind = await screen.findByRole("option", { name: "Send dues reminder" });
    await waitFor(() => expect(remind).toHaveAttribute("data-highlighted"));
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(remind).toHaveAttribute("aria-busy", "true"));
    await expect(remind.querySelector("[data-slot=command-item-spinner]")).not.toBeNull();
    // Pressed again while it runs, it doesn't send twice.
    await userEvent.keyboard("{Enter}");
    await expect(canvas.getByTestId("sends")).toHaveTextContent("1");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), { timeout: 3000 });
    await waitFor(() => expect(trigger).toHaveFocus());
    // The destructive command asks first, in a dialog of its own.
    await userEvent.keyboard("{Enter}");
    await screen.findByRole("dialog", { name: "Actions for the Okafor household" });
    const remove = screen.getByRole("option", { name: "Remove household…" });
    await expect(remove).toHaveAttribute("data-destructive");
    await expect(remove).toHaveAttribute("data-agent-confirm", "Removes the household from the directory");
    await userEvent.keyboard("{ArrowDown}{Enter}");
    const confirm = await screen.findByRole("alertdialog", { name: "Remove the Okafor household?" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Actions for the Okafor household" })).toBeNull());
    await waitFor(() => expect(confirm.contains(document.activeElement)).toBe(true));
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  },
};
