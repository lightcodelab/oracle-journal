/**
 * The Remembrance Letters — the twelve monthly themes.
 *
 * Single source of truth, shared by the postal (admin) letter generator and the
 * member-facing digital pilgrimage. Keep `src/lib/remembranceThemes.ts` in step
 * with the short titles below.
 */

export interface RemembranceTheme {
  /** Full theme title, used in the letter itself. */
  title: string;
  /** Short display title for tabs and headings. */
  shortTitle: string;
  /** Emotional movement of the month. */
  emotion: string;
  /** Relative weighting of decks when drawing the four cards. */
  deckWeights: Record<string, number>;
}

export const MONTH_THEMES: Record<number, RemembranceTheme> = {
  1: {
    title: "The Echo — Who have you been performing?",
    shortTitle: "The Echo",
    emotion: "Recognition of the false self",
    deckWeights: { "The Sacred Rewrite": 3, "AreekeerA": 2 },
  },
  2: {
    title: "The Inheritance — What did you carry that was never yours?",
    shortTitle: "The Inheritance",
    emotion: "Ancestral patterns",
    deckWeights: { "AreekeerA": 3, "Magic not Logic": 2 },
  },
  3: {
    title: "The Body Remembers — Where does the story live in you?",
    shortTitle: "The Body Remembers",
    emotion: "Somatic awareness",
    deckWeights: { "The Art of Self-Healing": 3, "AreekeerA": 2 },
  },
  4: {
    title: "The Threshold — What are you ready to release?",
    shortTitle: "The Threshold",
    emotion: "Letting go",
    deckWeights: { "The Sacred Rewrite": 3, "Magic not Logic": 2 },
  },
  5: {
    title: "The Soft Animal — How do you come home to yourself?",
    shortTitle: "The Soft Animal",
    emotion: "Self-tenderness",
    deckWeights: { "The Art of Self-Healing": 3, "The Sacred Rewrite": 2 },
  },
  6: {
    title: "The Midpoint Mirror — Halfway. What's shifting?",
    shortTitle: "The Midpoint Mirror",
    emotion: "Reflection + recalibration",
    deckWeights: {
      "The Sacred Rewrite": 2,
      "AreekeerA": 2,
      "Magic not Logic": 2,
      "The Art of Self-Healing": 2,
    },
  },
  7: {
    title: "The Voice — What have you been afraid to say?",
    shortTitle: "The Voice",
    emotion: "Truth-telling",
    deckWeights: { "Magic not Logic": 3, "The Sacred Rewrite": 2 },
  },
  8: {
    title: "The Boundary — Where does your yes live? Your no?",
    shortTitle: "The Boundary",
    emotion: "Sovereignty",
    deckWeights: { "AreekeerA": 3, "The Art of Self-Healing": 2 },
  },
  9: {
    title: "The Longing — What is your heart actually asking for?",
    shortTitle: "The Longing",
    emotion: "Desire as compass",
    deckWeights: { "Magic not Logic": 3, "The Sacred Rewrite": 2 },
  },
  10: {
    title: "The Offering — What are you here to give?",
    shortTitle: "The Offering",
    emotion: "Purpose",
    deckWeights: { "AreekeerA": 3, "Magic not Logic": 2 },
  },
  11: {
    title: "The Gratitude — What has held you?",
    shortTitle: "The Gratitude",
    emotion: "Receiving + reverence",
    deckWeights: {
      "The Sacred Rewrite": 2,
      "AreekeerA": 2,
      "Magic not Logic": 2,
      "The Art of Self-Healing": 2,
    },
  },
  12: {
    title: "The Becoming — Who are you now?",
    shortTitle: "The Becoming",
    emotion: "Integration + benediction",
    deckWeights: {
      "The Sacred Rewrite": 3,
      "AreekeerA": 2,
      "Magic not Logic": 1,
      "The Art of Self-Healing": 1,
    },
  },
};

export const MONTH_SHORT_TITLES: Record<number, string> = Object.fromEntries(
  Object.entries(MONTH_THEMES).map(([m, t]) => [Number(m), t.shortTitle]),
) as Record<number, string>;
