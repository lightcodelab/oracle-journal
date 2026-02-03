import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ContentResource {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  thumbnail_url: string | null;
  main_media_kind: 'video' | 'audio' | 'none' | null;
  main_media_file_url: string | null;
  main_media_embed_url: string | null;
  is_course: boolean | null;
  status: 'draft' | 'published';
  resource_type: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface UseContentByLocationResult {
  resources: ContentResource[];
  loading: boolean;
  error: string | null;
  locationName: string | null;
  isAdmin: boolean;
}

// Helper to get public URL for storage files
const getPublicUrl = (bucket: string, path: string | null): string | null => {
  if (!path) return null;
  // If it's already a full URL, return as is
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  // Otherwise construct the public URL
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

export const useContentByLocation = (locationSlug: string): UseContentByLocationResult => {
  const [resources, setResources] = useState<ContentResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchContent = async () => {
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

        // First get the location ID from the slug
        const { data: locationData, error: locationError } = await supabase
          .from('content_categories')
          .select('id, name')
          .eq('slug', locationSlug)
          .eq('type', 'location')
          .eq('active', true)
          .single();

        if (locationError || !locationData) {
          setError('Location not found');
          setLoading(false);
          return;
        }

        setLocationName(locationData.name);

        // Build query - admins see all, others see only published
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
            resource_type:content_categories!resource_type_id (
              id,
              name,
              slug
            )
          `)
          .eq('location_id', locationData.id)
          .order('created_at', { ascending: false });

        // Non-admins only see published content
        if (!userIsAdmin) {
          query = query.eq('status', 'published');
        }

        const { data: resourceData, error: resourceError } = await query;

        if (resourceError) {
          setError('Failed to load content');
          setLoading(false);
          return;
        }

        // Transform thumbnail URLs to public URLs
        const transformedResources = (resourceData || []).map(resource => ({
          ...resource,
          thumbnail_url: getPublicUrl('content-thumbnails', resource.thumbnail_url),
        })) as ContentResource[];

        setResources(transformedResources);
      } catch (err) {
        setError('An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (locationSlug) {
      fetchContent();
    }
  }, [locationSlug]);

  return { resources, loading, error, locationName, isAdmin };
};
