import type { Meta, StoryObj } from "@storybook/react-vite";
import { CalendarDaysIcon, HouseIcon, KeyRoundIcon, LandmarkIcon, MegaphoneIcon, TagIcon } from "lucide-react";
import { useId, type ReactNode } from "react";
import { expect, userEvent } from "storybook/test";
import { Checkbox } from "#avenue/components/checkbox";
import { ChoiceCard, ChoiceCardContent, ChoiceCardDescription, ChoiceCardTitle } from "#avenue/components/choice-card";
import { FieldGroup, FieldLegend, FieldSet } from "#avenue/components/field";
import { RadioGroup, RadioGroupItem } from "#avenue/components/radio-group";

/**
 * A choice card (AVE-33; its own parts since AVE-37): ChoiceCard holds a RadioGroupItem or Checkbox, an icon, a
 * title and one line, and names the control by the title alone, so a screen writes no ids. The whole card is the label, so a tap anywhere on it
 * chooses. It is a control, so its corner is `lg` (10px, never the card's 14), with 16px padding and 12px between
 * cards. Chosen: a primary border and the primary-subtle fill, and the radio or checkbox is always drawn, so the
 * state has a shape cue as well as a colour. A disabled card says why in one muted line.
 *
 * Radio cards are one radio group: one Tab stop, and the arrow keys move and choose. Checkbox cards are separate
 * Tab stops; Space toggles.
 */
