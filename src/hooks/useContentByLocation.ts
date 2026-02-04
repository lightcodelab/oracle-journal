import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ContentResource {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  thumbnail_url: string | null;
  main_media_kind: 'file' | 'video_embed' | 'none' | null;
  main_media_file_url: string | null;
  main_media_embed_url: string | null;
  is_course: boolean | null;
  status: 'draft' | 'published';
  source: 'content' | 'healing';
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

        // Fetch content_resources
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

        // Non-admins only see published content
        if (!userIsAdmin) {
          contentQuery = contentQuery.eq('status', 'published');
        }

        // Fetch healing_resources with this location
        let healingQuery = supabase
          .from('healing_resources')
          .select('id, title, summary, display_image_url, teaching_description, status, created_at, modality, location_id, vimeo_embed_url, audio_file_url')
          .eq('location_id', locationData.id)
          .order('created_at', { ascending: false });

        if (!userIsAdmin) {
          healingQuery = healingQuery.eq('status', 'published');
        }

        const [contentResult, healingResult] = await Promise.all([
          contentQuery,
          healingQuery,
        ]);

        if (contentResult.error) {
          setError('Failed to load content');
          setLoading(false);
          return;
        }

        // Transform content resources
        const transformedContent = (contentResult.data || []).map(resource => ({
          ...resource,
          thumbnail_url: getPublicUrl('content-thumbnails', resource.thumbnail_url),
          main_media_file_url: getPublicUrl('content-main-media', resource.main_media_file_url),
          source: 'content' as const,
        })) as ContentResource[];

        // Transform healing resources to match ContentResource shape
        const transformedHealing = (healingResult.data || []).map(resource => {
          // Determine media kind based on available fields
          let mediaKind: 'file' | 'video_embed' | 'none' | null = null;
          let mediaFileUrl: string | null = null;
          let mediaEmbedUrl: string | null = null;

          if (resource.vimeo_embed_url) {
            mediaKind = 'video_embed';
            mediaEmbedUrl = resource.vimeo_embed_url;
          } else if (resource.audio_file_url) {
            mediaKind = 'file';
            mediaFileUrl = getPublicUrl('healing-resource-audio', resource.audio_file_url);
          }

          return {
            id: resource.id,
            title: resource.title,
            slug: `healing-${resource.id}`, // Use id-based slug for healing resources
            summary: (resource as any).summary || resource.teaching_description || null,
            thumbnail_url: getPublicUrl('healing-resource-images', resource.display_image_url),
            main_media_kind: mediaKind,
            main_media_file_url: mediaFileUrl,
            main_media_embed_url: mediaEmbedUrl,
            is_course: false,
            status: resource.status as 'draft' | 'published',
            source: 'healing' as const,
            resource_type: {
              id: resource.modality,
              name: resource.modality.charAt(0).toUpperCase() + resource.modality.slice(1),
              slug: resource.modality,
            },
          };
        }) as ContentResource[];

        // Merge and sort by created_at (most recent first)
        const allResources = [...transformedContent, ...transformedHealing];
        
        setResources(allResources);
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
