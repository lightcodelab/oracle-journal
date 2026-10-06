export type TempleFocus = "devotion" | "remembrance" | "becoming" | "communion";

export const FOCUS_OPTIONS: { value: TempleFocus; label: string; door: string }[] = [
  { value: "devotion", label: "Healing templates, rites and meditations", door: "The Door of Devotion" },
  { value: "remembrance", label: "Card decks and card readings", door: "The Door of Remembrance" },
  { value: "becoming", label: "Personal development and self-awareness", door: "The Door of Becoming" },
  { value: "communion", label: "Community", door: "The Door of Communion" },
];

export const isTempleFocus = (v: unknown): v is TempleFocus =>
  typeof v === "string" && FOCUS_OPTIONS.some((o) => o.value === v);
