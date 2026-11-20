import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent } from "storybook/test";
import { Button } from "#avenue/components/button";
import { Checkbox } from "#avenue/components/checkbox";
import { Field, FieldError, FieldLabel } from "#avenue/components/field";
import { Card, CardContent } from "#avenue/components/card";
import { BOUNDARY_MIN_CONTRAST, BoundaryReadout, measureBoundaryContrast } from "./contrast-kit";
import { Row, Rows } from "./story-kit";

const meta = {
  title: "Components/Checkbox",
  component: Checkbox,
} satisfies Meta<typeof Checkbox>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Unchecked, checked, indeterminate, invalid and disabled. 16px with a 4px corner. */
export const States: Story = {
  render: () => (
    <Rows>
      <Row label="unchecked">
        <Checkbox aria-label="Unchecked" />
      </Row>
      <Row label="checked">
        <Checkbox aria-label="Checked" defaultChecked />
      </Row>
      <Row label="indeterminate">
        <Checkbox aria-label="Indeterminate" defaultChecked="indeterminate" />
      </Row>
      <Row label="invalid">
        <Checkbox aria-label="Invalid" aria-invalid="true" />
      </Row>
      <Row label="disabled">
        <Checkbox aria-label="Disabled" disabled />
        <Checkbox aria-label="Disabled checked" disabled defaultChecked />
      </Row>
    </Rows>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("checkbox", { name: "Indeterminate" })).toHaveAttribute("aria-checked", "mixed");
    await expect(canvas.getByRole("checkbox", { name: "Disabled" })).toHaveAttribute("aria-disabled", "true");
  },
};

const rows = ["14 Larkspur Lane", "9 Juniper Court", "301 Sorrel Way"];

/** Select all over a list: indeterminate while some rows are chosen (ui-sdk's `parent` checkbox group does this for a form). Space toggles the focused box. */
export const SelectAll: Story = {
  tags: ["agent"],
  render: function SelectAllStory() {
    const [chosen, setChosen] = useState<string[]>(["9 Juniper Court"]);
    const all = chosen.length === rows.length;
    return (
      <Rows>
        <Field orientation="horizontal">
          <Checkbox
            checked={all ? true : chosen.length > 0 ? "indeterminate" : false}
            onCheckedChange={(on) => setChosen(on ? rows : [])}
          />
          <FieldLabel>Select all households</FieldLabel>
        </Field>
        {rows.map((row) => (
          <Field key={row} orientation="horizontal" className="ps-6">
            <Checkbox
              checked={chosen.includes(row)}
              onCheckedChange={(on) => setChosen((c) => (on ? [...c, row] : c.filter((r) => r !== row)))}
            />
            <FieldLabel>{row}</FieldLabel>
          </Field>
        ))}
      </Rows>
    );
  },
  play: async ({ canvas }) => {
    const all = canvas.getByRole("checkbox", { name: "Select all households" });
    await expect(all).toHaveAttribute("aria-checked", "mixed");
    await userEvent.tab();
    await expect(all).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect(all).toBeChecked();
    await expect(canvas.getByRole("checkbox", { name: "301 Sorrel Way" })).toBeChecked();
  },
};

const many = Array.from({ length: 40 }, (_, i) => `${i + 1} Hawthorn Row`);

/**
 * Checking many boxes in one render asks the page for its animations twice in all, not twice per box (Avenue's
 * ui-sdk patch, AVE-177): a "Confirm all" over 500 rows took 25 seconds when each box asked for itself. The play
 * function counts what the indicators ask while they enter: nothing per box, one document read before all the
 * writes and one after, and every box still starts its entry.
 */
