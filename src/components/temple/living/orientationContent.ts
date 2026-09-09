/**
 * LP-O.2 — "Learning the Living Pattern".
 *
 * Teaching copy only. Nothing in this file reads, writes, prefills, ranks,
 * infers, scores or shares anything. Every example is fictional/composite and
 * is displayed as an example only; it never enters a member's private record.
 *
 * No Arrival route, import, data path or reference exists here.
 */

export const EXAMPLE_DISCLAIMER =
  "Example only — adapt, skip, or write your own.";

/** Retained for the earlier-record screens, which remain available read-only. */
export const GLOBAL_MOVEMENT_HELPER =
  "These are earlier records from the previous Living Pattern format. Your new Pattern Records now hold Pause, Perceive and Practise together.";

export const ORIENTATION_PROMISE = [
  "You do not need certainty before you live differently.",
  "You need enough curiosity to try one small thing, and enough tenderness to learn from what happens.",
];

export const ORIENTATION_INVITATION = [
  "Follow one real moment through Pause, Perceive and Practise.",
  "Choose one small experiment rather than demanding a perfect answer.",
  "Return later to record what life actually showed you.",
];

export interface OrientationLesson {
  key: string;
  eyebrow: string;
  title: string;
  /** Paragraphs of member-facing copy. */
  copy: string[];
  /** Optional quoted script a member may borrow. */
  script?: string;
  /** "Teach" bullets. */
  teach?: string[];
  /** A short teaching callout, e.g. for Experiment Guides. */
  guideNote?: string;
  /** A three-column table: heading row plus rows. */
  table?: { head: string[]; rows: string[][] };
  /** Movement descriptions, where the lesson teaches a movement. */
  movements?: { name: string; body: string }[];
  /** Labelled fictional examples. */
  examples?: { title: string; lines: { label: string; body: string }[] }[];
  enoughForToday?: string;
  close?: string;
}

