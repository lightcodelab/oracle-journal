export type TempleFocus = "devotion" | "remembrance" | "becoming" | "communion";

export const FOCUS_OPTIONS: { value: TempleFocus; label: string; door: string }[] = [
  { value: "devotion", label: "Healing templates, rites and meditations", door: "The Door of Devotion" },
  { value: "remembrance", label: "Card decks and card readings", door: "The Door of Remembrance" },
  { value: "becoming", label: "Personal development and self-awareness", door: "The Door of Becoming" },
  { value: "communion", label: "Community", door: "The Door of Communion" },
];

export const isTempleFocus = (v: unknown): v is TempleFocus =>
  typeof v === "string" && FOCUS_OPTIONS.some((o) => o.value === v);

/**
 * Focus is hidden from members for now, not removed: every focus control and
 * the focus-driven home layout stay in the code, and each member's saved
 * focus is left untouched. Flip this to true to bring the feature back.
 */
export const SHOW_TEMPLE_FOCUS = false;
