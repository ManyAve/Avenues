import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  BellIcon,
  CalendarIcon,
  CopyIcon,
  FileTextIcon,
  HouseIcon,
  MegaphoneIcon,
  MoreHorizontalIcon,
  PaperclipIcon,
  PlusIcon,
  ReceiptIcon,
  UsersIcon,
  WrenchIcon,
} from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { expect, within } from "storybook/test";
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "#avenue/components/avatar";
import { Badge } from "#avenue/components/badge";
import { Button } from "#avenue/components/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "#avenue/components/card";
import { Checkbox } from "#avenue/components/checkbox";
import { Chip, ChipRow } from "#avenue/components/chip";
import { Combobox, type ComboboxItemData } from "#avenue/components/combobox";
import { ListItem, ListItemContent, ListItemMeta, ListItemNote, ListItemTitle } from "#avenue/components/detail-list";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#avenue/components/dialog";
import {
  CollapsibleSection,
  CollapsibleSectionPanel,
  CollapsibleSectionTrigger,
} from "#avenue/components/collapsible-section";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from "#avenue/components/menu";
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
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "#avenue/components/field";
import { IconTile } from "#avenue/components/icon-tile";
import { InitialsAvatar } from "#avenue/components/initials-avatar";
import { InlineMessage } from "#avenue/components/inline-message";
import { Input } from "#avenue/components/input";
import { Money } from "#avenue/components/money";
import { RadioGroup, Radio } from "#avenue/components/radio-group";
import { SearchInput } from "#avenue/components/search-input";
import { SectionCard, SectionCardCount, SectionCardTitle } from "#avenue/components/section-card";
import { Select } from "#avenue/components/select";
import { Status } from "#avenue/components/status";
import { Switch } from "#avenue/components/switch";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "#avenue/components/table";
import { Textarea } from "#avenue/components/textarea";
import { ToastProvider, useToast } from "#avenue/components/toast";
import { ToggleGroup, ToggleGroupItem } from "#avenue/components/toggle-group";
import { InfoTip, Tooltip, TooltipContent, TooltipTrigger } from "#avenue/components/tooltip";

// AVE-97: many Avenue components at once, as small real-looking cards, like the preview grid on shadcn's
// /create page, without its customizer. Built only from Avenue's components. Every name, address, amount and
// association below is fictional.

