// THE TEMPLE's guiding methodology, used by readings and the Evidence Collector.
export const FRAMEWORK_STATEMENT =
  "Protection Patterns use old evidence to predict future outcomes, so we need to collect new evidence to change anything.";

export const GUIDING_QUESTION_MAX = 500;

export type EvidenceGuide = { meaning: string; example: string };

export const GROUNDING_QUESTION = {
  key: "pattern_location" as const,
  label: "Where has this pattern shown up for you most recently?",
  guide: {
    meaning:
      "Think of one real moment from the last few days or weeks where the feeling or habit in your reading showed up. Keep it simple: where you were, who was there, what you felt or did.",
    example:
      "“On Tuesday my sister asked for help with the move. I said yes straight away, even though I was exhausted, then lay awake resenting it.”",
  } as EvidenceGuide,
};

export const EVIDENCE_QUESTIONS = [
  {
    key: "old_evidence" as const,
    label: "What old evidence is this pattern using to justify itself?",
    guide: {
      meaning:
        "Every habit that protects us is built on past experiences that taught us it was needed. What happened before (often long ago) that made this reaction feel safe or necessary? What does the voice inside say will happen if you do it differently?",
      example:
        "“When I said no as a child, Mum went quiet for days. So part of me believes that if I say no, people will pull away from me.”",
    } as EvidenceGuide,
  },
  {
    key: "new_evidence" as const,
    label: "What new evidence do you already have that contradicts it?",
    guide: {
      meaning:
        "Look for any time, even a small one, when things went differently from what that old fear predicted. Moments when you did the scary thing and it was okay, or someone surprised you with kindness.",
      example:
        "“Last month I told my friend I couldn't make dinner, and she just said ‘no worries, next time’. Nothing bad happened.”",
    } as EvidenceGuide,
  },
  {
    key: "todays_choice" as const,
    label: "What's one choice you could make today that would add to your new evidence file?",
    guide: {
      meaning:
        "Choose one small, doable action that gently goes against the old pattern. It doesn't need to be big. It just needs to give you a real experience you can learn from.",
      example:
        "“When my sister messages tonight, I'll wait an hour before replying and check whether I actually have the energy to help.”",
    } as EvidenceGuide,
  },
];

export const RETURN_QUESTION = {
  key: "returned_evidence" as const,
  label: "Return with New Evidence",
  help: "Come back after you've made your choice. What actually happened? Add the new evidence that contradicts what the old protection pattern predicted.",
  guide: {
    meaning:
      "After you've tried your choice, come back and write what really happened, compared with what the old fear said would happen. This is how the old belief starts to loosen.",
    example:
      "“I told her I could only help Saturday morning. She said thank you and organised someone else for the afternoon. She wasn't upset at all.”",
  } as EvidenceGuide,
};

export const EVIDENCE_KEYS = [
  GROUNDING_QUESTION.key,
  ...EVIDENCE_QUESTIONS.map((q) => q.key),
  RETURN_QUESTION.key,
] as const;
