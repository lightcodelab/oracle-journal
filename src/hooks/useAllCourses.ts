import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ContentResource } from '@/hooks/useContentByLocation';

export interface AllCoursesItem {
  resource: ContentResource;
  /** Category (uploader Location) name used by the sub-navigation. */
  categoryName: string;
  categorySlug: string;
  /** Route prefix so the card links to the correct Door hierarchy. */
  basePath: string;
}

const REMEMBRANCE_LOCATIONS = new Set([
  'loc-rites-of-remembrance',
  'loc-remembrance-courses',
  'loc-deepening-courses',
]);

const getPublicUrl = (bucket: string, path: string | null): string | null => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  // Already an app-relative asset URL (e.g. /__l5e/assets-v1/...), not a storage object key.
  if (path.startsWith('/')) return path;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

interface UseAllCoursesResult {
  items: AllCoursesItem[];
  categories: { name: string; slug: string; count: number }[];
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
}

/** Every course created with the Course Uploader, grouped by its category. */
export const useAllCourses = (): UseAllCoursesResult => {
  const [items, setItems] = useState<AllCoursesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let userIsAdmin = false;
        if (session?.user) {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .eq('role', 'admin')
            .maybeSingle();
          userIsAdmin = !!roleData;
          if (!cancelled) setIsAdmin(userIsAdmin);
        }

        let query = supabase
          .from('courses')
          .select('id, title, description, image_url, is_published, display_order, location_id, location:content_categories!location_id (id, name, slug)')
          .order('display_order', { ascending: true });

        if (!userIsAdmin) query = query.eq('is_published', true);

        const { data, error: queryError } = await query;
        if (queryError) throw queryError;
        if (cancelled) return;

        const mapped: AllCoursesItem[] = (data || []).map((course: any) => {
          const locationSlug: string = course.location?.slug ?? 'uncategorised';
          return {
            categoryName: course.location?.name ?? 'Other Courses',
            categorySlug: locationSlug,
            basePath: REMEMBRANCE_LOCATIONS.has(locationSlug) ? '/remembrance' : '/devotion',
            resource: {
              id: course.id,
              title: course.title,
              slug: `legacy-course-${course.id}`,
              summary: course.description ?? null,
              thumbnail_url: getPublicUrl('content-images', course.image_url),
              main_media_kind: 'none',
              main_media_file_url: null,
              main_media_embed_url: null,
              secondary_audio_url: null,
              is_course: true,
              status: course.is_published ? 'published' : 'draft',
              source: 'legacy',
              resource_type: course.location
                ? { id: course.location.id, name: course.location.name, slug: course.location.slug }
                : null,
            },
          };
        });

        setItems(mapped);
      } catch (e) {
        if (!cancelled) setError('Failed to load courses');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const categoryMap = new Map<string, { name: string; slug: string; count: number }>();
  items.forEach((item) => {
    const existing = categoryMap.get(item.categorySlug);
    if (existing) existing.count += 1;
    else categoryMap.set(item.categorySlug, { name: item.categoryName, slug: item.categorySlug, count: 1 });
  });

  return {
    items,
    categories: [...categoryMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
    loading,
    error,
    isAdmin,
  };
};