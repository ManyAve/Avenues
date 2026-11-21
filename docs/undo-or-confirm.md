# Undo or confirm

When a person does something that changes their data, Avenue screens either do it at once and offer **Undo**, or ask
first with a **confirm**. This page says which, and how to build each (AVE-198).

## The rule

**Undo** when all of these hold:

1. **It can be taken back exactly.** Undo puts things as they were: archive and unarchive, mark read and unread,
   remove a filter and add it back, move a card and move it back.
2. **Nothing has left the app.** No email, letter, text, push notification or payment has gone out, and nobody else
   was told.
3. **There is a way back that outlives the toast.** A Restore in an Archived list, a Reopen on the item's page, the
   row's menu. The toast is a shortcut to it, never the only way (AVE-41), and it says where that way is.

**Confirm** (`PendingConfirmDialog`, or `AlertDialog` for a quick question) when any of them fails:

- **Money**: a charge, a refund, a payment plan, a write-off.
- **Sends**: email, mail, texts, reminders, announcements, anything that reaches a person outside the screen.
- **Leaves the app**: an export to a provider, a publish to the public site, a step a provider carries out.
- **No way back**: a hard delete, closing a vote, anything whose undo would need someone to rebuild it.

When it's unclear, ask: "if this was a slip, can the person put it right themselves in the next minute, and did anyone
else notice?" Yes and no: Undo. Otherwise: confirm.

Never both. A confirm before an action that also offers Undo teaches people to click through the question; an Undo on
something that has already been sent promises what it can't keep.

## Examples from the apps

| App | Action | Which | Why |
| --- | --- | --- | --- |
| Management | Delete one of your own case notes on a complaint | Undo | Board only, restorable; already shows Undo (MANA-1261). |
| Management | Undo a check-in at an event | Undo | The list has the check-in back at once and nobody is told. |
| Management | Remove a table filter | Undo | Nothing is saved or sent; the filter comes back as it was. |
| Management | Refund a card payment | Confirm | Money: Stripe sends it back to the card and it can't be undone. |
| Management | Send the dues reminder run, or mail a letter | Confirm | Sends: email and Lob mail reach real households. |
| Management | Close a vote | Confirm | No way back: ballots stop and residents stop seeing it. |
| Neighbors | Block a neighbor | Undo | Nobody is told, and "Neighbors you have blocked" has Unblock. Today it asks first. |
| Neighbors | Delete your comment | Confirm, for now | Everyone stops seeing it, and there is no restore yet. With a restore it becomes Undo. |
| Neighbors | Delete your post | Confirm, for now | "This can't be undone from here." The same: Undo once a restore exists. |

Moving a screen from confirm to Undo is the app's change, made when its team gets to it; Avenue doesn't move them.

## Building the Undo

Use `toast.undo()` from `useToast()` (`@manyave/avenue/components/toast`) right after the action succeeds:

```tsx
const toast = useToast();

async function archive(notice: Notice) {
  await archiveNotice(notice.id);
  toast.undo({
    id: "archive-notice",
    title: (count) => (count === 1 ? "Notice archived" : `${count} notices archived`),
    elsewhere: (count) => `You can also restore ${count === 1 ? "it" : "them"} from Archived.`,
    onUndo: (_event, { source }) =>
      restoreNotice(notice.id).then(() => withSource(source, () => refresh())),
  });
}
```

- **One toast at a time, never a stack.** Avenue shows one toast (AVE-8, AVE-41), so a screen reader hears one message
  and F6 has one place to go. Several undos in a row with the same `id` stay one toast that counts them, "3 notices
  archived", is announced again with the new count and starts its 10 seconds over. Its Undo takes back all three,
  newest first. Any other toast ends the run, and the next one counts from one.
- **`title`** says what was done, in the past tense. A function of the count gives the counted wording.
- **`elsewhere`** is the toast's second line: where to undo once the toast is gone. It is required, because the
  toast is never the only way back. Like `title`, it can be a function of the count.
- **`onUndo`** takes back that one action. Return the Promise of the work: Undo shows pending while it runs, and if
  it rejects the toast stays and pressing Undo again retries only what wasn't undone yet. After an `await`, wrap the
  state change in `withSource(source, …)` (`@ui-sdk/react/observe`) so an agent's Undo stays the agent's.
- **Show an error when Undo fails**, as for any failed step: `toast("Couldn't restore the notice. Try again.",
  { type: "error" })`.
- **`focus: true`** only when the control the person used is gone (the row they archived from vanished), so focus
  lands on Undo instead of falling to the page. Otherwise focus stays where it is and F6 reaches the toast.

Undo is reachable by keyboard (F6, then Enter), by pointer, and by an agent: ui-sdk's bridge lists the toast by its
title with Undo among its buttons (`act({ steps: [{ ref: "Notice archived", action: "press", args: ["Undo"] }] })`).
The stories under Components / Toast ("Undo one", "Undo counts a run", "Undo after the toast is gone", "Undo by an
agent", "Undo fails then retries") show and test each case.

## Undo for a whole screen

The toast covers the action a person just took. A screen that edits many things and wants Ctrl+Z, or wants to step
back through every change including an agent's, keeps its own stack: ui-sdk's `createUndoStack`
(`@ui-sdk/core`, snapshots of a value, with typing grouped into runs) and `createHistory` (`@ui-sdk/react/history`,
every change on the page, who made it, `undoSource("agent")`). Those are app state, so the app owns them; Avenue has
no component for them. `Foundations/Agents` shows `createHistory` with Avenue's controls.

## Building the confirm

`PendingConfirmDialog` for a step that sends or moves money: it says exactly what will happen, holds focus while it
runs, and says "couldn't confirm" with a way to check if the reply is lost. Mark its confirm button
`data-agent-confirm="<what it does>"`, so an agent never does it alone. `AlertDialog` for a quick question with no
work behind it.
