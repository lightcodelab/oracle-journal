/**
 * Card images are either a legacy file name served from /public/cards/
 * or a full URL for images uploaded through the Card Deck Editor.
 */
export const cardImageSrc = (name?: string | null): string => {
  if (!name) return '';
  const trimmed = name.trim();
  if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith('/')) return trimmed;
  return `/cards/${trimmed}`;
};
