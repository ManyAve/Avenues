import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import { Field, FieldGroup, FieldLabel } from "#avenue/components/field";
import { Input } from "#avenue/components/input";

const meta = {
  title: "Components/Input",
  component: Input,
  decorators: [(Story) => <div className="max-w-sm p-inset">{Story()}</div>],
} satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Input sizes: xs 24, sm 28 (8px corner), md 32 default, lg 40 (10px corner). */
export const Sizes: Story = {
  render: () => (
    <FieldGroup className="gap-3">
      {(["xs", "sm", "md", "lg"] as const).map((size) => (
        <Field key={size}>
          <FieldLabel>Search, {size}</FieldLabel>
          <Input size={size} type="search" placeholder="Search households" />
        </Field>
      ))}
    </FieldGroup>
  ),
  tags: ["agent"],
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole("searchbox", { name: "Search, md" }), "Larkspur");
    await expect(canvas.getByRole("searchbox", { name: "Search, md" })).toHaveValue("Larkspur");
    const heights = canvas.getAllByRole("searchbox").map((el) => el.getBoundingClientRect().height);
    await expect(heights).toEqual([24, 28, 32, 40]);
  },
};