const meta = {
  title: "Components/Choice card",
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

type Choice = { value: string; icon: ReactNode; title: string; line: string; disabled?: string };

const homes: Choice[] = [
  { value: "own", icon: <HouseIcon aria-hidden />, title: "I own my home", line: "You get dues notices and can vote." },
  { value: "rent", icon: <KeyRoundIcon aria-hidden />, title: "I rent", line: "You see the wall, events and listings." },
  {
    value: "board",
    icon: <LandmarkIcon aria-hidden />,
    title: "I'm on the board",
    line: "Ask your board's secretary to add you.",
    disabled: "Ask your board's secretary to add you.",
  },
];

const topics: Choice[] = [
  { value: "events", icon: <CalendarDaysIcon aria-hidden />, title: "Events", line: "Porch light: Saturday 6pm." },
  { value: "sale", icon: <TagIcon aria-hidden />, title: "For sale", line: "Neighbors selling or giving things away." },
  {
    value: "notices",
    icon: <MegaphoneIcon aria-hidden />,
    title: "Board notices",
    line: "The board always sends these.",
    disabled: "The board always sends these.",
  },
];

/** The card's title and line. */
function CardBody({ choice }: { choice: Choice }) {
  return (
    <ChoiceCardContent>
      <ChoiceCardTitle>
        {choice.icon}
        {choice.title}
      </ChoiceCardTitle>
      <ChoiceCardDescription>{choice.line}</ChoiceCardDescription>
    </ChoiceCardContent>
  );
}

function RadioCards({ name }: { name: string }) {
  const id = useId();
  return (
    <FieldSet>
      <FieldLegend id={`${id}-legend`} variant="label">
        How do you live at Maple Court?
      </FieldLegend>
      <RadioGroup aria-labelledby={`${id}-legend`} defaultValue="own" name={name}>
        {homes.map((choice) => (
          <ChoiceCard key={choice.value} disabled={!!choice.disabled}>
            <RadioGroupItem value={choice.value} />
            <CardBody choice={choice} />
          </ChoiceCard>
        ))}
      </RadioGroup>
    </FieldSet>
  );
}

function CheckboxCards() {
  return (
    <FieldSet>
      <FieldLegend variant="label">What should we tell you about?</FieldLegend>
      <FieldGroup data-slot="checkbox-group" className="gap-3">
        {topics.map((choice) => (
          <ChoiceCard key={choice.value} disabled={!!choice.disabled}>
            <Checkbox defaultChecked={choice.value === "events" || !!choice.disabled} />
            <CardBody choice={choice} />
          </ChoiceCard>
        ))}
      </FieldGroup>
    </FieldSet>
  );
}

function Frame({ phone, children }: { phone?: boolean; children: ReactNode }) {
  return (
    <div className={phone ? "w-[390px] bg-background p-inset" : "max-w-md p-inset"} data-width={phone ? "390" : "desktop"}>
      {children}
    </div>
  );
}

/**
 * Radio cards: one chosen, one not, one disabled with its reason. Tab lands on the chosen card, the arrows move and
 * choose (skipping the disabled one), and a tap on the card's text chooses it.
 */
export const Radio: Story = {
  tags: ["agent"],
  render: () => (
    <Frame>
      <RadioCards name="home" />
    </Frame>
  ),
  play: async ({ canvas, step }) => {
    const own = canvas.getByRole("radio", { name: "I own my home" });
    const rent = canvas.getByRole("radio", { name: "I rent" });
    const board = canvas.getByRole("radio", { name: "I'm on the board" });
    await step("one group, named by its legend", async () => {
      await expect(canvas.getByRole("radiogroup", { name: "How do you live at Maple Court?" })).toBeInTheDocument();
      await expect(own).toBeChecked();
      await expect(own).toHaveAccessibleName("I own my home");
      await expect(own).toHaveAccessibleDescription("You get dues notices and can vote.");
      await expect(board).toHaveAttribute("aria-disabled", "true");
    });
    await step("ChoiceCard names each control by its title alone and describes it by its line, once", async () => {
      for (const choice of homes) {
        const radio = canvas.getByRole("radio", { name: choice.title });
        await expect(radio).toHaveAccessibleName(choice.title);
        await expect(radio).toHaveAccessibleDescription(choice.line);
      }
    });
    await step("Tab lands on the chosen card; the arrows move, choose and skip the disabled card", async () => {
      await userEvent.tab();
      await expect(own).toHaveFocus();
      await userEvent.keyboard("{ArrowDown}");
      await expect(rent).toHaveFocus();
      await expect(rent).toBeChecked();
      await userEvent.keyboard("{ArrowDown}");
      await expect(own).toHaveFocus();
      await expect(own).toBeChecked();
    });
    await step("a tap on the card's text chooses it; a tap on the disabled card does nothing", async () => {
      await userEvent.click(canvas.getByText("You see the wall, events and listings."));
      await expect(rent).toBeChecked();
      await userEvent.click(canvas.getByText("I'm on the board"));
      await expect(board).not.toBeChecked();
      await expect(rent).toBeChecked();
    });
  },
};

/** Checkbox cards: each card is its own Tab stop, and Space toggles. The disabled card is chosen and says why. */
export const Checkboxes: Story = {
  tags: ["agent"],
  render: () => (
    <Frame>
      <CheckboxCards />
    </Frame>
  ),
  play: async ({ canvas }) => {
    const events = canvas.getByRole("checkbox", { name: "Events" });
    const sale = canvas.getByRole("checkbox", { name: "For sale" });
    await expect(events).toHaveAccessibleName("Events");
    await expect(events).toHaveAccessibleDescription("Porch light: Saturday 6pm.");
    await expect(events).toBeChecked();
    await expect(sale).not.toBeChecked();
    await expect(canvas.getByRole("checkbox", { name: "Board notices" })).toHaveAttribute("aria-disabled", "true");
    // ChoiceCard names each control by its title alone and describes it by its line, once.
    for (const choice of topics) {
      const box = canvas.getByRole("checkbox", { name: choice.title });
      await expect(box).toHaveAccessibleName(choice.title);
      await expect(box).toHaveAccessibleDescription(choice.line);
    }
    await userEvent.tab();
    await expect(events).toHaveFocus();
    await userEvent.tab();
    await expect(sale).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect(sale).toBeChecked();
    await userEvent.click(canvas.getByText("Events"));
    await expect(events).not.toBeChecked();
  },
};

/** Both kinds on a 390px phone: cards run full width, and titles and lines wrap rather than truncate. */
export const Phone: Story = {
  render: () => (
    <Frame phone>
      <div className="flex flex-col gap-8">
        <RadioCards name="home-phone" />
        <CheckboxCards />
      </div>
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    const frame = canvasElement.querySelector<HTMLElement>("[data-width='390']")!;
    for (const card of frame.querySelectorAll<HTMLElement>("[data-slot=field-label]")) {
      if (!card.querySelector("[data-slot=field]")) continue;
      // Full width of the phone's content box, with nothing spilling past its right edge.
      await expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth);
      await expect(Math.round(card.getBoundingClientRect().width)).toBe(390 - 32);
    }
  },
};
