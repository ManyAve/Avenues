import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Badge } from "#avenue/components/badge";
import { Checkbox } from "#avenue/components/checkbox";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "#avenue/components/table";

const meta = {
  title: "Components/Table",
  component: Table,
  decorators: [(Story) => <div className="p-inset">{Story()}</div>],
} satisfies Meta<typeof Table>;
export default meta;
type Story = StoryObj<typeof meta>;

// Fictional households.
const rows = [
  { address: "14 Larkspur Lane", owner: "Robin Avery", status: "Paid", due: "$0.00" },
  { address: "9 Juniper Court", owner: "Sam Okafor", status: "Past due", due: "$240.00" },
  { address: "301 Sorrel Way", owner: "Lee Marchetti", status: "Paid", due: "$0.00" },
];

/** The app's status look: an outlined label with a coloured dot. The dot is decoration; the word carries the meaning. */
function Status({ status }: { status: string }) {
  return (
    <Badge variant="outline" className="bg-background text-muted-foreground">
      <span aria-hidden className={`size-1.5 rounded-full ${status === "Paid" ? "bg-success" : "bg-warning"}`} />
      {status}
    </Badge>
  );
}

/** Header, rows with a selected row, a footer total and a caption. 40px header row, 8px cell padding. */
export const Default: Story = {
  render: () => (
    <Table>
      <TableCaption>Households, 2026 dues. Fictional data.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>
            <Checkbox aria-label="Select all households" defaultChecked="indeterminate" />
          </TableHead>
          <TableHead>Address</TableHead>
          <TableHead>Owner</TableHead>
          <TableHead>Dues</TableHead>
          <TableHead className="text-right">Balance</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => (
          <TableRow key={row.address} data-state={i === 1 ? "selected" : undefined}>
            <TableCell>
              <Checkbox aria-label={`Select ${row.address}`} defaultChecked={i === 1} />
            </TableCell>
            <TableCell className="font-medium">{row.address}</TableCell>
            <TableCell>{row.owner}</TableCell>
            <TableCell>
              <Status status={row.status} />
            </TableCell>
            <TableCell className="text-right font-mono whitespace-nowrap tabular-nums">{row.due}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={4}>Total outstanding</TableCell>
          <TableCell className="text-right font-mono whitespace-nowrap tabular-nums">$240.00</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  ),
  play: async ({ canvas }) => {
    for (const header of canvas.getAllByRole("columnheader")) {
      await expect(header).toHaveAttribute("scope", "col");
    }
    // On a phone (the touch story-test project) a row with a checkbox is 44px tall (AVE-22).
    const phone = matchMedia("(pointer: coarse)").matches;
    await expect(canvas.getAllByRole("columnheader")[1]!.getBoundingClientRect().height).toBe(phone ? 44 : 40);
    const money = canvas.getAllByText("$240.00")[0]!;
    await expect(getComputedStyle(money).fontVariantNumeric).toContain("tabular-nums");
    await expect(getComputedStyle(money).fontFamily).toMatch(/mono/i);
  },
};
