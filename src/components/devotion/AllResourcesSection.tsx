import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ResourceCard from '@/components/devotion/ResourceCard';
import type { ContentResource } from '@/hooks/useContentByLocation';
import { LayoutGrid } from 'lucide-react';
import { motion } from 'framer-motion';

interface LocationCategory {
  id: string;
  name: string;
  slug: string;
}

const getPublicUrl = (bucket: string, path: string | null): string | null => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

const AllResourcesSection = () => {
  const [locations, setLocations] = useState<LocationCategory[]>([]);
  const [resources, setResources] = useState<ContentResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);

      // Check admin
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

      // Fetch all devotion locations
      const { data: locData } = await supabase
        .from('content_categories')
        .select('id, name, slug')
        .eq('type', 'location')
        .eq('active', true)
        .eq('page', 'devotion')
        .order('display_order');

      const locs = locData || [];
      setLocations(locs);
      const locationIds = locs.map(l => l.id);

      // Find the Energy Hygiene Practices location for mapping courses
      const energyHygieneLoc = locs.find(l => l.slug === 'loc-energy-hygiene-practices');

      if (locationIds.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch content_resources
      let contentQuery = supabase
        .from('content_resources')
        .select(`
          id, title, slug, summary, thumbnail_url,
          main_media_kind, main_media_file_url, main_media_embed_url,
          is_course, status, created_at, location_id,
          resource_type:content_categories!resource_type_id (id, name, slug)
        `)
        .in('location_id', locationIds)
        .order('created_at', { ascending: false });

      if (!userIsAdmin) {
        contentQuery = contentQuery.eq('status', 'published');
      }

      // Fetch healing_resources
      let healingQuery = supabase
        .from('healing_resources')
        .select('id, title, summary, display_image_url, teaching_description, status, created_at, modality, location_id, vimeo_embed_url, audio_file_url, slug')
        .in('location_id', locationIds)
        .order('created_at', { ascending: false });

      if (!userIsAdmin) {
        healingQuery = healingQuery.eq('status', 'published');
      }

      // Fetch legacy courses (from courses table, e.g. Energy Hygiene Kit)
      // Filter by location_id (already a Devotion-page location) so courses mapped
      // to Remembrance locations (e.g. Rites) don't leak into Devotion.
      const coursesQuery = supabase
        .from('courses')
        .select('id, title, description, image_url, door_type, is_published, location_id')
        .eq('is_published', true)
        .in('location_id', locationIds);

      const [contentResult, healingResult, coursesResult] = await Promise.all([contentQuery, healingQuery, coursesQuery]);

      const transformedContent: (ContentResource & { location_id: string | null })[] = (contentResult.data || []).map(r => ({
        ...r,
        thumbnail_url: getPublicUrl('content-thumbnails', r.thumbnail_url),
        main_media_file_url: getPublicUrl('content-main-media', r.main_media_file_url),
        secondary_audio_url: null,
        source: 'content' as const,
        location_id: r.location_id,
      }));

      const transformedHealing: (ContentResource & { location_id: string | null })[] = (healingResult.data || []).map(r => {
        let mediaKind: 'file' | 'video_embed' | 'none' | null = null;
        let mediaFileUrl: string | null = null;
        let mediaEmbedUrl: string | null = null;
        let secondaryAudioUrl: string | null = null;
        const audioUrl = r.audio_file_url ? getPublicUrl('healing-resource-images', r.audio_file_url) : null;

        if (r.vimeo_embed_url) {
          mediaKind = 'video_embed';
          mediaEmbedUrl = r.vimeo_embed_url;
          secondaryAudioUrl = audioUrl;
        } else if (audioUrl) {
          mediaKind = 'file';
          mediaFileUrl = audioUrl;
        }

        return {
          id: r.id,
          title: r.title,
          slug: r.slug ? `healing-${r.slug}` : `healing-${r.id}`,
          summary: (r as any).summary || r.teaching_description || null,
          thumbnail_url: getPublicUrl('healing-resource-images', r.display_image_url),
          main_media_kind: mediaKind,
          main_media_file_url: mediaFileUrl,
          main_media_embed_url: mediaEmbedUrl,
          secondary_audio_url: secondaryAudioUrl,
          is_course: false,
          status: r.status as 'draft' | 'published',
          source: 'healing' as const,
          resource_type: {
            id: r.modality,
            name: r.modality.charAt(0).toUpperCase() + r.modality.slice(1),
            slug: r.modality,
          },
          location_id: r.location_id,
        };
      });

      // Transform legacy courses into ContentResource shape
      const transformedCourses: (ContentResource & { location_id: string | null })[] = (coursesResult.data || []).map(c => ({
        id: c.id,
        title: c.title,
        slug: `legacy-course-${c.id}`,
        summary: c.description || null,
        thumbnail_url: c.image_url || null,
        main_media_kind: null,
        main_media_file_url: null,
        main_media_embed_url: null,
        secondary_audio_url: null,
        is_course: true,
        status: 'published' as const,
        source: 'content' as const,
        resource_type: {
          id: 'course',
          name: 'Course',
          slug: 'course',
        },
        location_id: c.location_id || energyHygieneLoc?.id || null,
      }));

      setResources([...transformedContent, ...transformedHealing, ...transformedCourses]);
      setLoading(false);
    };

    fetchAll();
  }, []);

  const filtered = useMemo(() => {
    const items = activeTab === 'all' ? resources : resources.filter(r => (r as any).location_id === activeTab);
    if (activeTab === 'all') {
      return [...items].sort((a, b) => a.title.localeCompare(b.title));
    }
    return items;
  }, [activeTab, resources]);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-card border border-border rounded-lg p-8"
      >
        <div className="animate-pulse text-muted-foreground text-center">Loading resources...</div>
      </motion.div>
    );
  }

  if (resources.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="col-span-full"
    >
      <div className="bg-card border border-border rounded-lg p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <LayoutGrid className="w-8 h-8 text-primary" />
          <h2 className="font-serif text-2xl text-foreground">All Resources</h2>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1 mb-6">
            <TabsTrigger value="all" className="text-sm">
              All
            </TabsTrigger>
            {locations.map(loc => (
              <TabsTrigger key={loc.id} value={loc.id} className="text-sm">
                {loc.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Single content area that reacts to tab changes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((resource, index) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                index={index}
                showDraftBadge={isAdmin}
                basePath="/devotion"
                squareThumb
              />
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="text-muted-foreground text-center py-8">
              No resources found in this category.
            </p>
          )}
        </Tabs>
      </div>
    </motion.div>
  );
};

export default AllResourcesSection;
