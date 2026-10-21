// THE TEMPLE's guiding methodology, used by readings and the Evidence Collector.
export const FRAMEWORK_STATEMENT =
  "Protection Patterns use old evidence to predict future outcomes, so we need to collect new evidence to change anything.";

export const GUIDING_QUESTION_MAX = 500;

export const GROUNDING_QUESTION = {
  key: "pattern_location" as const,
  label: "Where has this pattern shown up for you most recently?",
};

export const EVIDENCE_QUESTIONS = [
  { key: "old_evidence" as const, label: "What old evidence is this pattern using to justify itself?" },
  { key: "new_evidence" as const, label: "What new evidence do you already have that contradicts it?" },
  { key: "todays_choice" as const, label: "What's one choice you could make today that would add to your new evidence file?" },
];

export const RETURN_QUESTION = {
  key: "returned_evidence" as const,
  label: "Return with New Evidence",
  help: "Come back after you've made your choice. What actually happened? Add the new evidence that contradicts what the old protection pattern predicted.",
};

export const EVIDENCE_KEYS = [
  GROUNDING_QUESTION.key,
  ...EVIDENCE_QUESTIONS.map((q) => q.key),
  RETURN_QUESTION.key,
] as const;
