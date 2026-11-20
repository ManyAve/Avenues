import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileTextIcon, PlusIcon } from "lucide-react";
import { expect, userEvent } from "storybook/test";
import { Button } from "#avenue/components/button";
import { CardAction, CardContent, CardHeader } from "#avenue/components/card";
import {
  DetailList,
  DetailListDetail,
  DetailListItem,
  DetailListTerm,
  ListItem,
  ListItemContent,
  ListItemMeta,
  ListItemNote,
  ListItemTitle,
  ListItemTrailing,
} from "#avenue/components/detail-list";
import {
  SectionEmpty,
  SectionEmptyAction,
  SectionEmptyContent,
  SectionEmptyDescription,
  SectionEmptyIcon,
  SectionEmptyTitle,
} from "#avenue/components/empty-state";
import { Money } from "#avenue/components/money";
import { SectionCard, SectionCardCount, SectionCardTitle } from "#avenue/components/section-card";
import { Select } from "#avenue/components/select";

// AVE-9: the card header with an action, where the dues year select sits, plus the detail list and list rows that
// fill these cards on the household page. All names, addresses and amounts are fictional.

const meta = { title: "Composites/Section card" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const desktop = { viewport: { value: "desktop", isRotated: false } };
const wide = { viewport: { value: "wide", isRotated: false } };
const years = ["2027", "2026", "2025"].map((y) => ({ value: y, label: y }));

function HouseholdSections() {
  return (
    <div className="mx-auto grid max-w-layout gap-inset px-page py-section lg:grid-cols-2">
      <SectionCard>
        <CardHeader>
          <SectionCardTitle>Dues</SectionCardTitle>
          <CardAction>
            <Select size="sm" aria-label="Dues year" items={years} defaultValue="2026" />
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="grid gap-1">
            <ListItem>
              <ListItemContent>
                <ListItemTitle>Annual assessment</ListItemTitle>
                <ListItemMeta>Due Jan 31, 2026</ListItemMeta>
              </ListItemContent>
              <Money cents={36000} />
            </ListItem>
            <ListItem>
              <ListItemContent>
                <ListItemTitle>Payment, check 1043</ListItemTitle>
                <ListItemMeta>Received Jan 12, 2026</ListItemMeta>
              </ListItemContent>
              <Money cents={-36000} signed />
            </ListItem>
          </div>
        </CardContent>
      </SectionCard>
      <SectionCard>
        <CardHeader>
          <SectionCardTitle>
            People
            <SectionCardCount value={2} />
          </SectionCardTitle>
          <CardAction>
            <Button variant="ghost" size="sm">
              <PlusIcon aria-hidden /> Add person
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <DetailList
            items={[
              { label: "Owner", value: "Dana Whitfield" },
              { label: "Mailing address", value: "14 Larkspur Lane\nMaple Glen, OR 97000" },
              { label: "Email", value: "dana.whitfield.longname@example.com" },
            ]}
          />
        </CardContent>
      </SectionCard>
      <SectionCard>
        <CardHeader>
          <SectionCardTitle>
            Documents
            <SectionCardCount value={3} label="shared" />
          </SectionCardTitle>
        </CardHeader>
        <CardContent>
          <ListItem>
            <ListItemContent>
              <ListItemTitle>Fence approval, 2025</ListItemTitle>
              <ListItemMeta>Architectural review · PDF</ListItemMeta>
              <ListItemNote>Board only</ListItemNote>
            </ListItemContent>
          </ListItem>
          <ListItem>
            <ListItemContent>
              <ListItemTitle>Welcome packet</ListItemTitle>
              <ListItemMeta>Governance · PDF</ListItemMeta>
            </ListItemContent>
          </ListItem>
          <ListItem>
            <ListItemContent>
              <ListItemTitle>Architectural review request for exterior paint colour, fence height and front-yard landscaping</ListItemTitle>
              <ListItemMeta>Architectural review · Word</ListItemMeta>
            </ListItemContent>
          </ListItem>
        </CardContent>
      </SectionCard>
      <SectionCard>
        <CardHeader>
          <SectionCardTitle>Complaints</SectionCardTitle>
        </CardHeader>
        <CardContent>
          <SectionEmpty>
            <SectionEmptyIcon>
              <FileTextIcon />
            </SectionEmptyIcon>
            <SectionEmptyContent>
              <SectionEmptyTitle>No complaints</SectionEmptyTitle>
              <SectionEmptyDescription>Complaints filed about this household show here.</SectionEmptyDescription>
            </SectionEmptyContent>
            <SectionEmptyAction onClick={() => {}}>
              <PlusIcon aria-hidden /> New complaint
            </SectionEmptyAction>
          </SectionEmpty>
        </CardContent>
      </SectionCard>
    </div>
  );
}

/**
 * The desktop minimum (900px): one column. The year select sits on the title's line, 16px from the top and right
 * edges (AVE-2). Tab goes from each card's action into its content, in reading order.
 */
export const DesktopMinimum: Story = {
  globals: desktop,
  render: () => <HouseholdSections />,
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole("heading", { level: 2, name: "Dues" })).toBeInTheDocument();
    // A count reads after a comma, with its word, not run into the title (AVE-69). The hidden part is positioned, so
    // the name computation may put a space before the comma; a screen reader says the same either way.
    await expect(canvas.getByRole("heading", { level: 2, name: /^People ?, 2$/ })).toBeInTheDocument();
    await expect(canvas.getByRole("heading", { level: 2, name: /^Documents ?, 3 shared$/ })).toBeInTheDocument();
    await userEvent.tab();
    await expect(canvas.getByRole("combobox", { name: "Dues year" })).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "Add person" })).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "New complaint" })).toHaveFocus();

    const card = canvasElement.querySelector("[data-slot=card]")!.getBoundingClientRect();
    const select = canvas.getByRole("combobox", { name: "Dues year" }).getBoundingClientRect();
    await expect(Math.round(card.right - select.right)).toBe(16);
    // With a mouse the select sits 16px from the card's top. On a touch screen (the touch project) Select is the
    // native picker, which the header centres instead; the right edge holds either way.
    if (!window.matchMedia("(pointer: coarse)").matches) await expect(Math.round(select.top - card.top)).toBe(16);
  },
};

