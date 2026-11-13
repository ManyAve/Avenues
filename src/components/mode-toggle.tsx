import { Code, Moon } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "#avenue/components/toggle-group";

/**
 * The developer and theme switches at the far left of ManyAve's status bar (the app's
 * app/ui/components/StatusBar.tsx at e01cc90): one joined group of independent on/off buttons, ui-sdk's
 * ToggleGroup through Avenue's, so it is one Tab stop and the arrow keys move between items. Leaving `dev`
 * undefined leaves out the Dev item. AVE-2: icon to label 6px becomes 4px, side padding 10px becomes 8px.
 *
 * Names (WCAG 2.5.3, label in name): the app named its items "Developer mode" and "Dark theme" while they showed
 * "Dev" and "Light", so speech users saying what they see missed them and axe fails both. Dev is now named
 * "Dev mode". The theme item always shows the moon and "Dark" and is pressed when the theme is dark: a toggle
 * keeps one name, and the app's swap to a sun and "Light" read as "Light, not pressed".
 */
function ModeToggle({
  dev,
  theme,
  onDevChange,
  onThemeChange,
}: {
  dev?: boolean | undefined;
  theme?: "light" | "dark" | undefined;
  onDevChange?: ((on: boolean) => void) | undefined;
  onThemeChange?: ((theme: "light" | "dark") => void) | undefined;
}) {
  return (
    <ToggleGroup
      multiple
      variant="outline"
      size="sm"
      spacing={0}
      value={[dev ? "dev" : "", theme === "dark" ? "dark" : ""].filter(Boolean)}
      onValueChange={(value: string[]) => {
        onDevChange?.(value.includes("dev"));
        onThemeChange?.(value.includes("dark") ? "dark" : "light");
      }}
      aria-label="Display mode"
      className="text-meta"
    >
      {dev !== undefined && (
        <ToggleGroupItem value="dev" aria-label="Dev mode" className="gap-1 px-2 text-control">
          <Code aria-hidden /> Dev
        </ToggleGroupItem>
      )}
      <ToggleGroupItem value="dark" aria-label="Dark theme" className="gap-1 px-2 text-control">
        <Moon aria-hidden /> Dark
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

export { ModeToggle };
