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

/** Shown beneath every three-part movement, in every lens. */
export const GLOBAL_MOVEMENT_HELPER =
  "Choose any question with energy today. You can move between these sections, skip any prompt, and save one true line. Nothing here needs to be completed in order.";

export const ORIENTATION_PROMISE = [
  "You do not need certainty before you live differently.",
  "You need enough curiosity to try one small thing, and enough tenderness to learn from what happens.",
];

export const ORIENTATION_INVITATION = [
  "Write one true thing.",
  "Try one small thing, if you want to.",
  "Return when life has given you more information.",
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
    title: "A living record, not a verdict",
    copy: [
      "You do not need certainty before you live differently. You need enough curiosity to try one small thing, and enough tenderness to learn from what happens.",
      "The Living Pattern is a private Conservatory laboratory. It is not a test, a treatment plan, a diary that has to be impressive, or a machine for proving that you are getting better. You are not the problem under inspection. You are learning about the conditions of your actual life: what is here, what your mind is making it mean, what choice is available, and what happens when you try something small.",
      "You may come here when something is hard, beautiful, confusing, ordinary, or quietly different. You are not here to explain yourself perfectly. You are here to notice what is true enough to give yourself a little more choice.",
    ],
    teach: [
      "Nothing is shared.",
      "No score, streak, diagnosis, or correct answer exists.",
      "A record may be one sentence, a few chosen words, or no experiment at all.",
      "Ease, delight, steadiness, and connection are as worthy of attention as friction.",
    ],
    close: "Let us begin with the smallest question: what is here?",
  },
  {
    key: "lenses",
    eyebrow: "Lesson 1",
    title: "Choose the lens that meets the moment",
    copy: [
      "These are three windows into the same life. They are not steps, and you never need to use all three.",
    ],
    table: {
      head: ["If you are noticing…", "Begin here", "What it helps with"],
      rows: [
        [
          "How you are feeling, coping, or carrying the moment",
          "Pause",
          "Meet your present state and find one grounded next direction.",
        ],
        [
          "Something that stood out and the meaning your mind began to make",
          "Presence",
          "Separate what happened from what you are predicting, then gather more information.",
        ],
        [
          "A choice you keep making or want to make more consciously",
          "Practice",
          "Name a current commitment and try one small expression of it.",
        ],
      ],
    },
    script:
      "You do not need to diagnose yourself to choose a door. Ask only: “What is most alive for me right now?”",
    enoughForToday: "Open the lens that feels closest. Write one sentence. Save it.",
  },
  {
    key: "pause",
    eyebrow: "Lesson 2",
    title: "Pause — meet the state, do not defeat it",
    copy: [
      "A state is information, not an identity. You do not have to make it disappear before you choose what comes next.",
    ],
    movements: [
      {
        name: "Register",
        body: "What is here in me? Name a feeling, body signal, capacity, or one word.",
      },
      {
        name: "Receive",
        body: "Can I let this be here for one moment without arguing with it or obeying it?",
      },
      { name: "Reorient", body: "What is one small, grounded direction from here?" },
    ],
    script:
      "This is here. It makes sense that it is here. I do not have to solve it in this minute.",
    examples: [
      {
        title: "A difficult moment",
        lines: [
          { label: "Register", body: "Activated. Tight chest. Some capacity, carefully." },
          {
            label: "Receive",
            body: "I am anxious after that conversation. I do not need to decide what it means while my body is loud.",
          },
          {
            label: "Reorient",
            body: "Put my phone down, drink water, and give myself twenty minutes before replying.",
          },
        ],
      },
      {
        title: "A good moment",
        lines: [
          { label: "Register", body: "Quietly well. Rested. More capacity than usual." },
          { label: "Receive", body: "I want to let this count instead of rushing past it." },
          { label: "Reorient", body: "Take a slow walk before opening my laptop." },
        ],
      },
    ],
  },
  {
    key: "presence",
    eyebrow: "Lesson 3",
    title: "Presence — make room between a moment and its story",
    copy: [
      "Feelings are real. A prediction attached to a feeling may or may not be complete. Presence helps you hold both with kindness.",
    ],
    teach: [
      "You do not have to prove your story wrong.",
      "“Story” does not mean lie. It means the meaning your mind is adding to incomplete information.",
      "You do not need to excavate your past. The “where have I known this before?” prompt is optional.",
      "“Protective part” is optional language. If it fits, ask: “What might my mind be trying to save me from?”",
    ],
    examples: [
      {
        title: "A quiet misunderstanding",
        lines: [
          { label: "What happened?", body: "A friend saw my message and has not replied." },
          { label: "What am I making it mean?", body: "She is upset with me." },
          { label: "What do I know?", body: "She has not replied yet." },
          { label: "What am I filling in?", body: "That silence means rejection." },
          {
            label: "What else could be true?",
            body: "She may be busy, tired, or deciding what to say.",
          },
          {
            label: "Small experiment",
            body: "If I still want clarity tomorrow, I will ask directly rather than rereading the silence.",
          },
        ],
      },
    ],
    enoughForToday: "“This happened. I am afraid it means ____. I do not know yet.”",
  },
  {
    key: "practice",
    eyebrow: "Lesson 4",
    title: "Practice and Field Notes — choose a direction; return as a learner",
    copy: [
      "A Pattern of Choosing is not a promise to become someone else. It is a private place to notice the direction your choices are taking you, and to decide whether you want to keep travelling that way.",
      "An experiment is not a promise to follow through perfectly. It is a small way of learning from life rather than asking fear, hope, or certainty to predict everything for you.",
    ],
    teach: [
      "“Identity” means the value or commitment a choice makes real now; it is not a permanent label.",
      "A Pattern may be current-season-specific, uncertain, revised, re-chosen, or retired.",
      "Re-choosing is not proof that you failed the first time. It is the practice itself.",
      GUIDE_OPTION_NOTE,
    ],
    guideNote:
      "When a Guide appears, it is a starter script—not a recommendation about what you need. Choose the one that feels closest, adapt the words, make it smaller, choose another, or do nothing today.",
    examples: [
      {
        title: "A current commitment",
        lines: [
          {
            label: "What commitment are my choices making real right now?",
            body: "I am making immediate availability real, even when it costs me.",
          },
          {
            label: "What do I want to re-choose?",
            body: "Reciprocal availability: I can care without answering at once.",
          },
          { label: "When…", body: "a request arrives and I feel tense," },
          {
            label: "I will…",
            body: "say, “Let me check what I can hold and come back to you.”",
          },
        ],
      },
    ],
    table: {
      head: ["Phase", "The question", "A valid answer"],
      rows: [
        ["Try", "What am I willing to test?", "“I will wait thirty minutes before I reply.”"],
        [
          "Notice",
          "What is happening while life unfolds?",
          "“The urge to answer immediately rose, then softened.”",
        ],
        [
          "Return",
          "What did life show me?",
          "“Nothing bad happened. I still want a direct conversation next time.”",
        ],
      ],
    },
    enoughForToday:
      "“I am not sure yet, but I want to notice what I say yes to when I am afraid of disappointing someone.”",
    close: "You are not collecting proof that you are good at life. You are collecting a more truthful relationship with it.",
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
