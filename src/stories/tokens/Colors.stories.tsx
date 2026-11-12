import type { Meta, StoryObj } from "@storybook/react-vite";
import { cn } from "../../lib/utils";

// AVE-1's sample story: the semantic colours as swatches, to prove Tailwind, the tokens and the theme switch.
const pairs = [
  { name: "background", surface: "bg-background", text: "text-foreground" },
  { name: "card", surface: "bg-card", text: "text-card-foreground" },
  { name: "primary", surface: "bg-primary", text: "text-primary-foreground" },
  { name: "primary-subtle", surface: "bg-primary-subtle", text: "text-primary-subtle-foreground" },
  { name: "secondary", surface: "bg-secondary", text: "text-secondary-foreground" },
  { name: "muted", surface: "bg-muted", text: "text-muted-foreground" },
  { name: "accent", surface: "bg-accent", text: "text-accent-foreground" },
  { name: "success", surface: "bg-success", text: "text-success-foreground" },
  { name: "info", surface: "bg-info", text: "text-info-foreground" },
  { name: "warning", surface: "bg-warning", text: "text-warning-foreground" },
  { name: "destructive", surface: "bg-destructive", text: "text-destructive-foreground" },
] as const;

function SemanticColors() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3 bg-background p-4">
      {pairs.map((pair) => (
        <div
          key={pair.name}
          className={cn(
            "flex h-20 flex-col justify-end rounded-lg border p-3 shadow-card",
            pair.surface,
            pair.text,
          )}
        >
          <span className="text-compact font-medium">{pair.name}</span>
          <span className="text-meta">Aa 123</span>
        </div>
      ))}
    </div>
  );
}

const meta = {
  title: "Tokens/Colors",
  component: SemanticColors,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof SemanticColors>;

export default meta;

export const Semantic: StoryObj<typeof meta> = {};