/** Wide (1440px): two columns inside max-w-layout. */
export const Wide: Story = {
  globals: wide,
  render: () => <HouseholdSections />,
};

/** The detail list pairs each value with its label (a real dl). */
export const DetailListStory: Story = {
  name: "Detail list",
  render: () => (
    <div className="max-w-sm p-inset">
      <DetailList
        items={[
          { label: "Amount", value: <Money cents={24000} /> },
          { label: "Method", value: "Check 1043" },
          { label: "Note", value: "Paid at the annual meeting.\nReceipt handed over." },
        ]}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const terms = canvasElement.querySelectorAll("dl > div > dt");
    const values = canvasElement.querySelectorAll("dl > div > dd");
    await expect(terms).toHaveLength(3);
    await expect(values).toHaveLength(3);
  },
};

/**
 * The parts (AVE-149): SectionCard on Card's own header, action and content, its title an h2 with the count read
 * after it; a detail list and list rows written out.
 */
export const Parts: Story = {
  globals: desktop,
  render: () => (
    <div className="mx-auto grid max-w-layout gap-inset px-page py-section lg:grid-cols-2">
      <SectionCard>
        <CardHeader>
          <SectionCardTitle>
            Documents
            <SectionCardCount value={2} label="shared" />
          </SectionCardTitle>
          <CardAction>
            <Button variant="ghost" size="sm">
              <PlusIcon aria-hidden /> Share
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <ListItem>
            <ListItemContent>
              <ListItemTitle>Fence approval, 2025</ListItemTitle>
              <ListItemMeta>Architectural review · PDF</ListItemMeta>
              <ListItemNote>Board only</ListItemNote>
            </ListItemContent>
            <ListItemTrailing>
              <Button variant="outline" size="sm">
                Open
              </Button>
            </ListItemTrailing>
          </ListItem>
          <ListItem>
            <ListItemContent>
              <ListItemTitle>Annual assessment</ListItemTitle>
              <ListItemMeta>Due Jan 31, 2026</ListItemMeta>
            </ListItemContent>
            <ListItemTrailing>
              <Money cents={36000} />
            </ListItemTrailing>
          </ListItem>
        </CardContent>
      </SectionCard>
      <SectionCard>
        <CardHeader>
          <SectionCardTitle>People</SectionCardTitle>
        </CardHeader>
        <CardContent>
          <DetailList>
            <DetailListItem>
              <DetailListTerm>Owner</DetailListTerm>
              <DetailListDetail>Dana Whitfield</DetailListDetail>
            </DetailListItem>
            <DetailListItem>
              <DetailListTerm>Mailing address</DetailListTerm>
              <DetailListDetail>{"14 Larkspur Lane\nMaple Glen, OR 97000"}</DetailListDetail>
            </DetailListItem>
          </DetailList>
        </CardContent>
      </SectionCard>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 2, name: /^Documents ?, 2 shared$/ })).toBeInTheDocument();
    await expect(canvas.getByRole("heading", { level: 2, name: "People" })).toBeInTheDocument();
    await expect(canvas.getAllByRole("term")[0]).toHaveTextContent("Owner");
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "Share" })).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "Open" })).toHaveFocus();
  },
};
