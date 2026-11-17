import { mergeProps, renderElement } from "@ui-sdk/react/primitive";
import type { SegmentedControlValueChangeReason } from "@ui-sdk/react/segmented-control";
import type { TogglePressedChangeReason } from "@ui-sdk/react/toggle";
import { Code, Monitor, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { Toggle } from "#avenue/components/toggle";
import { ToggleGroup, ToggleGroupItem } from "#avenue/components/toggle-group";
import type { ChangeDetails } from "#avenue/lib/change";
import { defined, type OwnPartProps } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

export type ThemeChoice = "system" | "light" | "dark";

/** What `onValueChange` gets after the theme: ui-sdk SegmentedControl's details (reason, event, source, `cancel()`). */
export type ThemeChangeDetails = ChangeDetails<SegmentedControlValueChangeReason>;
/** What `onDevChange` gets after the new state: ui-sdk Toggle's details. */
export type DevChangeDetails = ChangeDetails<TogglePressedChangeReason>;

const themeItems = [
  { value: "system", label: "System", icon: Monitor, name: "System theme" },
  { value: "light", label: "Light", icon: Sun, name: "Light theme" },
  { value: "dark", label: "Dark", icon: Moon, name: "Dark theme" },
] as const;

/**
 * The developer and theme controls at the far left of ManyAve's status bar (the app's
 * app/ui/components/StatusBar.tsx at manyave-management 7b476f2). Leaving `dev` and `defaultDev` out leaves out the
 * Dev item. `value` is the stored theme setting (System follows the computer); without it or `defaultValue`, the theme
 * on screen is shown as Light or Dark. The chosen theme names itself and the others stay icons, so the bar keeps its
 * width.
 *
 * State follows ui-sdk's names (AVE-145): the theme is `value` / `defaultValue` / `onValueChange`, and Dev, a second
 * piece of state on the same root, is `dev` / `defaultDev` / `onDevChange`, ui-sdk's `<key>` / `default<Key>` /
 * `on<Key>Change` pattern. Each callback gets ui-sdk's details second; `details.cancel()` keeps the old state when
 * the toggle holds it itself. `choice` and `onThemeChange` are the old names, kept until v0.27.0.
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
  defaultDev,
  onDevChange,
  theme,
  value,
  defaultValue,
  onValueChange,
  choice,
  onThemeChange,
  className,
  render,
  ...props
}: Omit<OwnPartProps<"span">, "children" | "defaultValue"> & {
  /** Whether Dev is on. Leave it and `defaultDev` out to leave out the Dev item. */
  dev?: boolean | undefined;
  defaultDev?: boolean | undefined;
  onDevChange?: ((dev: boolean, details: DevChangeDetails) => void) | undefined;
  /** The theme on screen, shown when there is no stored setting. */
  theme?: "light" | "dark" | undefined;
  /** The stored theme setting. */
  value?: ThemeChoice | undefined;
  defaultValue?: ThemeChoice | undefined;
  onValueChange?: ((value: ThemeChoice, details: ThemeChangeDetails) => void) | undefined;
  /** @deprecated Use `value`. Kept until v0.27.0 (AVE-145). */
  choice?: ThemeChoice | undefined;
  /** @deprecated Use `onValueChange`. Kept until v0.27.0 (AVE-145). */
  onThemeChange?: ((theme: ThemeChoice, details: ThemeChangeDetails) => void) | undefined;
}) {
  const [ownTheme, setOwnTheme] = useState(defaultValue);
  const [ownDev, setOwnDev] = useState(defaultDev);
  const selected = value ?? choice ?? ownTheme ?? theme ?? "light";
  const devOn = dev ?? ownDev;
  return renderElement(
    "span",
    mergeProps(defined(props), {
      "data-slot": "mode-toggle",
      className: cn("flex items-center gap-group", className),
      children: (
        <>
          {devOn !== undefined && (
            <Toggle
              variant="outline"
              size="sm"
              pressed={devOn}
              onPressedChange={(pressed: boolean, details: DevChangeDetails) => {
                onDevChange?.(pressed, details);
                if (!details.canceled) setOwnDev(pressed);
              }}
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
            onValueChange={(next: string | null, details: ThemeChangeDetails) => {
              const item = themeItems.find((i) => i.value === next);
              if (!item) return;
              onValueChange?.(item.value, details);
              onThemeChange?.(item.value, details);
              if (!details.canceled) setOwnTheme(item.value);
            }}
            aria-label="Theme"
            className="text-meta"
          >
            {themeItems.map(({ value: item, label, icon: Icon, name }) => (
              <ToggleGroupItem key={item} value={item} aria-label={name} title={label} className="gap-1 px-2 text-control">
                <Icon aria-hidden />
                {item === selected && <span className="max-sm:sr-only">{label}</span>}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </>
      ),
    }),
    render,
  );
}

export { ModeToggle };
