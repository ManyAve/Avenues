import { Code, Monitor, Moon, Sun } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "#avenue/components/toggle-group";

export type ThemeChoice = "system" | "light" | "dark";

const themeItems = [
  { value: "system", label: "System", icon: Monitor, name: "Match system theme" },
  { value: "light", label: "Light", icon: Sun, name: "Light theme" },
  { value: "dark", label: "Dark", icon: Moon, name: "Dark theme" },
] as const;

/**
 * The developer and theme controls at the far left of ManyAve's status bar (the app's
 * app/ui/components/StatusBar.tsx at manyave-management 7b476f2). Leaving `dev` undefined leaves out the Dev item.
 * `choice` is the stored setting (System follows the computer); without it, the theme on screen is shown as Light or
 * Dark. The chosen theme names itself and the others stay icons, so the bar keeps its width.
 *
 * Behavior from ui-sdk through Avenue's ToggleGroup: Dev is a pressed/not-pressed toggle, and the theme is a
 * single choice (ui-sdk's SegmentedControl, a radio group: one Tab stop, the arrow keys choose).
 *
 * Changes from the app:
 * - AVE-2: icon to label 6px becomes 4px, side padding 10px becomes 8px.
 * - WCAG 2.5.3 (label in name): the app named the Dev toggle "Developer mode" while it shows "Dev", so a speech
 *   user saying what they see misses it and axe fails it. It is named "Dev mode".
 */
function ModeToggle({
  dev,
  theme,
  choice,
  onDevChange,
  onThemeChange,
}: {
  dev?: boolean | undefined;
  theme?: "light" | "dark" | undefined;
  choice?: ThemeChoice | undefined;
  onDevChange?: ((on: boolean) => void) | undefined;
  onThemeChange?: ((theme: ThemeChoice) => void) | undefined;
}) {
  const selected = choice ?? theme ?? "light";
  return (
    <span data-slot="mode-toggle" className="flex items-center gap-group">
      {dev !== undefined && (
        <ToggleGroup
          multiple
          variant="outline"
          size="sm"
          spacing={0}
          value={dev ? ["dev"] : []}
          onValueChange={(value: string[]) => onDevChange?.(value.includes("dev"))}
          aria-label="Developer mode"
          className="text-meta"
        >
          <ToggleGroupItem value="dev" aria-label="Dev mode" className="gap-1 px-2 text-control">
            <Code aria-hidden /> Dev
          </ToggleGroupItem>
        </ToggleGroup>
      )}
      <ToggleGroup
        variant="outline"
        size="sm"
        spacing={0}
        value={selected}
        onValueChange={(value: string | null) => {
          const next = themeItems.find((item) => item.value === value);
          if (next) onThemeChange?.(next.value);
        }}
        aria-label="Theme"
        className="text-meta"
      >
        {themeItems.map(({ value, label, icon: Icon, name }) => (
          <ToggleGroupItem key={value} value={value} aria-label={name} title={label} className="gap-1 px-2 text-control">
            <Icon aria-hidden />
            {value === selected && <span className="max-sm:sr-only">{label}</span>}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </span>
  );
}

export { ModeToggle };
