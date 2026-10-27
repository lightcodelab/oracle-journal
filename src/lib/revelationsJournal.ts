import { PROTECTION_PREDICTION_QUESTION, REVELATIONS_EVIDENCE_QUESTIONS, RETURN_QUESTION } from "@/lib/evidenceFramework";

export const REVELATIONS_PROFILE_LINKS = [
  { label: "My Profile", route: "/profile" },
  { label: "My Account", route: "/account" },
  { label: "My Saved Revelations", route: "/revelations/saved" },
] as const;

export const REGULATION_QUESTION = {
  key: "regulation_experience",
  label: "Write down whatever you experienced in your body, emotions, thoughts, etc before and after you did this Regulation practice.",
} as const;

export const REVELATIONS_PHASE_FIELDS = {
  reveal: [{ key: "pattern_location", label: "Name how this has shown up for you." }],
  regulate: [REGULATION_QUESTION],
  investigate: [REVELATIONS_EVIDENCE_QUESTIONS[0], PROTECTION_PREDICTION_QUESTION, ...REVELATIONS_EVIDENCE_QUESTIONS.slice(1), RETURN_QUESTION],
};

export function revelationAnswers(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}