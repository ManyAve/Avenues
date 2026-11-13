/**
 * Formatting helpers ManyAve uses outside a component too: amounts inside running text, and the avatar tints
 * that also colour street bars. The Money and InitialsAvatar components are built on these.
 */

const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const signedDollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  signDisplay: "exceptZero",
});

/** Cents as US dollars: 12345 → "$123.45", -500 → "-$5.00"; `signed` adds "+" to amounts above zero. */
export function formatMoney(cents: number, { signed = false }: { signed?: boolean } = {}) {
  return (signed ? signedDollars : dollars).format(cents / 100);
}

export const tints = ["teal", "plum", "stone", "iris"] as const;
export type Tint = (typeof tints)[number];

/**
 * The tint for a key, by a stable FNV-1a hash (the app's tintFor, e01cc90), so sorting or filtering never
 * recolours a person. Teal, plum, iris and stone carry no status meaning. Set it as `data-tint` on an element.
 */
export function tintFor(key: string): Tint {
  let h = 2166136261;
  for (const c of key) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return tints[h % tints.length]!;
}

/** First letter of the first two words that start with a letter, in any script. */
export function initials(name: string): string {
  return (name.match(/(?<=^|\s)\p{L}/gu) ?? []).slice(0, 2).join("").toUpperCase();
}
