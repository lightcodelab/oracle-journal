/**
 * Living Pattern tools appear in the "Relevant Tracking Tools" list, but they
 * are not reflection-form tools: each one opens its own private page rather
 * than the ToolDetailDialog.
 */
export const LIVING_PATTERN_TOOL_ROUTES: Record<string, string> = {
  'living-pattern-open': '/living-pattern/record',
  'living-pattern-state': '/living-pattern/pause',
  'living-pattern-moment': '/living-pattern/presence',
  'living-pattern-pattern': '/living-pattern/practice',
  'living-pattern-experiments': '/living-pattern/experiments',
};

export function livingPatternToolRoute(slug?: string | null): string | null {
  if (!slug) return null;
  return LIVING_PATTERN_TOOL_ROUTES[slug] ?? null;
}
