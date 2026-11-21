import { expect, waitFor } from "storybook/test";

// AVE-39: checks shared by the Select and Combobox stories while their list presents as a bottom sheet.

/**
 * The bottom sheet's look, shared with Sheet (AVE-32): it rests on the bottom edge at the screen's width (up to 512px),
 * rounds only its top corners (14px), shows the 36 x 4px handle and gives every row 44px.
 */
export async function expectListSheet(content: HTMLElement, rowSelector: string) {
  await waitFor(() => {
    const box = content.getBoundingClientRect();
    expect(Math.round(box.bottom)).toBe(innerHeight);
    expect(Math.round(box.width)).toBe(Math.min(innerWidth, 512));
  });
  const corners = getComputedStyle(content);
  await expect([corners.borderTopLeftRadius, corners.borderTopRightRadius]).toEqual(["14px", "14px"]);
  await expect([corners.borderBottomLeftRadius, corners.borderBottomRightRadius]).toEqual(["0px", "0px"]);
  const handle = content.querySelector<HTMLElement>("[data-slot=sheet-handle]")!.getBoundingClientRect();
  await expect([handle.width, handle.height]).toEqual([36, 4]);
  for (const row of content.querySelectorAll<HTMLElement>(rowSelector)) {
    await expect(row.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  }
}

/**
 * A swipe down on the sheet. ui-sdk moves a bottom sheet with native scrolling on a touch screen (`data-driver=
 * "scroll-snap"`): there a finger scrolls the sheet's viewport back to its closed snap point, so the swipe is that
 * scroll. With a mouse or pen it drags (`"pointer"`): down on the handle, moves in small steps, up.
 */
export async function swipeDown(content: HTMLElement) {
  const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
  if (content.getAttribute("data-driver") === "scroll-snap") {
    // The closed snap point is the top of the viewport's scroll; the scroll lands there as a fling would.
    content.parentElement!.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  const handle = content.querySelector<HTMLElement>("[data-slot=sheet-handle]")!;
  const box = handle.getBoundingClientRect();
  const x = box.left + box.width / 2;
  let y = box.top + box.height / 2;
  const fire = (type: string, buttons: number) =>
    handle.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
        clientX: x,
        clientY: y,
        button: 0,
        buttons,
      }),
    );
  fire("pointerdown", 1);
  for (let moved = 0; moved < 400; moved += 20) {
    y += 20;
    fire("pointermove", 1);
    await frame();
  }
  fire("pointerup", 0);
}

/** Waits until the list has gone, including a sheet sliding out. A closed list can stay in the page, hidden. */
export async function waitForClosed(part: "select" | "combobox" | "date-picker") {
  await waitFor(() => expect(document.querySelector(`[data-slot=${part}-content]:not([hidden])`)).toBeNull());
}
