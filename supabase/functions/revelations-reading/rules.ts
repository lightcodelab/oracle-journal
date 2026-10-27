export const SACRED_REWRITE_DECK_ID = "85dddf8a-cd5e-4cdd-8ccc-af034052e484";
export function isRevelationCard(card: { id: string; deck_id: string }, drawnCardId: string) {
  return card.id === drawnCardId && card.deck_id === SACRED_REWRITE_DECK_ID;
}
export { REVELATIONS_PROMPT } from "../_shared/readingVoice.ts";
