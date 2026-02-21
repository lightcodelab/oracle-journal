import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import NavActions from '@/components/NavActions';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import ResourceCard from '@/components/devotion/ResourceCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { ContentResource } from '@/hooks/useContentByLocation';

const SearchResults = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [localQuery, setLocalQuery] = useState(query);
  const [results, setResults] = useState<ContentResource[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const search = async () => {
      setLoading(true);

      const searchPattern = `%${query}%`;

      // Search content_resources
      const { data: contentData } = await supabase
        .from('content_resources')
        .select(`
          id, title, slug, summary, thumbnail_url,
          main_media_kind, main_media_file_url, main_media_embed_url,
          is_course, status,
          resource_type:content_categories!content_resources_resource_type_id_fkey(id, name, slug)
        `)
        .eq('status', 'published')
        .or(`title.ilike.${searchPattern},summary.ilike.${searchPattern}`)
        .limit(50);

      // Search healing_resources
      const { data: healingData } = await supabase
        .from('healing_resources')
        .select(`
          id, title, slug, summary, 
          display_image_url, vimeo_embed_url, audio_file_url,
          status, modality
        `)
        .eq('status', 'published')
        .or(`title.ilike.${searchPattern},summary.ilike.${searchPattern}`)
        .limit(50);

      const contentResults: ContentResource[] = (contentData || []).map((r: any) => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
        summary: r.summary,
        thumbnail_url: r.thumbnail_url,
        main_media_kind: r.main_media_kind,
        main_media_file_url: r.main_media_file_url,
        main_media_embed_url: r.main_media_embed_url,
        secondary_audio_url: null,
        is_course: r.is_course,
        status: r.status,
        source: 'content' as const,
        resource_type: r.resource_type || null,
      }));

      const healingResults: ContentResource[] = (healingData || []).map((r: any) => ({
        id: r.id,
        title: r.title,
        slug: r.slug || r.id,
        summary: r.summary,
        thumbnail_url: r.display_image_url,
        main_media_kind: r.vimeo_embed_url ? 'video_embed' : r.audio_file_url ? 'file' : 'none',
        main_media_file_url: r.audio_file_url,
        main_media_embed_url: r.vimeo_embed_url,
        secondary_audio_url: null,
        is_course: false,
        status: r.status,
        source: 'healing' as const,
        resource_type: r.modality ? { id: '', name: r.modality, slug: r.modality } : null,
      }));

      setResults([...contentResults, ...healingResults]);
      setLoading(false);
    };

    search();
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localQuery.trim()) {
      setSearchParams({ q: localQuery.trim() });
    }
  };

  // Determine base path for a result based on its source/location
  const getBasePath = (resource: ContentResource) => {
    // Content resources could be in devotion or remembrance
    // Default to devotion for healing, and devotion for content
    return resource.source === 'healing' ? '/devotion' : '/devotion';
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <PageBreadcrumb items={[{ label: 'Search' }]} />
          <NavActions />
        </div>
      </header>

      <main className="container max-w-6xl px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-4">Search Resources</h1>
          <form onSubmit={handleSubmit} className="flex gap-2 max-w-xl">
            <Input
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              placeholder="Search teachings, practices, courses…"
              className="text-base"
            />
            <Button type="submit">
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </form>
        </motion.div>

        {loading && (
          <div className="text-center py-12 text-muted-foreground">Searching…</div>
        )}

        {!loading && query && results.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-10 h-10 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground">No resources found for "{query}"</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((resource, index) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  index={index}
                  basePath={getBasePath(resource)}
                />
              ))}
            </div>
          </>
        )}

        {!loading && !query && (
          <div className="text-center py-12">
            <Search className="w-10 h-10 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground">Enter a search term to find resources across the Temple</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default SearchResults;
