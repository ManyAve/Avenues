import { Code, Monitor, Moon, Sun } from "lucide-react";
import { Toggle } from "#avenue/components/toggle";
import { ToggleGroup, ToggleGroupItem } from "#avenue/components/toggle-group";

export type ThemeChoice = "system" | "light" | "dark";

const themeItems = [
  { value: "system", label: "System", icon: Monitor, name: "System theme" },
  { value: "light", label: "Light", icon: Sun, name: "Light theme" },
  { value: "dark", label: "Dark", icon: Moon, name: "Dark theme" },
] as const;

/**
 * The developer and theme controls at the far left of ManyAve's status bar (the app's
 * app/ui/components/StatusBar.tsx at manyave-management 7b476f2). Leaving `dev` undefined leaves out the Dev item.
 * `choice` is the stored setting (System follows the computer); without it, the theme on screen is shown as Light or
 * Dark. The chosen theme names itself and the others stay icons, so the bar keeps its width.
 *
 * Behavior from ui-sdk: Dev is a single Toggle (pressed or not; a group of one would be announced as a group), and
 * the theme, through Avenue's ToggleGroup, is a single choice (ui-sdk's SegmentedControl, a radio group: one Tab stop, the arrow keys choose).
 *
 * Changes from the app:
 * - AVE-2: icon to label 6px becomes 4px, side padding 10px becomes 8px.
 * - WCAG 2.5.3 (label in name): the app named the Dev toggle "Developer mode" while it shows "Dev", so a speech
 *   user saying what they see misses it and axe fails it. It is named "Dev mode". Likewise System is named "System
 *   theme", not "Match system theme", so the name starts with what it shows (AVE-62).
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
        <Toggle
          variant="outline"
          size="sm"
          pressed={dev}
          onPressedChange={(pressed: boolean) => onDevChange?.(pressed)}
          aria-label="Dev mode"
          className="shrink-0 gap-1 px-2 text-control"
        >
          <Code aria-hidden /> Dev
        </Toggle>
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
