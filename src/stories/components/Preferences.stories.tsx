import type { Meta, StoryObj } from "@storybook/react-vite";
import { createSessionStorage } from "@ui-sdk/core";
import { useState } from "react";
import { expect, userEvent, waitFor } from "storybook/test";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#avenue/components/card";
import { ModeToggle } from "#avenue/components/mode-toggle";
import {
  type ColorScheme,
  createColorScheme,
  Preferences,
  preferencesScript,
  usePreference,
} from "#avenue/components/preferences";

/**
 * AVE-193: the theme choice, remembered. `createColorScheme` is ui-sdk's color scheme on `<html>`; `Preferences` puts
 * Avenue's `.dark` there from it, and `preferencesScript` does the same before the first paint, so a saved Dark
 * never flashes light. These stories keep the choice in this tab's session storage, under a key of their own, so
 * they never change the theme an app or another story saved; an app's scheme uses local storage.
 */
const meta = {
  title: "Components/Preferences",
  component: Preferences,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Preferences>;
export default meta;
type Story = StoryObj<typeof meta>;

const STORY_KEY = "avenue-story-color-scheme";
const root = document.documentElement;
const storyScheme = (theme: unknown) =>
  createColorScheme({ storage: createSessionStorage(STORY_KEY), defaultValue: theme === "dark" ? "dark" : "light" });

/** ui-sdk's first-paint script reads each stored value once per page and keeps it on `window`; a reload starts over. */
const forgetReads = () => Reflect.deleteProperty(window, "__uiSdkStorage");

/** Each story starts from nothing saved, and leaves `<html>` in the toolbar's theme for the next one. */
function freshStart({ globals }: { globals: Record<string, unknown> }) {
  sessionStorage.removeItem(STORY_KEY);
  forgetReads();
  return () => {
    sessionStorage.removeItem(STORY_KEY);
    root.removeAttribute("data-color-scheme");
    root.classList.toggle("dark", globals["theme"] === "dark");
  };
}

function OnScreen({ colorScheme }: { colorScheme: ColorScheme }) {
  const { value, resolved } = usePreference(colorScheme);
  const names = { system: "System", light: "Light", dark: "Dark", unknown: "Not known yet" } as const;
  return (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>Theme</CardTitle>
        <CardDescription>Choose one, then reload the page: the theme stays.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-group">
        <ModeToggle colorScheme={colorScheme} />
        <p className="text-meta text-muted-foreground" data-testid="on-screen">
          Chosen: {names[value]}. On screen: {names[resolved]}.
        </p>
      </CardContent>
    </Card>
  );
}

function Remembered({ theme }: { theme: unknown }) {
  const [colorScheme] = useState(() => storyScheme(theme));
  return (
    <Preferences preferences={[colorScheme]}>
      <OnScreen colorScheme={colorScheme} />
    </Preferences>
  );
}

/**
 * The choice is saved and comes back after a reload, already on screen before anything renders: the play function
 * chooses Dark by keyboard, then does what a reload does (clears the page's `.dark` and attribute, runs
 * `preferencesScript` as the page's first script, and reads a fresh scheme from the same storage).
 */
export const RemembersTheChoice: Story = {
  args: { preferences: [] },
  beforeEach: freshStart,
  render: (_args, { globals }) => <Remembered theme={globals["theme"]} />,
  play: async ({ canvas, globals }) => {
    const dark = canvas.getByRole("radio", { name: "Dark theme" });
    const light = canvas.getByRole("radio", { name: "Light theme" });
    await expect(root).toHaveAttribute("data-color-scheme", globals["theme"] === "dark" ? "dark" : "light");
    await userEvent.tab();
    await expect(canvas.getByRole("radio", { checked: true })).toHaveFocus();
    if (globals["theme"] === "dark") await userEvent.keyboard("{ArrowLeft}");
    await expect(light).toBeChecked();
    await userEvent.keyboard("{ArrowRight}");
    await expect(dark).toBeChecked();
    await waitFor(() => expect(root).toHaveClass("dark"));
    await expect(root).toHaveAttribute("data-color-scheme", "dark");
    await expect(sessionStorage.getItem(STORY_KEY)).toBe("dark");
    await expect(canvas.getByTestId("on-screen")).toHaveTextContent("Chosen: Dark. On screen: Dark.");

    // A reload: the page starts with no theme, and the first script puts the saved one on before it paints.
    root.classList.remove("dark");
    root.removeAttribute("data-color-scheme");
    forgetReads();
    new Function(preferencesScript([storyScheme("light")]))();
    await expect(root).toHaveAttribute("data-color-scheme", "dark");
    await expect(root).toHaveClass("dark");
    await expect(storyScheme("light").get().value).toBe("dark");

    // Light takes `.dark` off again, and is what comes back next time.
    await userEvent.keyboard("{ArrowLeft}");
    await expect(light).toBeChecked();
    await waitFor(() => expect(root).not.toHaveClass("dark"));
    await expect(sessionStorage.getItem(STORY_KEY)).toBe("light");
    root.removeAttribute("data-color-scheme");
    forgetReads();
    new Function(preferencesScript([storyScheme("dark")]))();
    await expect(root).not.toHaveClass("dark");
    if (globals["theme"] === "dark") await userEvent.keyboard("{ArrowRight}");
  },
};

/**
 * System follows the computer: `.dark` is on exactly while the computer is dark, from the first script and from
 * `Preferences` alike, and the choice of System itself is what's saved.
 */
export const FollowsTheComputer: Story = {
  args: { preferences: [] },
  beforeEach: freshStart,
  render: (_args, { globals }) => <Remembered theme={globals["theme"]} />,
  play: async ({ canvas, globals }) => {
    const computerDark = matchMedia("(prefers-color-scheme: dark)").matches;
    const system = canvas.getByRole("radio", { name: "System theme" });
    await userEvent.tab();
    await userEvent.keyboard(globals["theme"] === "dark" ? "{ArrowLeft}{ArrowLeft}" : "{ArrowLeft}");
    await expect(system).toBeChecked();
    await expect(root).toHaveAttribute("data-color-scheme", "system");
    await expect(sessionStorage.getItem(STORY_KEY)).toBe("system");
    await waitFor(() => expect(root.classList.contains("dark")).toBe(computerDark));
    await expect(canvas.getByTestId("on-screen")).toHaveTextContent(
      `Chosen: System. On screen: ${computerDark ? "Dark" : "Light"}.`,
    );

    root.classList.toggle("dark", !computerDark);
    root.removeAttribute("data-color-scheme");
    forgetReads();
    new Function(preferencesScript([storyScheme("light")]))();
    await expect(root).toHaveAttribute("data-color-scheme", "system");
    await expect(root.classList.contains("dark")).toBe(computerDark);
    await userEvent.keyboard(globals["theme"] === "dark" ? "{ArrowRight}{ArrowRight}" : "{ArrowRight}");
  },
};

/** `ModeToggle` still works as before when an app holds the choice itself: `value` wins over the scheme. */
export const ControlledWins: Story = {
  args: { preferences: [] },
  beforeEach: freshStart,
  render: function Render(_args, { globals }) {
    const [colorScheme] = useState(() => storyScheme(globals["theme"]));
    return (
      <Preferences preferences={[colorScheme]}>
        <ModeToggle colorScheme={colorScheme} value="system" />
      </Preferences>
    );
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("radio", { name: "System theme" })).toBeChecked();
  },
};