export const ORIENTATION_LESSONS: OrientationLesson[] = [
  {
    key: "welcome",
    eyebrow: "Welcome",
    title: "One moment, seen as a whole",
    copy: [
      "You do not need certainty before you live differently. You need enough curiosity to try one small thing, and enough tenderness to learn from what happens.",
      "The Living Pattern is a private practice for seeing the whole chain that shapes a response: Moment → State → Meaning → Prediction → Familiar Pattern → Choice → Identity → Experiment → Evidence.",
      "You are not the problem under inspection. You are following one real moment closely enough to notice what happened, what was happening in you, what your mind made it mean, what it predicted, and what became possible next.",
    ],
    teach: [
      "Nothing is shared.",
      "No score, streak, diagnosis, or correct answer exists.",
      "The AreekeerA® Guide and Arrival do not read, interpret, or prefill your records.",
      "“I'm not sure yet” is a complete answer wherever it is offered.",
    ],
    close: "The aim is not perfect self-awareness. It is enough clarity to have more choice.",
  },
  {
    key: "whole-record",
    eyebrow: "Lesson 1",
    title: "Why the whole chain matters",
    copy: [
      "A moment, a feeling, a story and a choice do not happen in isolation. They form a sequence, often so quickly that the ending can feel inevitable.",
      "A Pattern Record keeps the sequence together. Pause, Perceive and Practise are movements within one record—not separate logs and not three different versions of the truth.",
    ],
    table: {
      head: ["Movement", "You notice", "What it makes visible"],
      rows: [
        ["Pause", "The moment, your state, your body and your capacity", "The conditions in which your response began"],
        ["Perceive", "The meaning, prediction and familiar protection", "What your mind added and what the pattern may have been trying to prevent"],
        ["Practise", "Your action, the version of you present and one experiment", "Where a more conscious choice can enter"],
        ["Return", "What you tried and what actually happened", "Evidence from your life rather than fear, hope or self-judgement"],
      ],
    },
    script: "The sequence is not a verdict. It is a way to see where another choice might become possible.",
  },
  {
    key: "pause",
    eyebrow: "Lesson 2",
    title: "Pause — begin with what happened",
    copy: [
      "Pause begins with the camera-view version of the moment before asking what it meant. Then it makes room for your state, your body and the capacity you actually had.",
      "A state is information, not an identity. Capacity is context, not a measurement of you. Neither has to disappear before you can continue.",
    ],
    movements: [
      { name: "Moment", body: "What happened—what was said, done, or noticed?" },
      { name: "State", body: "What was happening in you?" },
      { name: "Body", body: "Where did you feel it in your body?" },
      { name: "Capacity", body: "How much capacity did you have in that moment?" },
    ],
    script: "This happened. This was happening in me. I can honour both without making either the whole story.",
    examples: [
      {
        title: "A delayed reply",
        lines: [
          { label: "Moment", body: "A friend read my message yesterday and has not replied." },
          { label: "State", body: "Anxious and braced." },
          { label: "Body", body: "Tight chest and held breath." },
          { label: "Capacity", body: "Some, carefully." },
        ],
      },
    ],
  },
  {
    key: "perceive",
    eyebrow: "Lesson 3",
    title: "Perceive — separate meaning from prediction",
    copy: [
      "Meaning is the conclusion your mind made about the moment. Prediction is the future it began preparing for. Both may feel convincing; neither needs to be shamed or treated as the whole reality.",
      "When a response feels familiar, the record asks what it may have been protecting. That question honours the intelligence of an old response without requiring you to repeat it.",
    ],
    teach: [
      "Writing a meaning down does not mean agreeing with it.",
      "A prediction can be understandable and still be incomplete.",
      "You do not need to excavate your history or explain where a pattern began.",
      "If you are not sure whether it is familiar, “I'm not sure yet” is enough.",
    ],
    examples: [
      {
        title: "The same delayed reply",
        lines: [
          { label: "Meaning", body: "I had asked for too much." },
          { label: "Prediction", body: "She would pull away and I would lose the friendship." },
          { label: "Familiarity", body: "Very familiar." },
          { label: "Protection", body: "Going quiet first protected me from being seen as needy." },
        ],
      },
    ],
  },
  {
    key: "practise",
    eyebrow: "Lesson 4",
    title: "Practise — let one choice become an experiment",
    copy: [
      "Practise begins with what you actually did. It then asks who you were being—not as a permanent label, but as a description of the version of you present in that moment.",
      "The final question is one small experiment. It is not a promise to become someone else. It is a way to let reality contribute new information.",
    ],
    teach: [
      "Identity here describes a response; it does not define your whole self.",
      "You may want to keep being her, choose differently this time, or not know yet.",
      "A useful experiment is voluntary, specific, small enough to try, and easy to revise.",
      "Its value is what you learn, not whether you perform it perfectly.",
    ],
    examples: [
      {
        title: "The choice inside the moment",
        lines: [
          { label: "Action", body: "I went quiet and started making my message smaller." },
          { label: "Identity", body: "The one who keeps the peace by disappearing." },
          { label: "Continue?", body: "Not this time." },
          { label: "Experiment", body: "I will leave the message as written and wait until tomorrow before deciding what the silence means." },
        ],
      },
    ],
  },
  {
    key: "return",
    eyebrow: "Lesson 5",
    title: "Return — let life answer back",
    copy: [
      "A Pattern Record is complete after Pause, Perceive and Practise. Return happens later, when there is something real to notice. It is an invitation, never an overdue task.",
      "A Return asks what you tried, what actually happened, what you noticed in yourself, what happened to the prediction, what supported you, and what you want to carry forward.",
    ],
    teach: [
      "The prediction may come true, partly come true, unfold differently, or remain uncertain.",
      "Changing course, forgetting, stopping, or discovering the experiment was too large are all information.",
      "One Return does not prove a universal truth. It adds one honest piece of evidence.",
      "Common Themes count only the words and options you recorded; they do not interpret you.",
    ],
    table: {
      head: ["Return asks", "It is listening for", "A valid answer"],
      rows: [
        ["What did you try?", "The action you actually took", "“I waited until the next day.”"],
        ["What actually happened?", "The observable result", "“She replied warmly that evening.”"],
        ["What happened to the prediction?", "How expectation met reality", "“It did not happen as I expected.”"],
      ],
    },
    enoughForToday: "“I'm not sure yet” is evidence too. It means life has not answered clearly enough.",
    close: "You are not collecting proof that you are good at life. You are letting your actual life have a voice.",
  },
];

