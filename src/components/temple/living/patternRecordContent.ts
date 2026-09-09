/**
 * Pattern Record content (LP-G.1).
 *
 * The whole chain a member is learning to see:
 * Moment → State → Meaning → Prediction → Familiar Pattern → Choice →
 * Identity → Experiment → Evidence.
 *
 * Australian spelling ("Practise") in every member-facing label. No scoring,
 * no diagnosis, no interpretation — the words below only ask questions.
 */

export const MOVEMENTS = ["Pause", "Perceive", "Practise"] as const;
export type Movement = (typeof MOVEMENTS)[number];

export const NOT_SURE = "I'm not sure yet";

/** Controlled option lists. Stored as codes so themes can be counted exactly. */
export const CAPACITY_OPTIONS = [
  { code: "very_little", label: "Very little today" },
  { code: "some_carefully", label: "Some, carefully" },
  { code: "ordinary", label: "Ordinary" },
  { code: "more_than_usual", label: "More than usual" },
] as const;

export const FAMILIARITY_OPTIONS = [
  { code: "very_familiar", label: "Very familiar" },
  { code: "a_little_familiar", label: "A little familiar" },
  { code: "new", label: "This felt new" },
  { code: "not_sure_yet", label: NOT_SURE },
] as const;

export const CONTINUE_IDENTITY_OPTIONS = [
  { code: "yes", label: "Yes" },
  { code: "not_this_time", label: "Not this time" },
  { code: "not_sure_yet", label: NOT_SURE },
] as const;

export const PREDICTION_OUTCOME_OPTIONS = [
  { code: "came_true", label: "It came true" },
  { code: "partly_came_true", label: "It partly came true" },
  { code: "not_as_expected", label: "It did not happen as I expected" },
  { code: "not_sure_yet", label: NOT_SURE },
] as const;

/** Her own words come first; these are only offered as a starting vocabulary. */
export const STATE_WORD_OPTIONS = [
  "Tender",
  "Tired",
  "Activated",
  "Braced",
  "Heavy",
  "Numb",
  "Irritated",
  "Anxious",
  "Hurt",
  "Ashamed",
  "Steady",
  "Quietly well",
  "Relieved",
  "Grateful",
  "Alive",
  "Clear",
];

/**
 * The small starting set shown on "What was happening in you?". Everything
 * else in STATE_WORD_OPTIONS sits behind "Show more" so the screen stays
 * quiet; "Add your own word" is always available.
 */
export const PRIMARY_STATE_WORDS = [
  "Activated",
  "Anxious",
  "Hurt",
  "Heavy",
  "Numb",
  "Tired",
  "Steady",
  "Connected",
];

export const BODY_CUE_OPTIONS = [
  "Tight chest",
  "Held breath",
  "Clenched jaw",
  "Knot in stomach",
  "Heat in face",
  "Racing heart",
  "Heavy limbs",
  "Restless legs",
  "Shoulders up",
  "Throat tight",
  "Settled",
  "Warm",
];

export type QuestionKind = "text" | "chips_text" | "single";

export interface PatternQuestion {
  /** Field on the record this screen writes. */
  field:
    | "moment_text"
    | "state_words"
    | "body_text"
    | "capacity"
    | "meaning_text"
    | "prediction_text"
    | "familiarity"
    | "protection_text"
    | "action_text"
    | "identity_text"
    | "continue_identity"
    | "experiment_text";
  movement: Movement;
  kind: QuestionKind;
  question: string;
  helper: string[];
  placeholder?: string;
  /** Chip vocabulary for chips_text screens. */
  chips?: string[];
  chipsLabel?: string;
  /** Controlled options for single-choice screens. */
  options?: readonly { code: string; label: string }[];
  /** A second free-text field shown on the same screen (body cues, state note). */
  cueField?: "state_note" | "body_cues";
  /** Only shown when the moment felt familiar. */
  conditional?: boolean;
  /**
   * False only for "What happened?" — a Pattern Record always begins with a
   * brief factual description of a specific moment, so "I'm not sure yet" is
   * not offered there. It remains a valid completed response on the insight
   * questions.
   */
  allowNotSure?: boolean;
}

