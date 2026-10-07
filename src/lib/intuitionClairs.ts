// Shared config for The Intuition Builder course: the five Clairs, their
// tracker tool slugs, and the embedded Dominant Intuitive Language quiz.

export type ClairKey = "clairvoyance" | "clairaudience" | "clairsentience" | "clairalience" | "claircognizance";

export interface ClairInfo {
  key: ClairKey;
  name: string;
  sense: string;
  trackerSlug: string;
  icon: string; // lucide icon name
}

export const CLAIRS: ClairInfo[] = [
  { key: "clairvoyance", name: "Clairvoyance", sense: "Clear Seeing", trackerSlug: "clairvoyance-tracker", icon: "Eye" },
  { key: "clairaudience", name: "Clairaudience", sense: "Clear Hearing", trackerSlug: "clairaudience-tracker", icon: "Ear" },
  { key: "clairsentience", name: "Clairsentience", sense: "Clear Feeling", trackerSlug: "clairsentience-tracker", icon: "HandHeart" },
  { key: "clairalience", name: "Clairalience", sense: "Clear Smelling", trackerSlug: "clairalience-tracker", icon: "Flower2" },
  { key: "claircognizance", name: "Claircognizance", sense: "Clear Knowing", trackerSlug: "claircognizance-tracker", icon: "Lightbulb" },
];

export const TALLY_SLUG = "signs-signals-tally";
export const INTUITION_QUIZ_SLUG = "what-dominant-language-does-your-intuition-speak";
export const INTUITION_TOOL_SLUGS = [TALLY_SLUG, ...CLAIRS.map((c) => c.trackerSlug)];

/** Work out which Clair an entry belongs to (tracker slug, or the tally's "clair" answer). */
export const clairForEntry = (toolSlug: string | undefined, answers: Record<string, any>): ClairKey | null => {
  const byTool = CLAIRS.find((c) => c.trackerSlug === toolSlug);
  if (byTool) return byTool.key;
  const raw = String(answers?.clair || "").toLowerCase();
  return CLAIRS.find((c) => raw.includes(c.key))?.key ?? null;
};

/** Find the Clair named in a quiz result title, e.g. "Congratulations, you have CLAIRVOYANCE". */
export const clairFromText = (text: string | null | undefined): ClairKey | null => {
  const t = (text || "").toLowerCase();
  return CLAIRS.find((c) => t.includes(c.key))?.key ?? null;
};
