import { createContext, useContext } from "react";

/**
 * The id of a choice card's title (AVE-37), here and not in components/choice-card so Checkbox and RadioGroup, the
 * primitives a card wraps, don't depend on the card (Architect, AVE-50). choice-card re-exports the hook.
 */
export const ChoiceCardContext = createContext<string | undefined>(undefined);

/** The id of the enclosing choice card's title, for its RadioGroupItem or Checkbox to be labelled by. */
export function useChoiceCardTitleId() {
  return useContext(ChoiceCardContext);
}
