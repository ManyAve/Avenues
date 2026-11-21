import { fuzzyScore } from "@ui-sdk/core/text-match";
import type { AsyncOptionsContext } from "@ui-sdk/react/async-options";
import { matchWords } from "#avenue/lib/search";

// AVE-207: a fake, slow directory for the stories that search as you type. Every street, name and ID is made up.

const streets = [
  "Lantern Row",
  "Quill Court",
  "Juniper Bend",
  "Saddle Brook Lane",
  "Marigold Way",
  "Copper Hollow",
  "Wren Terrace",
  "Hazel Crossing",
];
const firsts = ["Ada", "Bram", "Cora", "Dev", "Esme", "Faro", "Greta", "Hollis", "Ines", "Jory", "Kit", "Lio"];
const lasts = ["Okafor", "Hollis", "Mendez", "Raman", "Smithfield", "Tanaka", "Voss", "Abernathy", "Lindqvist", "Moreau"];

export type Household = { value: string; label: string; meta: string };

/** 2,000 fictional households, one per house number on each street. */
export const directory: Household[] = Array.from({ length: 2000 }, (_, i) => {
  const street = streets[i % streets.length]!;
  const number = Math.floor(i / streets.length) * 2 + 1;
  const owner = `${firsts[(i * 7) % firsts.length]} ${lasts[(i * 3) % lasts.length]}`;
  return { value: `h${1000 + i}`, label: `${number} ${street} · ${owner}`, meta: `ID ${1000 + i}` };
});

export const PAGE = 20;
/** Long enough to see "Searching…" and for a stale answer to arrive after a newer one would. */
export const LATENCY = 400;

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });
}

/**
 * Searches the directory as a server would: every word typed must appear, the best matches first by ui-sdk's
 * `fuzzyScore` (an exact match, then a prefix, then a match inside), a page at a time. Nothing typed finds nothing:
 * nobody scrolls 2,000 households.
 */
export async function searchHouseholds(query: string, { signal, page }: AsyncOptionsContext) {
  await wait(LATENCY, signal);
  const text = query.trim();
  if (!text) return { items: [], hasMore: false };
  const found = directory
    .filter((household) => matchWords(household, text))
    .map((household) => ({ household, score: fuzzyScore(household.label, text) }))
    .sort((a, b) => b.score - a.score)
    .map(({ household }) => household);
  return { items: found.slice(page * PAGE, page * PAGE + PAGE), hasMore: found.length > page * PAGE + PAGE };
}

/** A directory that is down. */
export async function failingSearch(_query: string, { signal }: AsyncOptionsContext): Promise<never[]> {
  await wait(LATENCY, signal);
  throw new Error("The directory didn't answer.");
}

/** Names only, for an Autocomplete whose value is the text: each resident's name once. */
export async function searchResidents(query: string, { signal }: AsyncOptionsContext) {
  await wait(LATENCY, signal);
  const text = query.trim();
  if (!text) return [];
  const names = [...new Set(directory.map((household) => household.label.split(" · ")[1]!))];
  return names
    .filter((name) => matchWords({ label: name }, text))
    .map((name) => ({ name, score: fuzzyScore(name, text) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, PAGE)
    .map(({ name }) => name);
}
