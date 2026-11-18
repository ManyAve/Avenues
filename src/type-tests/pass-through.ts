/**
 * AVE-138: these components once took a fixed list of props and dropped the rest, so an app couldn't give them a ref,
 * an id or an aria-describedby. Each now passes its other props to its root (or, for a dialog or popover, to its
 * content). It runs in `bun run typecheck`: a component that stops taking one of these fails to compile here.
 * `Foundations/Pass-through` in Storybook proves they reach the element at run time.
 */
import type * as disclosure from "#avenue/components/disclosure";
import type * as displayOptions from "#avenue/components/display-options";
import type * as fileField from "#avenue/components/file-field";
import type * as inlineMessage from "#avenue/components/inline-message";
import type * as modeToggle from "#avenue/components/mode-toggle";
import type * as pendingConfirmDialog from "#avenue/components/pending-confirm-dialog";
import type * as register from "#avenue/components/register";
import type * as toolbar from "#avenue/components/toolbar";
import type * as tooltip from "#avenue/components/tooltip";

type PropsOf<C> = C extends (props: infer P) => unknown ? P : never;

/** True when every key in K is a prop of C. */
type Takes<C, K extends string> = [K] extends [keyof PropsOf<C>] ? true : false;

type Root = "ref" | "id" | "aria-describedby" | "aria-label" | "className";

declare function takesAll<_T extends true>(): void;

takesAll<Takes<typeof inlineMessage.InlineMessage, Root | "render">>();
takesAll<Takes<typeof disclosure.Disclosure, Root>>();
takesAll<Takes<typeof displayOptions.DisplayOptions, Root>>();
takesAll<Takes<typeof displayOptions.DisplayOptionsSection, Root | "render">>();
takesAll<Takes<typeof displayOptions.DisplayOptionsDensity, "ref" | "id" | "aria-describedby" | "className">>();
takesAll<Takes<typeof fileField.FileField, Root>>();
// Described by its description, as the tip describes InfoTip's button: both leave aria-describedby to ui-sdk.
takesAll<Takes<typeof pendingConfirmDialog.PendingConfirmDialog, "ref" | "id" | "aria-label" | "className" | "onKeyDown">>();
takesAll<Takes<typeof pendingConfirmDialog.PendingConfirmDialogContent, "ref" | "id" | "aria-label" | "className" | "onKeyDown">>();
takesAll<Takes<typeof modeToggle.ModeToggle, Root | "render">>();
takesAll<Takes<typeof tooltip.InfoTip, "ref" | "id" | "className">>();
takesAll<Takes<typeof toolbar.ToolbarActions, Root | "render">>();
// The grid owns a row's id, as on RegisterRow.
takesAll<Takes<typeof register.RegisterGroupRow, "ref" | "aria-describedby" | "className">>();
takesAll<Takes<typeof register.RegisterAddRow, "ref" | "aria-describedby" | "className">>();
