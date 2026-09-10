import { supabase } from '@/integrations/supabase/client';

export type LinkableKind = 'content' | 'healing' | 'course';

export interface LinkableResource {
  kind: LinkableKind;
  id: string;
  title: string;
  typeLabel: string;
  path: string;
}

const basePathForPage = (page: string | null | undefined) => {
  if (page === 'remembrance') return '/remembrance';
  if (page === 'communion') return '/communion';
  return '/devotion';
};

/** All resources that can be linked from a card: content resources, healing resources and courses. */
export const fetchLinkableResources = async (): Promise<LinkableResource[]> => {
  const [contentRes, healingRes, coursesRes] = await Promise.all([
    supabase
      .from('content_resources')
      .select('id, title, slug, is_course, status, location:content_categories!content_resources_location_id_fkey(page)')
      .eq('status', 'published'),
    supabase
      .from('healing_resources')
      .select('id, title, slug, status, location:content_categories!healing_resources_location_id_fkey(page)')
      .eq('status', 'published'),
    supabase
      .from('courses')
      .select('id, title, door_type, is_published, location:content_categories!courses_location_id_fkey(page)')
      .eq('is_published', true),
  ]);

  const content: LinkableResource[] = (contentRes.data || [])
    .filter((r: any) => !!r.slug)
    .map((r: any) => ({
      kind: 'content' as const,
      id: r.id,
      title: r.title,
      typeLabel: r.is_course ? 'Course' : 'Resource',
      path: `${basePathForPage(r.location?.page)}/${r.is_course ? 'courses' : 'resources'}/${r.slug}`,
    }));

  const healing: LinkableResource[] = (healingRes.data || []).map((r: any) => ({
    kind: 'healing' as const,
    id: r.id,
    title: r.title,
    typeLabel: 'Practice',
    path: `${basePathForPage(r.location?.page)}/resources/healing-${r.slug || r.id}`,
  }));

  const courses: LinkableResource[] = (coursesRes.data || []).map((r: any) => ({
    kind: 'course' as const,
    id: r.id,
    title: r.title,
    typeLabel: 'Course',
    path: `${basePathForPage(r.location?.page || r.door_type)}/course/${r.id}`,
  }));

  return [...content, ...healing, ...courses].sort((a, b) => a.title.localeCompare(b.title));
};

export interface CardResourceLinkRow {
  resource_kind: LinkableKind;
  resource_id: string;
  display_order: number;
}

export const fetchCardResourceLinks = async (cardId: string): Promise<CardResourceLinkRow[]> => {
  const { data } = await supabase
    .from('card_resource_links')
    .select('resource_kind, resource_id, display_order')
    .eq('card_id', cardId)
    .order('display_order');
  return (data || []) as CardResourceLinkRow[];
};

export const saveCardResourceLinks = async (
  cardId: string,
  links: { kind: LinkableKind; id: string }[],
) => {
  await supabase.from('card_resource_links').delete().eq('card_id', cardId);
  if (!links.length) return;
  await supabase.from('card_resource_links').insert(
    links.map((l, i) => ({
      card_id: cardId,
      resource_kind: l.kind,
      resource_id: l.id,
      display_order: i,
    })),
  );
};

export const linkKey = (kind: LinkableKind, id: string) => `${kind}:${id}`;
