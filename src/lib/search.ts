import { matchRanges, matchSegments, type MatchSegment } from "@ui-sdk/core/text-match";
import { createContext, createElement, type ReactNode } from "react";
import type { AsyncOptionsStatus } from "@ui-sdk/react/async-options";

/**
 * What a search list shares with its parts (AVE-207): the text typed, which the item text marks, and whether the
 * results are still loading or failed, which the status and empty parts read.
 */
export type SearchContextValue = { query: string; status: AsyncOptionsStatus | undefined };
export const SearchContext = createContext<SearchContextValue>({ query: "", status: undefined });

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Avenue's default search: every word typed appears in the label or a keyword (case- and accent-insensitive). */
export function matchWords(item: { label: string; keywords?: readonly string[] | undefined }, query: string): boolean {
  const text = fold([item.label, ...(item.keywords ?? [])].join(" "));
  return fold(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => text.includes(w));
}

/**
 * `text` in pieces, each marked where a typed word appears in it, ignoring case and accents (ui-sdk's `matchRanges`).
 * Every word is marked, in any order, as Avenue's own search matches every word ("quill 3" marks both in "3 Quill
 * Court"). Empty for no query; one unmarked piece when nothing matched (a keyword did, or the source matched it its own
 * way).
 */
export function markWords(text: string, query: string): MatchSegment[] {
  const ranges = query
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((word) => matchRanges(text, word, "contains"))
    .sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];
  for (const range of ranges) {
    const last = merged.at(-1);
    if (last && range.start <= last.end) last.end = Math.max(last.end, range.end);
    else merged.push({ ...range });
  }
  return merged.length ? matchSegments(text, merged) : [{ text, match: false }];
}

/**
 * The marked text. A matched piece is a plain span drawn heavier, not `<mark>`, which some screen readers announce
 * letter run by letter run ("highlight, Qu, end highlight"): the option's name stays its plain text (UX Engineer,
 * AVE-207).
 */
export function MarkedText({ text, query }: { text: string; query: string }): ReactNode {
  // The pieces of one text, in order and never reordered, so their place is their key.
  return markWords(text, query).map((segment, index) =>
    segment.match ? createElement("span", { key: index, "data-match": "", className: "font-semibold" }, segment.text) : segment.text,
  );
}

/** What a search's status part reads: ui-sdk's status and the count of items shown, with the text typed. */
export type SearchState = { status: AsyncOptionsStatus; loading: boolean; count: number; query: string };

/** The default words for a search's state (UX Engineer, AVE-207). */
export function searchMessage(
  { status, loading, count, query }: SearchState,
  emptyMessage: (query: string) => ReactNode = defaultSearchEmpty,
): ReactNode {
  if (status === "error") return "Couldn't search. Try again.";
  if (loading) return "Searching…";
  if (count === 0) return emptyMessage(query);
  return count === 1 ? "1 result" : `${count} results`;
}

export const defaultSearchEmpty = (query: string): ReactNode =>
  query ? `Nothing matches “${query}”.` : "Type to search.";

/**
 * Whether the status line shows, or is only heard. It shows while it is all the list has to say (nothing loaded yet,
 * or nothing matched) and after a failure. A count, or "Searching…" over the last results, is only heard: the results
 * stay where they are while the next ones load, so nothing moves under the pointer.
 */
export const searchMessageShows = ({ status, count }: Pick<SearchState, "status" | "count">) =>
  status === "error" || count === 0;

/** The status line's look while it shows: the empty message's. */
export const searchMessageClass = "block px-3 py-2 text-sm text-muted-foreground";
