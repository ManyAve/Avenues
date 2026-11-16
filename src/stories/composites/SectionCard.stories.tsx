import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileTextIcon, PlusIcon } from "lucide-react";
import { expect, userEvent } from "storybook/test";
import { Button } from "#avenue/components/button";
import { DetailList, ListItem } from "#avenue/components/detail-list";
import { SectionEmpty } from "#avenue/components/empty-state";
import { Money } from "#avenue/components/money";
import { SectionCard } from "#avenue/components/section-card";
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
      <SectionCard
        title="Dues"
        action={<Select size="sm" aria-label="Dues year" options={years} defaultValue="2026" />}
      >
        <div className="grid gap-1">
          <ListItem title="Annual assessment" meta="Due Jan 31, 2026" trailing={<Money cents={36000} />} />
          <ListItem title="Payment, check 1043" meta="Received Jan 12, 2026" trailing={<Money cents={-36000} signed />} />
        </div>
      </SectionCard>
      <SectionCard
        title="People"
        count={2}
        action={
          <Button variant="ghost" size="sm">
            <PlusIcon aria-hidden /> Add person
          </Button>
        }
      >
        <DetailList
          items={[
            { label: "Owner", value: "Dana Whitfield" },
            { label: "Mailing address", value: "14 Larkspur Lane\nMaple Glen, OR 97000" },
            { label: "Email", value: "dana.whitfield.longname@example.com" },
          ]}
        />
      </SectionCard>
      <SectionCard title="Documents" count={3} countLabel="shared">
        <ListItem title="Fence approval, 2025" meta="Architectural review · PDF" note="Board only" />
        <ListItem title="Welcome packet" meta="Governance · PDF" />
        <ListItem
          title="Architectural review request for exterior paint colour, fence height and front-yard landscaping"
          meta="Architectural review · Word"
        />
      </SectionCard>
      <SectionCard title="Complaints">
        <SectionEmpty
          icon={FileTextIcon}
          title="No complaints"
          line="Complaints filed about this household show here."
          action={{ label: "New complaint", icon: PlusIcon, onClick: () => {} }}
        />
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
