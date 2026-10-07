import { BookHeart, ListMusic, LineChart, Sparkles, HeartPulse, Sprout, Flame, Feather, Calendar } from "lucide-react";

/** One icon per member tool, reused wherever that tool is named across the site. */
export const TOOL_ICONS = {
  journal: BookHeart,
  playlists: ListMusic,
  livingPattern: Sprout,
  tracking: LineChart,
  readings: Sparkles,
  protocols: HeartPulse,
  rituals: Flame,
  remembranceLetters: Feather,
  calendar: Calendar,
} as const;
