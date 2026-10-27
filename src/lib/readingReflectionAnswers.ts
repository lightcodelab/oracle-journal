export function reflectionAnswersChanged(draft: Record<string, string>, saved?: Record<string, string> | null): boolean {
  return Object.keys(draft).some(key => (draft[key] || "") !== (saved?.[key] || ""));
}