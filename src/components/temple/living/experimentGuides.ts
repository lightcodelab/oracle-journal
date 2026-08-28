/**
 * LP-C.1 — Experiment Guides.
 *
 * A calm, static, member-selected menu. These are NOT inferred, ranked, or
 * recommended, and they are not medical, psychological, legal, relationship, or
 * safety advice. Every guide shares the same compact structure so no option
 * reads as superior.
 */

export type GuideKey =
  | "make_it_smaller"
  | "meet_one_basic_need"
  | "ask_for_space"
  | "gather_one_fact"
  | "borrow_steadiness"
  | "smaller_boundary"
  | "own";

export interface ExperimentGuide {
  key: GuideKey;
  title: string;
  purpose: string;
  tryThis: string;
  testing: string;
  notice: string;
  changeCourse: string;
  script?: string;
}

export const CHANGE_COURSE_NOTE =
  "Change course freely. Stopping, altering, or returning with “not enough information yet” is all real evidence.";

export const EXPERIMENT_GUIDES: ExperimentGuide[] = [
  {
    key: "make_it_smaller",
    title: "Make it smaller",
    purpose: "For when something feels too large to begin from where you are.",
    tryThis:
      "Choose the smallest version of this you could try in the next ten minutes.",
    testing: "Whether size, rather than willingness, was the difficulty.",
    notice: "What became possible, and what was still too much.",
    changeCourse: CHANGE_COURSE_NOTE,
  },
  {
    key: "meet_one_basic_need",
    title: "Meet one basic need first",
    purpose: "For when a decision is being made in a depleted body.",
    tryThis:
      "Before deciding, offer yourself one simple condition of care: water, food if needed, air, warmth, the bathroom, a change of position, or a little quiet.",
    testing: "Whether the situation shifts when one condition of care is met.",
    notice: "Whether the urgency, the meaning, or the choice changed at all.",
    changeCourse: CHANGE_COURSE_NOTE,
  },
  {
    key: "ask_for_space",
    title: "Ask for a little space",
    purpose: "For when you are being asked to answer faster than you can think.",
    tryThis: "Ask for a defined amount of time before you respond.",
    script: "I want to answer well. I need until [time] before I respond.",
    testing: "Whether time changes what you would choose.",
    notice: "How the request landed, and what the pause made available.",
    changeCourse: CHANGE_COURSE_NOTE,
  },
  {
    key: "gather_one_fact",
    title: "Gather one fact",
    purpose: "For when a story is forming faster than the information.",
    tryThis: "Choose one single thing you would like to understand, and ask about it.",
    script:
      "Before I decide what this means, I want to understand one thing: [question].",
    testing: "Whether more information complicates or clarifies the story.",
    notice: "What you learned, and what remains genuinely unknown.",
    changeCourse: CHANGE_COURSE_NOTE,
  },
  {
    key: "borrow_steadiness",
    title: "Borrow steadiness",
    purpose: "For when company would help more than a solution.",
    tryThis: "Ask one person for presence rather than advice.",
    script:
      "I do not need you to solve this. Could you listen or sit with me for ten minutes while I find my next step?",
    testing: "Whether being accompanied changes your capacity.",
    notice: "What being with someone did, or did not, make easier.",
    changeCourse: CHANGE_COURSE_NOTE,
  },
  {
    key: "smaller_boundary",
    title: "Set a smaller boundary",
    purpose: "For when a full yes is not available and a full no feels impossible.",
    tryThis: "Offer the part you can actually do, or a time to revisit it.",
    script:
      "I cannot do [full request] today. I can [smaller thing], or revisit this by [time].",
    testing: "Whether a partial, honest offer is workable.",
    notice: "How it was received, and how it felt in your body afterwards.",
    changeCourse: CHANGE_COURSE_NOTE,
  },
  {
    key: "own",
    title: "Write my own experiment",
    purpose: "For when you already know the thing you are curious to try.",
    tryThis: "Describe it in your own words, as small as you like.",
    testing: "Whatever you are genuinely curious about.",
    notice: "Anything that is different, the same, or surprising.",
    changeCourse: CHANGE_COURSE_NOTE,
  },
];

export function guideByKey(key: string | null | undefined) {
  return EXPERIMENT_GUIDES.find((g) => g.key === key) ?? null;
}

export const OUTCOME_LABELS: { value: string; label: string }[] = [
  { value: "supported_prediction", label: "This supported what I thought" },
  { value: "complicated_prediction", label: "This complicated what I thought" },
  { value: "contradicted_prediction", label: "This contradicted what I thought" },
  { value: "insufficient_information", label: "Not enough information yet" },
  { value: "changed_course", label: "I changed course" },
];

export const LIFECYCLE_LABELS: Record<string, string> = {
  active: "Open",
  returned: "Returned to",
  changed_course: "Changed course",
  stopped: "Stopped",
};
