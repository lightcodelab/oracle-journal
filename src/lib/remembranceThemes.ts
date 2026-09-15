/**
 * The Remembrance Letters — display copy for the twelve monthly themes.
 * Mirrors supabase/functions/_shared/remembranceThemes.ts (the source of truth
 * used for generation). Keep the two in step.
 */

export interface RemembranceThemeDisplay {
  month: number;
  shortTitle: string;
  title: string;
  emotion: string;
}

export const REMEMBRANCE_THEMES: RemembranceThemeDisplay[] = [
  { month: 1, shortTitle: "The Echo", title: "The Echo — Who have you been performing?", emotion: "Recognition of the false self" },
  { month: 2, shortTitle: "The Inheritance", title: "The Inheritance — What did you carry that was never yours?", emotion: "Ancestral patterns" },
  { month: 3, shortTitle: "The Body Remembers", title: "The Body Remembers — Where does the story live in you?", emotion: "Somatic awareness" },
  { month: 4, shortTitle: "The Threshold", title: "The Threshold — What are you ready to release?", emotion: "Letting go" },
  { month: 5, shortTitle: "The Soft Animal", title: "The Soft Animal — How do you come home to yourself?", emotion: "Self-tenderness" },
  { month: 6, shortTitle: "The Midpoint Mirror", title: "The Midpoint Mirror — Halfway. What's shifting?", emotion: "Reflection + recalibration" },
  { month: 7, shortTitle: "The Voice", title: "The Voice — What have you been afraid to say?", emotion: "Truth-telling" },
  { month: 8, shortTitle: "The Boundary", title: "The Boundary — Where does your yes live? Your no?", emotion: "Sovereignty" },
  { month: 9, shortTitle: "The Longing", title: "The Longing — What is your heart actually asking for?", emotion: "Desire as compass" },
  { month: 10, shortTitle: "The Offering", title: "The Offering — What are you here to give?", emotion: "Purpose" },
  { month: 11, shortTitle: "The Gratitude", title: "The Gratitude — What has held you?", emotion: "Receiving + reverence" },
  { month: 12, shortTitle: "The Becoming", title: "The Becoming — Who are you now?", emotion: "Integration + benediction" },
];

export function themeForMonth(month: number): RemembranceThemeDisplay | undefined {
  return REMEMBRANCE_THEMES.find((t) => t.month === month);
}

export const REMEMBRANCE_REFLECTION_QUESTIONS = [
  {
    key: "asking_to_be_seen" as const,
    label: "What is asking to be seen?",
    help: "What truth, pattern, or feeling is this reading bringing into the light?",
  },
  {
    key: "invited_to_shift" as const,
    label: "What am I being invited to shift?",
    help: "What am I ready to soften, release, reclaim, or choose differently?",
  },
  {
    key: "how_i_will_live_it" as const,
    label: "How will I live this message?",
    help: "What is one intention, boundary, or action I will carry into this month?",
  },
];