export const PATTERN_QUESTIONS: PatternQuestion[] = [
  {
    field: "moment_text",
    movement: "Pause",
    kind: "text",
    allowNotSure: false,
    question: "What happened?",
    helper: [
      "Just the moment itself — what was said, or done, or what you noticed.",
      "Not what it meant yet. That comes later.",
    ],
    placeholder: "She replied with one word and nothing else…",
  },
  {
    field: "state_words",
    movement: "Pause",
    kind: "chips_text",
    question: "What was happening in you?",
    helper: [
      "Choose any words that fit, or add your own.",
      "Difficult, neutral and restful states all belong here.",
    ],
    chips: STATE_WORD_OPTIONS,
    chipsLabel: "Words for this state",
    placeholder: "Add your own word and press Enter",
  },
  {
    field: "body_text",
    movement: "Pause",
    kind: "chips_text",
    question: "Where did you feel it in your body?",
    helper: ["Your body often knows before your thinking does."],
    chips: BODY_CUE_OPTIONS,
    chipsLabel: "Body cues",
    cueField: "body_cues",
    placeholder: "In my chest, and my breath went shallow…",
  },
  {
    field: "capacity",
    movement: "Pause",
    kind: "single",
    question: "How much capacity did you have in that moment?",
    helper: ["This is context, not a measurement of you."],
    options: CAPACITY_OPTIONS,
  },
  {
    field: "meaning_text",
    movement: "Perceive",
    kind: "text",
    question: "What did your mind decide it meant?",
    helper: [
      "The meaning your mind made, in your own words.",
      "You are not agreeing with it by writing it down.",
    ],
    placeholder: "It meant I had asked for too much…",
  },
  {
    field: "prediction_text",
    movement: "Perceive",
    kind: "text",
    question: "What did your mind predict would happen next?",
    helper: ["The future your mind was already picturing."],
    placeholder: "That she would pull away and I would lose the friendship…",
  },
  {
    field: "familiarity",
    movement: "Perceive",
    kind: "single",
    question: "Did this feel familiar?",
    helper: ["Familiar means you have felt this shape of thing before."],
    options: FAMILIARITY_OPTIONS,
  },
  {
    field: "protection_text",
    movement: "Perceive",
    kind: "text",
    conditional: true,
    question: "What might that familiar response have been protecting?",
    helper: [
      "Old responses usually protected something real, once.",
      "Naming it is not excusing it.",
    ],
    placeholder: "It kept me from being seen as difficult…",
  },
  {
    field: "action_text",
    movement: "Practise",
    kind: "text",
    question: "What did you do?",
    helper: ["What you actually did, said, or did not say."],
    placeholder: "I went quiet and started making it easier for her…",
  },
  {
    field: "identity_text",
    movement: "Practise",
    kind: "text",
    question: "Who were you being in that moment?",
    helper: ["Not a verdict on you — a description of the version of you present."],
    placeholder: "The one who keeps the peace…",
  },
  {
    field: "continue_identity",
    movement: "Practise",
    kind: "single",
    question: "Do you want to keep being her here?",
    helper: ["All three answers are complete answers."],
    options: CONTINUE_IDENTITY_OPTIONS,
  },
  {
    field: "experiment_text",
    movement: "Practise",
    kind: "text",
    question: "What is one small experiment you will try?",
    helper: [
      "Something small enough that you would actually do it.",
      "An experiment, not a promise — you are gathering evidence.",
    ],
    placeholder: "I will say the true sentence once, without softening it…",
  },
];

export const RETURN_QUESTIONS = [
  {
    field: "tried_text" as const,
    question: "What did you try?",
    helper: ["What you actually did — even if it was different from your plan."],
    placeholder: "I said it once, plainly…",
  },
  {
    field: "happened_text" as const,
    question: "What actually happened?",
    helper: ["What life showed you, not what you feared or hoped."],
    placeholder: "She paused, then answered properly…",
  },
  {
    field: "noticed_text" as const,
    question: "What did you notice in yourself?",
    helper: ["During, or afterwards. Any of it counts."],
    placeholder: "My hands shook and then something settled…",
  },
  {
    field: "prediction_outcome" as const,
    question: "What happened to the prediction your mind made?",
    helper: ["This is how evidence builds, one moment at a time."],
    options: PREDICTION_OUTCOME_OPTIONS,
  },
  {
    field: "support_text" as const,
    question: "Was anything supportive along the way?",
    helper: ["Optional. A person, a practice, a place, or nothing at all."],
    placeholder: "Leave this empty if nothing comes to mind",
    optional: true,
  },
  {
    field: "carry_forward_text" as const,
    question: "What do you want to carry forward?",
    helper: ["One line for the next time this shape of moment arrives."],
    placeholder: "The disappointment passed faster than the pretending did…",
  },
];

export const SAVE_LABEL = "Save this Pattern Record";
export const SAVE_CONFIRMATION =
  "This record is yours. You can return when life has had time to answer back.";
export const RETURN_SAVE_LABEL = "Add this to my evidence";

export const labelFor = (
  options: readonly { code: string; label: string }[],
  code: string | null | undefined,
) => options.find((o) => o.code === code)?.label ?? "";
