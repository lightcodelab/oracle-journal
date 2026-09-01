/** Helpers for values that may hold either plain text or rich-text HTML. */

export const looksLikeHtml = (value?: string | null): boolean =>
  !!value && /<[a-z][\s\S]*>/i.test(value);

/** Flatten HTML to a single-line plain string, for card summaries and lists. */
export const htmlToPlainText = (value?: string | null): string | null => {
  if (!value) return null;
  if (!looksLikeHtml(value)) return value;
  const text = value
    .replace(/<\s*(br|\/p|\/li|\/h[1-6]|\/div)\s*\/?>/gi, ' ')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  return text || null;
};
