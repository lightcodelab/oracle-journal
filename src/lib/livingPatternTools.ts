/**
 * Living Pattern tools appear in the "Relevant Tracking Tools" list, but they
 * are not reflection-form tools: each one opens its own private page rather
 * than the ToolDetailDialog.
 */
export const LIVING_PATTERN_TOOL_ROUTES: Record<string, string> = {
  'living-pattern-open': '/living-pattern/record',
  'living-pattern-state': '/living-pattern?lens=pause',
  'living-pattern-moment': '/living-pattern?lens=perceive',
  'living-pattern-pattern': '/living-pattern?lens=practice',
  'living-pattern-experiments': '/living-pattern/experiments',
};

export function livingPatternToolRoute(slug?: string | null): string | null {
  if (!slug) return null;
  return LIVING_PATTERN_TOOL_ROUTES[slug] ?? null;
}

/**
 * Lens tools that should open inside a dialog (on course pages) rather than
 * navigating away. Returns the tab to open, or null when the tool is not one.
 */
export const LIVING_PATTERN_DIALOG_LENSES: Record<string, 'pause' | 'perceive' | 'practice'> = {
  'living-pattern-open': 'pause',
  'living-pattern-state': 'pause',
  'living-pattern-moment': 'perceive',
  'living-pattern-pattern': 'practice',
};

export function livingPatternDialogLens(slug?: string | null) {
  if (!slug) return null;
  return LIVING_PATTERN_DIALOG_LENSES[slug] ?? null;
}
