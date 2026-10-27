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

// Shared Revelations and Sacred Spreads versions of the three evidence questions:
// same keys (so saved answers stay compatible), but with deeper guides themed
// around business visibility and shame. Used by The Evidence Locker.
export const REVELATIONS_EVIDENCE_QUESTIONS = [
  {
    key: "old_evidence" as const,
    label: "What old evidence is this pattern using to justify itself?",
    guide: {
      meaning:
        "Every protection pattern was learned somewhere. Long before the business, something taught you that being fully seen was unsafe — that speaking up, wanting more, or being visible came with a cost. Trace it back: What happened when you were visible as a child, in school, in early work, in past relationships? What did you learn about what happens to people who shine, ask, or take up space? What does the voice inside say will happen if you let yourself be truly seen in your work now?",
      example:
        "“When I won an award at school, my best friend stopped talking to me for a week and Mum told me not to boast. So part of me believes that if my business becomes visible and successful, the people I love will quietly turn away — and it will be my fault for wanting too much.”",
    } as EvidenceGuide,
  },
  {
    key: "new_evidence" as const,
    label: "What new evidence do you already have that contradicts it?",
    guide: {
      meaning:
        "Look for any moment, even a small one, where you were visible and the predicted disaster didn't happen. A post you were terrified to publish that someone thanked you for. A price you stated out loud that was simply accepted. A time you showed your real opinion and the relationship survived — or even deepened. These moments are easy to dismiss as flukes; the pattern will tell you they don't count. Write them down anyway. They are evidence. And the more new evidence you can collect, the faster reality can reshape around you.",
      example:
        "“I finally shared the story of why I started this work, shaking the whole time. Three women messaged to say it was exactly what they needed to hear. Nobody called me self-absorbed. The sky did not fall.”",
    } as EvidenceGuide,
  },
  {
    key: "todays_choice" as const,
    label: "What's one choice you could make today that would add to your new evidence file?",
    guide: {
      meaning:
        "Choose one small, doable act of visibility that gently goes against what the pattern demands. Not a grand gesture — a real one. Send the pitch you've been redrafting for weeks. Publish the thing with your actual face or name on it. Say your price without apologising. It only needs to be big enough to give you a real experience to learn from — one the pattern can't explain away.",
      example:
        "“Today I'll reply to the enquiry sitting in my inbox with my real rate, written plainly, without the discount I usually offer before anyone asks.”",
    } as EvidenceGuide,
  },
];

// Extra question shared by Revelations and Sacred Spreads Evidence Lockers.
export const PROTECTION_PREDICTION_QUESTION = {
  key: "protection_prediction" as const,
  label: "What is the protection pattern predicting will happen if you actually do what you are avoiding?",
  guide: {
    meaning:
      "Protection Patterns keep us safe by making quiet predictions about the future: if you do the thing you're avoiding, something bad will follow. Name the prediction out loud, exactly as the pattern tells it. What does it say will happen? Who will be upset, what will you lose, what will it prove about you? Once the prediction is written down, it becomes something you can test with new evidence instead of something that silently runs your choices.",
    example:
      "“If I actually raise my prices, the pattern says everyone will leave, I'll be seen as greedy, and the whole business will collapse — proof that I was never cut out for this.”",
  } as EvidenceGuide,
};

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
