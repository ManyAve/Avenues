import { useSyncExternalStore } from "react";

const coarse = "(pointer: coarse)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(coarse);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** True on touch-first devices (phones, tablets), where the OS picker is the better control. False on the server. */
export function useCoarsePointer() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(coarse).matches,
    () => false,
  );
}

/** Whether a field uses the OS's own control: "auto" (the default) on touch-first devices, or always, or never. */
export type Native = "auto" | "always" | "never";

/** Whether `native` asks for the OS's control on this device. */
export function useNative(native: Native = "auto") {
  const touchFirst = useCoarsePointer();
  return native === "always" || (native === "auto" && touchFirst);
}