/** The five honest returns, taught in the orientation and echoed in Field Notes. */
export const HONEST_RETURNS = [
  "It supported what I suspected.",
  "It complicated what I suspected.",
  "It contradicted what I suspected.",
  "I do not have enough information yet.",
  "I stopped or changed course, and that was information too.",
];

export interface PromptHelp {
  meaning?: string;
  example?: string;
  enough?: string;
}

/** Pause — Register / Receive / Reorient. */
export const PAUSE_HELP: Record<string, PromptHelp> = {
  register: {
    meaning: "Name the state, not the whole history of it.",
    example: "“Tender. Tired. My shoulders are high.”",
    enough: "Choose one state word.",
  },
  receive: {
    meaning: "Acknowledge what is here without agreeing with every thought it brings.",
    example: "“This is here. I can wait before deciding what it means.”",
    enough: "“I do not have to fix this yet.”",
  },
  reorient: {
    meaning: "Choose a direction small enough for your actual capacity.",
    example: "“Stand outside for two minutes before I answer.”",
    enough: "“Water, then one email.”",
  },
};

/** Presence — Register / Recognise / Recalibrate. */
export const PRESENCE_LEAD_IN =
  "Choose one question that opens something. You do not need to answer every question to save this Moment.";

export const PRESENCE_HELP: Record<string, PromptHelp> = {
  happened: {
    meaning: "Describe the camera-view version first.",
    example: "“The meeting ended without a decision.”",
    enough: "One observable sentence.",
  },
  meaning: {
    meaning:
      "Name the conclusion your mind reached. It may be understandable and still incomplete. Feelings are real even where a prediction is incomplete.",
    example: "“They do not trust me.”",
    enough: "“I am afraid it means I failed.”",
  },
  facts: {
    meaning: "Separate what you can verify from the rest of the picture.",
    example: "“I know they asked for more information. I am filling in that I am unwanted.”",
    enough: "One fact and one uncertainty.",
  },
  protector: {
    meaning:
      "Use this only if the language fits. A “protective part” simply means a habit of mind trying to keep you safe. Ask what your mind might be trying to spare you from.",
    example: "“It wants to protect me from being caught off guard.”",
    enough: "Skip it.",
  },
  recalibrate: {
    meaning: "Choose a next move that could bring more information or care.",
    example: "“Ask which information would help them decide.”",
    enough: "“Wait until tomorrow before I decide what this means.”",
  },
};

/** Practice — Recognise / Resolve / Reinforce. */
export const PRACTICE_LEAD_IN =
  "Here, identity means the direction a small choice is taking you—not who you must become forever. A Pattern may be uncertain, revised, re-chosen, or retired.";

export const PRACTICE_HELP: Record<string, PromptHelp> = {
  recognise: {
    meaning: "Notice what your current choice is strengthening.",
    example: "“My quick yeses are strengthening over-availability.”",
    enough: "“I want to understand what I keep saying yes to.”",
  },
  resolve: {
    meaning: "Name anything you want to keep, change, release, or re-choose.",
    example: "“Keep generosity; change immediate replies.”",
    enough: "“I am not sure yet.”",
  },
  reinforce: {
    meaning: "Make the action realistically small.",
    example: "“When I feel urgency, I will wait ten minutes before answering.”",
    enough: "A cue plus one doable action.",
  },
  tenderness: {
    meaning: "Decide what care looks like if the experiment does not go neatly.",
    example: "“I will not turn one quick reply into proof that I cannot change.”",
    enough: "“Start again tomorrow.”",
  },
};

