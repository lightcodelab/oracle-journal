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
}

export const useContentByLocation = (locationSlug: string): UseContentByLocationResult => {
  const [resources, setResources] = useState<ContentResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      setError(null);

      try {
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

        // Fetch published resources for this location
        const { data: resourceData, error: resourceError } = await supabase
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
            resource_type:content_categories!resource_type_id (
              id,
              name,
              slug
            )
          `)
          .eq('location_id', locationData.id)
          .eq('status', 'published')
          .order('created_at', { ascending: false });

        if (resourceError) {
          setError('Failed to load content');
          setLoading(false);
          return;
        }

        setResources(resourceData as ContentResource[]);
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

  return { resources, loading, error, locationName };
};
