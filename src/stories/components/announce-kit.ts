// Story-only: nothing here is exported from the package.

/**
 * Collects what ui-sdk's shared live regions say from now on, so a story can prove a `pendingAnnouncement` was heard
 * (AVE-150). ui-sdk writes each message into an `aria-live` region and may clear it again, so this watches every change
 * rather than reading the regions once. Call `stop` at the end of the play.
 */
export function listenForAnnouncements() {
  const heard: string[] = [];
  const read = () => {
    for (const region of document.querySelectorAll("[aria-live]")) {
      const text = region.textContent?.trim();
      if (text && heard.at(-1) !== text) heard.push(text);
    }
  };
  const observer = new MutationObserver(read);
  observer.observe(document.body, { subtree: true, childList: true, characterData: true });
  return { heard, stop: () => observer.disconnect() };
}
