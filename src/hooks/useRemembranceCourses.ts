import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RemembranceCourse {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  thumbnail_url: string | null;
  main_media_kind: 'file' | 'video_embed' | 'none' | null;
  main_media_file_url: string | null;
  main_media_embed_url: string | null;
  secondary_audio_url: string | null;
  is_course: boolean | null;
  status: 'draft' | 'published';
  source: 'content' | 'legacy';
  resource_type: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface UseRemembranceCoursesResult {
  courses: RemembranceCourse[];
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
}

// Helper to get public URL for storage files
const getPublicUrl = (bucket: string, path: string | null): string | null => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

export const useRemembranceCourses = (): UseRemembranceCoursesResult => {
  const [courses, setCourses] = useState<RemembranceCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      setError(null);

      try {
        // Check if user is admin
        const { data: { session } } = await supabase.auth.getSession();
        let userIsAdmin = false;
        
        if (session?.user) {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .eq('role', 'admin')
            .single();
          
          userIsAdmin = !!roleData;
          setIsAdmin(userIsAdmin);
        }

        // Get the Door of Remembrance Courses location
        const { data: locationData, error: locationError } = await supabase
          .from('content_categories')
          .select('id, name')
          .eq('slug', 'loc-remembrance-courses')
          .eq('type', 'location')
          .eq('active', true)
          .single();

        if (locationError || !locationData) {
          // No remembrance location yet - return empty
          setCourses([]);
          setLoading(false);
          return;
        }

        // Fetch content_resources for this location
        let contentQuery = supabase
          .from('content_resources')
          .select(`
            id,
            title,
            slug,
            summary,
            thumbnail_url,
            main_media_kind,
            main_media_file_url,
            main_media_embed_url,
            is_course,
            status,
            created_at,
            resource_type:content_categories!resource_type_id (
              id,
              name,
              slug
            )
          `)
          .eq('location_id', locationData.id)
          .order('created_at', { ascending: false });

        if (!userIsAdmin) {
          contentQuery = contentQuery.eq('status', 'published');
        }

        // Also fetch legacy courses from the `courses` table at this location
        let legacyQuery = supabase
          .from('courses')
          .select('*')
          .eq('location_id', locationData.id)
          .order('display_order', { ascending: true });

        if (!userIsAdmin) {
          legacyQuery = legacyQuery.eq('is_published', true);
        }

        const [contentResult, legacyResult] = await Promise.all([
          contentQuery,
          legacyQuery,
        ]);

        if (contentResult.error) {
          setError('Failed to load courses');
          setLoading(false);
          return;
        }

        const transformedContent = (contentResult.data || []).map(resource => ({
          ...resource,
          thumbnail_url: getPublicUrl('content-thumbnails', resource.thumbnail_url),
          main_media_file_url: getPublicUrl('content-main-media', resource.main_media_file_url),
          secondary_audio_url: null as string | null,
          source: 'content' as const,
        })) as RemembranceCourse[];

        const transformedLegacy = (legacyResult.data || []).map((course: any) => ({
          id: course.id,
          title: course.title,
          slug: `legacy-course-${course.id}`,
          summary: course.description || null,
          thumbnail_url: course.image_url || null,
          main_media_kind: null,
          main_media_file_url: null,
          main_media_embed_url: null,
          secondary_audio_url: null,
          is_course: true,
          status: (course.is_published ? 'published' : 'draft') as 'draft' | 'published',
          source: 'legacy' as const,
          resource_type: {
            id: 'course',
            name: 'Course',
            slug: 'course',
          },
        })) as RemembranceCourse[];

        setCourses([...transformedContent, ...transformedLegacy]);
      } catch (err) {
        setError('An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  return { courses, loading, error, isAdmin };
};
