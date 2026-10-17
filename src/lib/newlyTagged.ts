export const NEW_TAG_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export interface TagActivity {
  name: string;
  created_at: string;
}

/** One search link per name, using catalogue creation timestamps only. */
export function collectNewTags(activity: TagActivity[], now = Date.now()) {
  const tags = new Map<string, TagActivity>();
  for (const item of activity) {
    const timestamp = Date.parse(item.created_at);
    const name = item.name.trim();
    if (!name || !Number.isFinite(timestamp) || timestamp < now - NEW_TAG_WINDOW_MS || timestamp > now) continue;
    const key = name.toLocaleLowerCase();
    const previous = tags.get(key);
    if (!previous || timestamp > Date.parse(previous.created_at)) tags.set(key, { name, created_at: item.created_at });
  }
  return [...tags.values()]
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .map((tag) => ({ ...tag, href: `/search?q=${encodeURIComponent(tag.name)}` }));
}