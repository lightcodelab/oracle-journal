export interface OracleCard {
  id: number;
  name: string;
  meaning: string;
  description: string;
  journalPrompts: string[];
  imageColor: string;
  embodimentContent?: string;
  meditationAudioUrl?: string;
}

export const oracleCards: OracleCard[] = [
  {
    id: 1,
    name: "The Awakening",
    meaning: "New beginnings and spiritual awareness",
    description: "You are entering a phase of heightened consciousness. The universe is calling you to pay attention to the signs and synchronicities around you. This is a time of spiritual awakening and renewed clarity.",
    journalPrompts: [
      "What recent moments or experiences have felt particularly meaningful or synchronistic?",
      "How has your perspective on life shifted recently?",
      "What new awareness or understanding is emerging within you?"
    ],
    imageColor: "from-purple-600 to-pink-500"
  },
  {
    id: 2,
    name: "Inner Strength",
    meaning: "Courage, resilience, and personal power",
    description: "You possess more strength than you realize. This card reminds you that true power comes from within. Trust in your ability to overcome challenges and stand firm in your truth.",
    journalPrompts: [
      "When have you surprised yourself with your own resilience?",
      "What does inner strength mean to you personally?",
      "How can you honor and cultivate your personal power today?"
    ],
    imageColor: "from-red-600 to-orange-500"
  },
  {
    id: 3,
    name: "Divine Flow",
    meaning: "Surrender, trust, and allowing",
    description: "Release your grip and let the universe guide you. Sometimes the greatest power lies in surrendering control and trusting the natural flow of life. What you seek is already making its way to you.",
    journalPrompts: [
      "What am I trying to control that might benefit from being released?",
      "How does it feel in my body when I try to force versus when I allow?",
      "What would it look like to trust more deeply right now?"
    ],
    imageColor: "from-blue-600 to-cyan-500"
  },
  {
    id: 4,
    name: "Sacred Balance",
    meaning: "Harmony, equilibrium, and wholeness",
    description: "Life is asking you to find balance between opposing forces. Honor both your light and shadow, your activity and rest, your giving and receiving. True harmony comes from embracing all aspects of yourself.",
    journalPrompts: [
      "Where in my life do I feel out of balance?",
      "What opposing qualities or needs am I being called to integrate?",
      "How can I create more harmony in my daily rhythms?"
    ],
    imageColor: "from-green-600 to-emerald-500"
  },
  {
    id: 5,
    name: "The Mirror",
    meaning: "Self-reflection and truth",
    description: "Look within. The answers you seek lie in honest self-reflection. This card invites you to examine your patterns, beliefs, and behaviors with compassion and clarity.",
    journalPrompts: [
      "What truth am I avoiding or not wanting to see?",
      "How do my external experiences reflect my internal state?",
      "What pattern or belief is ready to be acknowledged and released?"
    ],
    imageColor: "from-indigo-600 to-purple-500"
  },
  {
    id: 6,
    name: "Heart Opening",
    meaning: "Love, compassion, and connection",
    description: "Your heart is expanding. Allow yourself to feel deeply and connect authentically. This is a time to open to love in all its forms - for yourself, others, and life itself.",
    journalPrompts: [
      "What would it feel like to let my guard down and be more vulnerable?",
      "How can I show more compassion to myself today?",
      "What or who am I being called to connect with more deeply?"
    ],
    imageColor: "from-rose-600 to-pink-500"
  },
  {
    id: 7,
    name: "The Transformer",
    meaning: "Change, alchemy, and rebirth",
    description: "You are in a powerful process of transformation. Like the phoenix, you are releasing old forms to make space for something new to emerge. Trust the process of death and rebirth.",
    journalPrompts: [
      "What am I ready to release or let die in my life?",
      "What new version of myself is trying to be born?",
      "How can I support myself through this transformation?"
    ],
    imageColor: "from-amber-600 to-orange-500"
  },
  {
    id: 8,
    name: "Intuitive Wisdom",
    meaning: "Inner knowing and psychic awareness",
    description: "Your intuition is speaking loudly. Trust the subtle whispers and gut feelings you experience. Your inner wisdom knows the way forward, even when logic cannot see it.",
    journalPrompts: [
      "What is my intuition trying to tell me that my mind is dismissing?",
      "When do I feel most connected to my inner knowing?",
      "What would I do if I fully trusted my intuitive guidance?"
    ],
    imageColor: "from-violet-600 to-purple-500"
  },
  {
    id: 9,
    name: "Grounded Presence",
    meaning: "Being present, rooted, and centered",
    description: "Return to the present moment. Ground yourself in the here and now. Your power is not in the past or future, but in being fully present to what is.",
    journalPrompts: [
      "What am I avoiding by not being fully present?",
      "How does my body feel when I bring my awareness to this moment?",
      "What grounds and centers me?"
    ],
    imageColor: "from-stone-600 to-amber-700"
  },
  {
    id: 10,
    name: "Abundant Blessings",
    meaning: "Gratitude, prosperity, and receiving",
    description: "Count your blessings. Abundance surrounds you when you open your eyes to see it. This card reminds you to receive with grace and recognize the wealth already present in your life.",
    journalPrompts: [
      "What am I grateful for that I may have been taking for granted?",
      "How comfortable am I with receiving? Where did I learn this?",
      "What abundance is already present in my life?"
    ],
    imageColor: "from-yellow-600 to-amber-500"
  },
  {
    id: 11,
    name: "Creative Fire",
    meaning: "Passion, inspiration, and manifestation",
    description: "Your creative spark is ignited. This is a time of inspired action and bringing your visions into form. Follow what lights you up and trust your creative impulses.",
    journalPrompts: [
      "What creative project or idea is calling to me?",
      "When do I feel most alive and inspired?",
      "What would I create if I knew I couldn't fail?"
    ],
    imageColor: "from-orange-600 to-red-500"
  },
  {
    id: 12,
    name: "Soul Family",
    meaning: "Connection, belonging, and community",
    description: "You are being called to connect with your soul tribe. The relationships and communities that resonate with your authentic self are drawing near. Open yourself to meaningful connection.",
    journalPrompts: [
      "Who truly sees and accepts me as I am?",
      "What kind of community do I want to be part of?",
      "How can I show up more authentically in my relationships?"
    ],
    imageColor: "from-teal-600 to-cyan-500"
  }
];