/** Field Notes — Try / Notice / Return. */
export const FIELD_NOTE_TAB_NOTE =
  "These are moments in time, not homework. Try may be tiny. Notice may be one word. Return may be later—or may simply say, “Not enough information yet.”";

export const FIELD_NOTE_HELP: Record<string, PromptHelp> = {
  try: {
    meaning: "Name something small you are willing to test.",
    example:
      "“When I notice the urge to explain myself, I will pause and ask one question first.”",
    enough: "“I am curious what happens if I wait.”",
  },
  notice: {
    meaning: "Record what is happening while life unfolds, in any amount of detail.",
    example: "“My body felt hot. I still wanted reassurance. I asked the question anyway.”",
    enough: "“Still unsure.”",
  },
  return: {
    meaning:
      "Say what life showed you. A Return may hold “not enough information yet”, stopping, forgetting, or a changed course.",
    example: "“The conversation was kinder than I predicted. I want to try this again.”",
    enough: "“I did not try this after all. That tells me I need something smaller.”",
  },
};

/** LP-O.2 approved Experiment Guide script library. */
export const GUIDE_OPTION_NOTE =
  "This is an option to adapt, not a prescription. Choose another guide, make it smaller, or do nothing today.";

export interface GuideScript {
  forWhen: string;
  tryThis?: string;
  wordsToBorrow?: string[];
  notice: string;
  boundary?: string;
}

export const GUIDE_SCRIPTS: Record<string, GuideScript> = {
  make_it_smaller: {
    forWhen: "when the desired action feels too big for current capacity.",
    tryThis: "“What is the smallest version that still tells me something?”",
    wordsToBorrow: [
      "I cannot do the whole thing today. I can open the document, write one line, or choose when I will return.",
    ],
    notice: "Did smaller create information, relief, resistance, or a clearer limit?",
  },
  meet_one_basic_need: {
    forWhen: "when body needs may be making a decision or story louder.",
    tryThis:
      "water, food, medication as prescribed, rest, warmth, movement, a shower, or stepping outside—only what is available and appropriate.",
    wordsToBorrow: ["Before I decide what this means, I am going to meet one basic need."],
    notice: "What changed, stayed the same, or became easier to name?",
  },
  ask_for_space: {
    forWhen: "when a response is being demanded faster than clarity is available.",
    wordsToBorrow: ["I want to answer thoughtfully. Can I come back to you by tomorrow?"],
    notice: "What happened when you made room? What did the extra space reveal?",
  },
  gather_one_fact: {
    forWhen: "when a prediction is carrying more certainty than the available information.",
    wordsToBorrow: ["I am filling in some blanks. Could you tell me ___?"],
    notice: "What did you learn? Did the fact support, complicate, or contradict the story?",
  },
  borrow_steadiness: {
    forWhen: "when another person’s calm presence would help, and consent is available.",
    wordsToBorrow: [
      "I do not need you to solve this. Could you listen for ten minutes while I work out what I know?",
    ],
    notice: "What did being accompanied make possible? What remains yours to decide?",
  },
  smaller_boundary: {
    forWhen:
      "when an all-or-nothing boundary feels impossible but current contact is too costly.",
    wordsToBorrow: [
      "I cannot take this on today.",
      "I can do this part, not that part.",
      "I need to pause this conversation and return later.",
    ],
    notice: "What did the boundary protect, reveal, or cost? Did it need adjusting?",
  },
  hold_second_possibility: {
    forWhen: "when one explanation feels final before enough information is present.",
    tryThis: "write the first story, then add one other plausible reading.",
    wordsToBorrow: ["This may mean ____. It may also mean ____."],
    notice:
      "What happened to your body, choice, or next action when certainty loosened by one degree?",
  },
  own: {
    forWhen: "when none of the Guides fits.",
    tryThis:
      "“When [cue] happens, I will [small action], so I can learn [what I am curious about].”",
    notice: "Anything that is different, the same, or surprising.",
    boundary:
      "The action must be voluntary, safe enough for present capacity, and easy to stop or change.",
  },
};