export const CheckManyAtOnce: Story = {
  render: function CheckManyStory() {
    const [chosen, setChosen] = useState<string[]>([]);
    return (
      <Rows>
        <Button variant="outline" size="sm" className="self-start" onClick={() => setChosen(many)}>
          Confirm every household
        </Button>
        {many.map((row) => (
          <Field key={row} orientation="horizontal">
            <Checkbox
              checked={chosen.includes(row)}
              onCheckedChange={(on) => setChosen((c) => (on ? [...c, row] : c.filter((r) => r !== row)))}
            />
            <FieldLabel>{row}</FieldLabel>
          </Field>
        ))}
      </Rows>
    );
  },
  play: async ({ canvas }) => {
    const order: ("read" | "write" | "document read")[] = [];
    const indicator = (el: Element) => el.getAttribute("data-slot") === "checkbox-indicator";
    const { getAnimations } = Element.prototype;
    const { setAttribute } = Element.prototype;
    const documentAnimations = Document.prototype.getAnimations;
    Document.prototype.getAnimations = function (this: Document) {
      order.push("document read");
      return documentAnimations.call(this);
    };
    Element.prototype.getAnimations = function (this: Element, options?: GetAnimationsOptions) {
      if (indicator(this)) order.push("read");
      return getAnimations.call(this, options);
    };
    Element.prototype.setAttribute = function (this: Element, name: string, value: string) {
      if (indicator(this) && name === "data-starting-style") order.push("write");
      setAttribute.call(this, name, value);
    };
    try {
      await userEvent.click(canvas.getByRole("button", { name: "Confirm every household" }));
      await expect(canvas.getByRole("checkbox", { name: `${many.length} Hawthorn Row` })).toBeChecked();
    } finally {
      Element.prototype.getAnimations = getAnimations;
      Element.prototype.setAttribute = setAttribute;
      Document.prototype.getAnimations = documentAnimations;
    }
    await expect(order.filter((step) => step === "write")).toHaveLength(many.length);
    await expect(order.filter((step) => step === "read")).toHaveLength(0);
    // One document read before all the writes and one after, not one per box.
    const first = order.indexOf("write");
    const last = order.lastIndexOf("write");
    await expect(order.slice(first, last + 1).every((step) => step === "write")).toBe(true);
    await expect(order[first - 1]).toBe("document read");
    await expect(order[last + 1]).toBe("document read");
  },
};

/** Inside an invalid Field the box is marked aria-invalid and the error is announced. */
export const RequiredInField: Story = {
  render: () => (
    <Rows>
      <Field invalid orientation="horizontal" className="flex-wrap">
        <Checkbox />
        <FieldLabel>I confirm the payment was received</FieldLabel>
        <FieldError className="basis-full">Confirm before recording the payment.</FieldError>
      </Field>
    </Rows>
  ),
  play: async ({ canvas }) => {
    const box = canvas.getByRole("checkbox", { name: "I confirm the payment was received" });
    await expect(box).toHaveAttribute("aria-invalid", "true");
    await expect(box).toHaveAccessibleDescription("Confirm before recording the payment.");
  },
};

const checkboxSamples = [
  { where: "on the page", name: "Unchecked on the page" },
  { where: "on a card", name: "Unchecked on a card" },
] as const;

/**
 * An unchecked box on the page and on a card. Its outline is the only thing that shows it is there, so it uses `muted-foreground`, not the field border. The line under it is measured from the rendered controls in the current theme; the play function fails if
 * either outline drops under 3:1 against what is behind it (WCAG 1.4.11, AVE-38).
 */
export const UncheckedOutline: Story = {
  render: () => (
    <BoundaryReadout samples={checkboxSamples}>
      <Rows>
        <Row label="page">
          <Checkbox aria-label="Unchecked on the page" />
        </Row>
        <Card size="sm" className="max-w-xs">
          <CardContent>
            <Row label="card">
              <Checkbox aria-label="Unchecked on a card" />
            </Row>
          </CardContent>
        </Card>
      </Rows>
    </BoundaryReadout>
  ),
  play: async ({ canvas }) => {
    for (const { name } of checkboxSamples) {
      const control = canvas.getByRole("checkbox", { name });
      await expect(measureBoundaryContrast(control)).toBeGreaterThanOrEqual(BOUNDARY_MIN_CONTRAST);
    }
  },
};