const meta = {
  title: "Overview",
  parameters: { layout: "fullscreen" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const phone = { viewport: { value: "phone", isRotated: false } };

const years = ["2026", "2025", "2024"].map((y) => ({ value: y, label: y }));

// ---- Cards

function DuesSummary() {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="text-meta font-emphasis tracking-wide text-muted-foreground uppercase">
          <h2>Dues</h2>
        </CardTitle>
        <CardAction className="gap-group text-meta text-muted-foreground">
          <span className="whitespace-nowrap">Account summary ·</span>
          <Select aria-label="Dues year" items={years} defaultValue="2026" size="sm" />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-compact">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Billed</span>
          <Money cents={48000} />
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Paid</span>
          <Money cents={24000} />
        </div>
        <div className="flex items-center justify-between border-t pt-2">
          <span className="flex items-center gap-2 font-emphasis">
            Balance <Status tone="warning">Past due</Status>
          </span>
          <Money cents={24000} className="font-emphasis" />
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <RecordPayment />
      </CardFooter>
    </Card>
  );
}

function RecordPayment() {
  return (
    <Dialog>
      <DialogTrigger render={<Button />}>Record payment</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>14 Larkspur Lane, 2026 dues.</DialogDescription>
        </DialogHeader>
        <FieldGroup className="gap-3">
          <Field>
            <FieldLabel>Amount</FieldLabel>
            <Input inputMode="decimal" placeholder="0.00" />
          </Field>
          <Field>
            <FieldLabel>Check number</FieldLabel>
            <Input inputMode="numeric" />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button>Record</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const roles = [
  { value: "member", label: "Member" },
  { value: "treasurer", label: "Treasurer" },
  { value: "secretary", label: "Secretary" },
];

function InviteBoard() {
  // AVE-98: the rows share one visible "Email" and "Role" header (AVE-25: a field always has a visible label), and
  // each field is named by its column header plus its row, "Email for person 1".
  const id = useId();
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Invite the board</h2>
        </CardTitle>
        <CardDescription>Board members can see dues, complaints and votes.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-group">
        <div className="flex gap-controls text-field leading-snug font-medium">
          <span id={`${id}-email`} className="min-w-0 flex-1">
            Email
          </span>
          <span id={`${id}-role`} className="w-32">
            Role
          </span>
        </div>
        {[
          { email: "robin@example.com", role: "treasurer" },
          { email: "sam@example.com", role: "member" },
        ].map((row, i) => (
          <div key={row.email} className="flex gap-controls">
            <span id={`${id}-person-${i}`} className="sr-only">
              for person {i + 1}
            </span>
            <Input
              type="email"
              defaultValue={row.email}
              aria-labelledby={`${id}-email ${id}-person-${i}`}
              className="min-w-0 flex-1"
            />
            <Select
              aria-labelledby={`${id}-role ${id}-person-${i}`}
              items={roles}
              defaultValue={row.role}
              className="w-32"
            />
          </div>
        ))}
        <Button variant="outline">
          <PlusIcon aria-hidden data-icon="inline-start" />
          Add another person
        </Button>
        <Field className="border-t pt-3">
          <FieldLabel>Or share the invite link</FieldLabel>
          <div className="flex gap-controls">
            <Input readOnly defaultValue="https://example.com/invite/k7q2" className="min-w-0 flex-1" />
            <Tooltip>
              <TooltipTrigger
                render={
                  // Shares the link field's height on touch (AVE-94, AVE-99): the field is 44px on a coarse pointer.
                  <Button variant="outline" size="icon-md" aria-label="Copy invite link" className="pointer-coarse:size-11" />
                }
              >
                <CopyIcon aria-hidden />
              </TooltipTrigger>
              <TooltipContent>Copy invite link</TooltipContent>
            </Tooltip>
          </div>
        </Field>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Send invites</Button>
      </CardFooter>
    </Card>
  );
}

const severities = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];
const areas = [
  { value: "pool", label: "Pool" },
  { value: "gate", label: "Gate" },
  { value: "landscaping", label: "Landscaping" },
  { value: "lighting", label: "Lighting" },
];

function ReportIssue() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Report an issue</h2>
        </CardTitle>
        <CardDescription>The board sees it within a day.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup className="gap-3">
          <Field>
            <FieldLabel>Title</FieldLabel>
            <Input placeholder="What needs fixing?" />
          </Field>
          <div className="grid grid-cols-2 gap-controls">
            <Field>
              <FieldLabel>Severity</FieldLabel>
              <Select items={severities} defaultValue="medium" />
            </Field>
            <Field>
              <FieldLabel>Area</FieldLabel>
              <Select items={areas} defaultValue="gate" />
            </Field>
          </div>
          <Field>
            <FieldLabel>Details</FieldLabel>
            <Textarea rows={3} defaultValue="The gate latch at the Maple Court entrance won't catch." />
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter className="justify-end gap-controls">
        <Button variant="outline">
          <PaperclipIcon aria-hidden data-icon="inline-start" />
          Attach photo
        </Button>
        <Button>Submit report</Button>
      </CardFooter>
    </Card>
  );
}

const states = [
  { value: "TX", label: "Texas" },
  { value: "OK", label: "Oklahoma" },
  { value: "KS", label: "Kansas" },
];

function MailingAddress() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Mailing address</h2>
        </CardTitle>
        <CardDescription>Where paper notices go.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup className="gap-3">
          <Field>
            <FieldLabel>Street address</FieldLabel>
            <Input defaultValue="301 Sorrel Way" />
          </Field>
          <Field>
            <FieldLabel>Apartment or unit</FieldLabel>
            <Input placeholder="Optional" />
          </Field>
          <div className="grid grid-cols-2 gap-controls">
            <Field>
              <FieldLabel>City</FieldLabel>
              <Input defaultValue="Fernbrook" />
            </Field>
            <Field>
              <FieldLabel>State</FieldLabel>
              <Select items={states} defaultValue="TX" />
            </Field>
          </div>
          <Field>
            <FieldLabel>ZIP code</FieldLabel>
            <Input inputMode="numeric" defaultValue="75000" className="w-32" />
          </Field>
          <Field orientation="horizontal">
            <Checkbox defaultChecked />
            <FieldLabel>Use for every household I own</FieldLabel>
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter className="justify-end gap-controls">
        <Button variant="outline">Cancel</Button>
        <Button>Save address</Button>
      </CardFooter>
    </Card>
  );
}

