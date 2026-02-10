import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RitesCourse {
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
  source: 'content';
  resource_type: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface UseRitesCoursesResult {
  courses: RitesCourse[];
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
}

const getPublicUrl = (bucket: string, path: string | null): string | null => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

export const useRitesCourses = (): UseRitesCoursesResult => {
  const [courses, setCourses] = useState<RitesCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchCourses = async () => {
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
            .single();
          
          userIsAdmin = !!roleData;
          setIsAdmin(userIsAdmin);
        }

        const { data: locationData, error: locationError } = await supabase
          .from('content_categories')
          .select('id, name')
          .eq('slug', 'loc-rites-of-remembrance')
          .eq('type', 'location')
          .eq('active', true)
          .single();

        if (locationError || !locationData) {
          setCourses([]);
          setLoading(false);
          return;
        }

        let query = supabase
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
          query = query.eq('status', 'published');
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
          setError('Failed to load rites');
          setLoading(false);
          return;
        }

        const transformed = (data || []).map(resource => ({
          ...resource,
          thumbnail_url: getPublicUrl('content-thumbnails', resource.thumbnail_url),
          main_media_file_url: getPublicUrl('content-main-media', resource.main_media_file_url),
          secondary_audio_url: null as string | null,
          source: 'content' as const,
        })) as RitesCourse[];

        setCourses(transformed);
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