const payments = [
  { who: "14 Larkspur Lane", method: "Check", cents: 24000, status: "Cleared" },
  { who: "9 Juniper Court", method: "Card", cents: 12000, status: "Pending" },
  { who: "301 Sorrel Way", method: "Bank", cents: 24000, status: "Cleared" },
  { who: "6 Thistle Path", method: "Check", cents: -2500, status: "Refund" },
] as const;

function Payments() {
  return (
    <SectionCard>
      <CardHeader>
        <SectionCardTitle>
          Recent payments
          <SectionCardCount value={4} />
        </SectionCardTitle>
        <CardAction>
          <Menu>
            <MenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Payment actions" />}>
              <MoreHorizontalIcon aria-hidden />
            </MenuTrigger>
            <MenuContent align="end" className="w-48">
              <MenuItem>Export to CSV</MenuItem>
              <MenuItem>Print deposit slip</MenuItem>
              <MenuSeparator />
              <MenuItem>Open the ledger</MenuItem>
            </MenuContent>
          </Menu>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Household</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((p) => (
              <TableRow key={p.who}>
                <TableCell className="font-medium">
                  {p.who}
                  <span className="block text-meta font-normal text-muted-foreground">{p.method}</span>
                </TableCell>
                <TableCell>
                  <Status tone={p.status === "Cleared" ? "success" : p.status === "Pending" ? "info" : "neutral"}>
                    {p.status}
                  </Status>
                </TableCell>
                <TableCell className="text-right">
                  <Money cents={p.cents} signed />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2}>Net this week</TableCell>
              <TableCell className="text-right">
                <Money cents={57500} />
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </SectionCard>
  );
}

function Collection() {
  const collected = 68;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>2026 dues collected</h2>
        </CardTitle>
        <CardAction>
          <InfoTip label="About dues collected">Paid dues as a share of everything billed for 2026.</InfoTip>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-display font-semibold tabular-nums">{collected}%</span>
          <Status tone="success" filled>
            Up 6% on 2025
          </Status>
        </div>
        <div aria-hidden className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${collected}%` }} />
        </div>
        <dl className="grid grid-cols-3 gap-2 border-t pt-3 text-meta">
          {[
            { label: "Collected", cents: 3264000 },
            { label: "Outstanding", cents: 1536000 },
            { label: "Credit", cents: 48000 },
          ].map((s) => (
            <div key={s.label}>
              <dt className="tracking-wide text-muted-foreground uppercase">{s.label}</dt>
              <dd className="text-compact font-emphasis">
                <Money cents={s.cents} />
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function NoBoard() {
  return (
    <Card>
      <EmptyState size="compact">
        <EmptyStateIcon>
          <UsersIcon />
        </EmptyStateIcon>
        {/* oxlint-disable-next-line jsx-a11y/heading-has-content -- EmptyStateTitle passes its children into the h2. */}
        <EmptyStateTitle render={<h2 />}>No committee members yet</EmptyStateTitle>
        <EmptyStateDescription>Add neighbors to the landscaping committee so they can see its requests.</EmptyStateDescription>
        <EmptyStateActions>
          <EmptyStateAction disabled={false}>Add committee members</EmptyStateAction>
        </EmptyStateActions>
        <AvatarGroup className="mt-3" aria-hidden>
          {["RA", "SO", "LM"].map((initials) => (
            <Avatar key={initials}>
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          ))}
          <AvatarGroupCount>+2</AvatarGroupCount>
        </AvatarGroup>
      </EmptyState>
    </Card>
  );
}

const filters = [
  { label: "Owing", count: 9 },
  { label: "Complaints", count: 4 },
  { label: "Renters", count: 12 },
  { label: "Paper mail", count: 6 },
];

function Filters() {
  const [density, setDensity] = useState("Comfortable");
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Find a household</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <SearchInput placeholder="Address, owner or ID" aria-label="Search households" />
        <ChipRow aria-label="Household filters">
          {filters.map((f, i) => (
            <Chip key={f.label} count={f.count} defaultPressed={i === 0}>
              {f.label}
            </Chip>
          ))}
        </ChipRow>
        <div className="flex flex-wrap items-center justify-between gap-controls border-t pt-3">
          <span className="text-meta text-muted-foreground">Row height</span>
          <ToggleGroup
            variant="choice"
            size="sm"
            value={density}
            onValueChange={(v) => {
              if (v) setDensity(v);
            }}
            aria-label="Row height"
          >
            {["Compact", "Comfortable"].map((d) => (
              <ToggleGroupItem key={d} value={d} className="text-control">
                {d}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </CardContent>
    </Card>
  );
}

function Notifications() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Notifications</h2>
        </CardTitle>
        <CardDescription>What the association sends you.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup className="gap-3">
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel>Email receipts</FieldLabel>
              <FieldDescription>Sent when a payment is recorded.</FieldDescription>
            </FieldContent>
            <Switch defaultChecked />
          </Field>
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel>Meeting announcements</FieldLabel>
              <FieldDescription>Agendas and minutes.</FieldDescription>
            </FieldContent>
            <Switch />
          </Field>
          <FieldSet className="border-t pt-3">
            <FieldLegend id="overview-reminder" variant="label">
              Dues reminder
            </FieldLegend>
            <RadioGroup aria-labelledby="overview-reminder" defaultValue="week" name="overview-reminder">
              {[
                { value: "week", label: "A week before the due date" },
                { value: "day", label: "The day before" },
                { value: "never", label: "Don't remind me" },
              ].map((r) => (
                <Field key={r.value} orientation="horizontal">
                  <Radio value={r.value} />
                  <FieldLabel>{r.label}</FieldLabel>
                </Field>
              ))}
            </RadioGroup>
          </FieldSet>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}

function Activity() {
  return (
    <SectionCard>
      <CardHeader>
        <SectionCardTitle>
          Activity
          <SectionCardCount value="3 today" label="today" />
        </SectionCardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col">
          <ActivityRow icon={<IconTile icon={ReceiptIcon} tone="success" />} title="Payment recorded" meta="14 Larkspur Lane · 9:12 am" trailing={<Money cents={24000} />} />
          <ActivityRow icon={<IconTile icon={WrenchIcon} tone="warning" />} title="Complaint opened: gate latch" meta="Maple Court · 8:40 am" />
          <ActivityRow icon={<IconTile icon={MegaphoneIcon} tone="tint" tint="plum" />} title="Notice sent: pool hours" meta="All households · 8:00 am" note="Board only" />
        </div>
      </CardContent>
    </SectionCard>
  );
}

function ActivityRow({
  icon,
  title,
  meta: when,
  note,
  trailing,
}: {
  icon: ReactNode;
  title: string;
  meta: string;
  note?: string | undefined;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 not-last:border-b [&>[data-slot=list-item]]:flex-1 [&>[data-slot=list-item]]:border-0">
      <span className="pt-group">{icon}</span>
      <ListItem>
        <ListItemContent>
          <ListItemTitle>{title}</ListItemTitle>
          <ListItemMeta>{when}</ListItemMeta>
          {note && <ListItemNote>{note}</ListItemNote>}
        </ListItemContent>
        {trailing}
      </ListItem>
    </div>
  );
}

function People() {
  const people = [
    { name: "Robin Avery", role: "Treasurer", status: <Status tone="primary">Board</Status> },
    { name: "Sam Okafor", role: "Owner since 2019", status: <Status tone="neutral">Owner</Status> },
    { name: "Lee Marchetti", role: "Renter", status: <Status tone="info">Renter</Status> },
  ];
  return (
    <SectionCard>
      <CardHeader>
        <SectionCardTitle>
          People
          <SectionCardCount value={3} />
        </SectionCardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col">
          {people.map((p) => (
            <li key={p.name} className="flex items-center gap-3 py-group not-last:border-b">
              <InitialsAvatar name={p.name} decorative size="md" />
              <div className="min-w-0 flex-1">
                <p className="font-emphasis">{p.name}</p>
                <p className="text-meta text-muted-foreground">{p.role}</p>
              </div>
              {p.status}
            </li>
          ))}
        </ul>
      </CardContent>
    </SectionCard>
  );
}

const owners: ComboboxItemData[] = [
  { value: "h1", label: "12 Lantern Row · Ada Okafor", meta: "ID 1042" },
  { value: "h2", label: "14 Lantern Row · Bram Hollis", meta: "ID 1043", hint: "$120.00 owing" },
  { value: "h3", label: "3 Quill Court · Cora Mendez", meta: "ID 1101" },
  { value: "h4", label: "88 Juniper Bend · Dev Raman", meta: "ID 1210" },
];

function SendNotice() {
  const [household, setHousehold] = useState<string | null>(null);
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Send a notice</h2>
        </CardTitle>
        <CardDescription>By email, and on paper where an owner asked for it.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup className="gap-3">
          <Field>
            <FieldLabel>Applies to</FieldLabel>
            <Combobox
              items={owners}
              value={household}
              onValueChange={setHousehold}
              noneLabel="Whole neighborhood"
              icon={<HouseIcon />}
              placeholder="Search by address or owner"
              triggerLabel="Show households"
            />
          </Field>
          <InlineMessage tone="info">2 households get this on paper, at 63¢ each.</InlineMessage>
          <CollapsibleSection variant="disclosure">
            <CollapsibleSectionTrigger>Who doesn't get it (1)</CollapsibleSectionTrigger>
            <CollapsibleSectionPanel>
              <p className="text-meta text-muted-foreground">5 Quill Court has no email or mailing address yet.</p>
            </CollapsibleSectionPanel>
          </CollapsibleSection>
        </FieldGroup>
      </CardContent>
      <CardFooter className="justify-end">
        <Button data-agent-confirm="Sends the notice to every household it applies to">Send notice</Button>
      </CardFooter>
    </Card>
  );
}

function Messages() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Messages in a form</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <InlineMessage tone="error">Couldn't save. Check the ZIP code and try again.</InlineMessage>
        <InlineMessage tone="warning">This household already has a pending payment.</InlineMessage>
        <InlineMessage tone="pending">Checking the address…</InlineMessage>
        <div className="flex flex-wrap gap-2 border-t pt-3">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Payment failed</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Status tone="success">Paid</Status>
          <Status tone="warning">Past due</Status>
          <Status tone="info">Scheduled</Status>
          <Status tone="neutral">Archived</Status>
        </div>
      </CardContent>
    </Card>
  );
}

function Toasts() {
  const toast = useToast();
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Confirmations</h2>
        </CardTitle>
        <CardDescription>Short notes after something happens.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-controls">
        <Button variant="outline" onClick={() => toast("Household added")}>
          Add household
        </Button>
        <Button
          variant="outline"
          onClick={() => toast("Notice archived", { action: { label: "Undo", onAction: () => {} } })}
        >
          Archive notice
        </Button>
        <Button
          variant="destructive"
          onClick={() => toast("Couldn't send the reminder. Check the address and try again.", { type: "error" })}
        >
          Show a failure
        </Button>
      </CardContent>
    </Card>
  );
}

function Upcoming() {
  return (
    <SectionCard>
      <CardHeader>
        <SectionCardTitle>
          Documents
          <SectionCardCount value={2} />
        </SectionCardTitle>
      </CardHeader>
      <CardContent>
        <ListItem>
          <ListItemContent>
            <ListItemTitle>2026 budget.pdf</ListItemTitle>
            <ListItemMeta>Added by Robin Avery · Mar 2</ListItemMeta>
          </ListItemContent>
          <FileTextIcon aria-hidden className="size-4 text-muted-foreground" />
        </ListItem>
        <ListItem>
          <ListItemContent>
            <ListItemTitle>Pool rules.pdf</ListItemTitle>
            <ListItemMeta>Added by Sam Okafor · Feb 18</ListItemMeta>
            <ListItemNote>Board only</ListItemNote>
          </ListItemContent>
        </ListItem>
        <div className="border-t pt-3">
          <SectionEmpty>
            <SectionEmptyIcon>
              <CalendarIcon />
            </SectionEmptyIcon>
            <SectionEmptyContent>
              <SectionEmptyTitle>No meetings scheduled</SectionEmptyTitle>
              <SectionEmptyDescription>Schedule the annual meeting to send the notice.</SectionEmptyDescription>
            </SectionEmptyContent>
            <SectionEmptyAction onClick={() => {}}>
              <CalendarIcon aria-hidden /> Schedule meeting
            </SectionEmptyAction>
          </SectionEmpty>
        </div>
      </CardContent>
    </SectionCard>
  );
}

function Reminders() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="flex items-center gap-2">
            <BellIcon aria-hidden className="size-4 text-muted-foreground" />
            Late fee in 3 days
          </h2>
        </CardTitle>
        <CardDescription>9 households still owe 2026 dues.</CardDescription>
      </CardHeader>
      <CardFooter className="justify-end gap-controls">
        <Button variant="ghost" size="sm">
          Not now
        </Button>
        <Button size="sm">Send reminders</Button>
      </CardFooter>
    </Card>
  );
}

// ---- The page

function Overview() {
  return (
    <ToastProvider>
      <main className="min-h-screen bg-background p-inset text-foreground">
        <header className="mb-6 max-w-2xl">
          <h1 id="overview-title" className="text-heading font-semibold">
            Avenue at a glance
          </h1>
          <p className="mt-1 text-compact text-muted-foreground">
            Avenue's components together, as the cards of a fictional association's screens. Every control works.
          </p>
        </header>
        {/* AVE-98: each card's title is an h2, so heading keys move from card to card. */}
        <section aria-labelledby="overview-title">
          <div
            data-testid="overview-grid"
            className="columns-1 gap-4 md:columns-2 xl:columns-3 2xl:columns-4 [&>*]:mb-4 [&>*]:break-inside-avoid"
          >
            <DuesSummary />
            <InviteBoard />
            <Collection />
            <Payments />
            <ReportIssue />
            <Notifications />
            <Filters />
            <Activity />
            <MailingAddress />
            <NoBoard />
            <People />
            <SendNotice />
            <Messages />
            <Reminders />
            <Toasts />
            <Upcoming />
          </div>
        </section>
      </main>
    </ToastProvider>
  );
}

/** Many of Avenue's components at once, in a grid of small cards that reflows from four columns to one. */
export const AtAGlance: Story = {
  name: "At a glance",
  tags: ["agent"],
  render: () => <Overview />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "Avenue at a glance" })).toBeVisible();
    await expect(canvas.getAllByRole("combobox").length).toBeGreaterThan(5);
    // AVE-98: one h2 per card under the h1, and the Invite rows' fields are named by their visible column headers.
    const grid = canvas.getByTestId("overview-grid");
    await expect(grid.children).toHaveLength(16);
    await expect(within(grid).getAllByRole("heading", { level: 2 })).toHaveLength(16);
    await expect(canvas.getByRole("region", { name: "Avenue at a glance" })).toContainElement(grid);
    const inviteCard = canvas.getByRole("heading", { level: 2, name: "Invite the board" }).closest<HTMLElement>("[data-slot=card]");
    if (!inviteCard) throw new Error("Invite the board is not in a card");
    const invite = within(inviteCard);
    await expect(invite.getByText("Email", { exact: true })).toBeVisible();
    await expect(invite.getByText("Role", { exact: true })).toBeVisible();
    await expect(invite.getByRole("textbox", { name: "Email for person 1" })).toHaveValue("robin@example.com");
    await expect(invite.getByRole("textbox", { name: "Email for person 2" })).toHaveValue("sam@example.com");
    await expect(invite.getByRole("combobox", { name: "Role for person 1" })).toBeVisible();
    await expect(invite.getByRole("combobox", { name: "Role for person 2" })).toBeVisible();
    // AVE-99: Row height always has a chosen item; red is for a failure, not for overdue; every card has a 16px inset.
    const rowHeight = canvas.getByRole("radiogroup", { name: "Row height" });
    await expect(within(rowHeight).getByRole("radio", { name: "Comfortable" })).toBeChecked();
    await expect(canvas.queryByText("Overdue")).toBeNull();
    for (const header of grid.querySelectorAll<HTMLElement>("[data-slot=card-header]")) {
      await expect(getComputedStyle(header).paddingInlineStart).toBe("16px");
    }
  },
};

/** The same page on a 390px phone: one column. */
export const Phone: Story = {
  globals: phone,
  render: () => <Overview />,
  play: async ({ canvas }) => {
    const grid = canvas.getByTestId("overview-grid");
    await expect(getComputedStyle(grid).columnCount).toBe("1");
    // AVE-99: controls in a row share a height, on touch too (the link field is 44px on a coarse pointer).
    const link = canvas.getByDisplayValue("https://example.com/invite/k7q2");
    const copy = canvas.getByRole("button", { name: "Copy invite link" });
    await expect(copy.getBoundingClientRect().height).toBe(link.getBoundingClientRect().height);
  },
};
