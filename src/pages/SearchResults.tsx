import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Search, Lock } from 'lucide-react';
import NavActions from '@/components/NavActions';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import ResourceCard from '@/components/devotion/ResourceCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTierAccess, getRequiredTierForBucket } from '@/hooks/useTierAccess';
import type { ContentResource } from '@/hooks/useContentByLocation';
import { htmlToPlainText } from '@/lib/richText';


type SearchResult = ContentResource & { doorBucket?: string | null };

interface TempleRow {
  kind: 'deck' | 'card' | 'course';
  id: string;
  title: string;
  subtitle: string | null;
  deck_id: string | null;
  deck_name: string | null;
  card_number: number | null;
  image_url: string | null;
  door: string | null;
  tags: string[] | null;
}

const getPublicUrl = (bucket: string, path: string | null): string | null => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

const SearchResults = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  const [localQuery, setLocalQuery] = useState(query);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [deckResults, setDeckResults] = useState<TempleRow[]>([]);
  const [cardResults, setCardResults] = useState<TempleRow[]>([]);
  const [visibleCards, setVisibleCards] = useState(24);
  const [loading, setLoading] = useState(false);
  const { hasAccess, loading: tierLoading } = useTierAccess();

  const totalCount = results.length + deckResults.length + cardResults.length;

  useEffect(() => {
    setLocalQuery(query);
    setVisibleCards(24);
  }, [query]);


  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setDeckResults([]);
      setCardResults([]);
      return;
    }


    const search = async () => {
      setLoading(true);

      const searchPattern = `%${query}%`;

      // Search content_resources by title/summary (include location for door mapping)
      const { data: contentData } = await supabase
        .from('content_resources')
        .select(`
          id, title, slug, summary, thumbnail_url,
          main_media_kind, main_media_file_url, main_media_embed_url,
          is_course, status,
          resource_type:content_categories!content_resources_resource_type_id_fkey(id, name, slug),
          location:content_categories!content_resources_location_id_fkey(id, page)
        `)
        .eq('status', 'published')
        .or(`title.ilike.${searchPattern},summary.ilike.${searchPattern}`)
        .limit(50);

      // Decks, individual cards and courses — matched on titles, body content,
      // lesson content and any assigned tags (server-side).
      const { data: templeRows } = await supabase.rpc('search_temple', { _q: query });
      const temple = (templeRows || []) as TempleRow[];

      const allCoursesData = temple
        .filter((r) => r.kind === 'course')
        .map((r) => ({
          id: r.id,
          title: r.title,
          description: r.subtitle,
          image_url: r.image_url,
          door_type: r.door,
          location: null as any,
        }));

      setDeckResults(temple.filter((r) => r.kind === 'deck'));
      setCardResults(temple.filter((r) => r.kind === 'card'));


      // Search healing_resources by title/summary (include location for door mapping)
      const { data: healingData } = await supabase
        .from('healing_resources')
        .select(`
          id, title, slug, summary, 
          display_image_url, vimeo_embed_url, audio_file_url,
          status, modality, location_id,
          location:content_categories!healing_resources_location_id_fkey(id, page)
        `)
        .eq('status', 'published')
        .or(`title.ilike.${searchPattern},summary.ilike.${searchPattern}`)
        .limit(50);

      // Find matching symptom IDs
      const { data: matchingSymptoms } = await supabase
        .from('symptoms')
        .select('id')
        .ilike('name', searchPattern);

      // Find matching condition IDs
      const { data: matchingConditions } = await supabase
        .from('conditions')
        .select('id')
        .ilike('name', searchPattern);

      // Collect resource IDs from title/summary matches
      const directHealingIds = new Set((healingData || []).map((r: any) => r.id));

      // Find resources linked to matching symptoms
      let symptomResourceIds: string[] = [];
      if (matchingSymptoms && matchingSymptoms.length > 0) {
        const symptomIds = matchingSymptoms.map(s => s.id);
        const { data: symptomMappings } = await supabase
          .from('resource_symptom_mappings')
          .select('resource_id')
          .in('symptom_id', symptomIds);
        symptomResourceIds = (symptomMappings || []).map(m => m.resource_id);
      }

      // Find resources linked to matching conditions
      let conditionResourceIds: string[] = [];
      if (matchingConditions && matchingConditions.length > 0) {
        const conditionIds = matchingConditions.map(c => c.id);
        const { data: conditionMappings } = await supabase
          .from('condition_resource_mappings')
          .select('resource_id')
          .in('condition_id', conditionIds);
        conditionResourceIds = (conditionMappings || []).map(m => m.resource_id);
      }

      // Combine tag-matched IDs that aren't already in direct results
      const tagResourceIds = [...new Set([...symptomResourceIds, ...conditionResourceIds])]
        .filter(id => !directHealingIds.has(id));

      // Fetch additional healing resources by tag matches
      let tagHealingData: any[] = [];
      if (tagResourceIds.length > 0) {
        const { data } = await supabase
          .from('healing_resources')
          .select(`
            id, title, slug, summary, 
            display_image_url, vimeo_embed_url, audio_file_url,
            status, modality, location_id,
            location:content_categories!healing_resources_location_id_fkey(id, page)
          `)
          .eq('status', 'published')
          .in('id', tagResourceIds)
          .limit(50);
        tagHealingData = data || [];
      }

      const allHealingData = [...(healingData || []), ...tagHealingData];

      const contentResults: SearchResult[] = (contentData || []).map((r: any) => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
        summary: r.summary,
        thumbnail_url: getPublicUrl('content-thumbnails', r.thumbnail_url),
        main_media_kind: r.main_media_kind,
        main_media_file_url: r.main_media_file_url,
        main_media_embed_url: r.main_media_embed_url,
        secondary_audio_url: null,
        is_course: r.is_course,
        status: r.status,
        source: 'content' as const,
        resource_type: r.resource_type || null,
        doorBucket: r.location?.page || null,
      }));

      const healingResults: SearchResult[] = allHealingData.map((r: any) => ({
        id: r.id,
        title: r.title,
        slug: `healing-${r.slug || r.id}`,
        summary: r.summary,
        thumbnail_url: getPublicUrl('healing-resource-images', r.display_image_url),
        main_media_kind: r.vimeo_embed_url ? 'video_embed' : r.audio_file_url ? 'file' : 'none',
        main_media_file_url: r.audio_file_url,
        main_media_embed_url: r.vimeo_embed_url,
        secondary_audio_url: null,
        is_course: false,
        status: r.status,
        source: 'healing' as const,
        resource_type: r.modality ? { id: '', name: r.modality, slug: r.modality } : null,
        doorBucket: r.location?.page || null,
      }));

      const courseResults: SearchResult[] = allCoursesData.map((r: any) => ({
        id: r.id,
        title: r.title,
        slug: `legacy-course-${r.id}`,
        summary: htmlToPlainText(r.description),
        thumbnail_url: r.image_url || null,
        main_media_kind: 'none' as const,
        main_media_file_url: null,
        main_media_embed_url: null,
        secondary_audio_url: null,
        is_course: true,
        status: 'published' as const,
        source: 'content' as const,
        resource_type: { id: '', name: 'Course', slug: 'course' },
        doorBucket: r.location?.page || r.door_type || null,
      }));

      const allResults = [...contentResults, ...courseResults, ...healingResults].filter(
        (r) => !!r.slug
      );
      setResults(allResults);
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

  // Determine base path for a result based on its door
  const getBasePath = (resource: SearchResult) => {
    if (resource.doorBucket === 'remembrance') return '/remembrance';
    if (resource.doorBucket === 'communion') return '/communion';
    return '/devotion';
  };

  const isLocked = (resource: SearchResult): boolean => {
    if (!resource.doorBucket) return false;
    return !hasAccess(resource.doorBucket);
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

        {!loading && query && totalCount === 0 && (
          <div className="text-center py-12">
            <Search className="w-10 h-10 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground">No resources found for "{query}"</p>
          </div>
        )}

        {!loading && totalCount > 0 && (
          <p className="text-sm text-muted-foreground mb-6">
            {totalCount} result{totalCount !== 1 ? 's' : ''} for "{query}"
          </p>
        )}

        {!loading && deckResults.length > 0 && (
          <section className="mb-10">
            <h2 className="font-serif text-xl text-foreground mb-4">Card Decks</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {deckResults.map((deck) => (
                <button
                  key={deck.id}
                  onClick={() => navigate(`/remembrance?deck=${deck.id}`)}
                  className="text-left rounded-lg border border-border/60 bg-card p-4 hover:border-primary/60 transition-colors"
                >
                  <p className="font-serif text-lg text-foreground">{deck.title}</p>
                  {deck.subtitle && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{deck.subtitle}</p>
                  )}
                  {deck.tags && deck.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {deck.tags.slice(0, 4).map((t) => (
                        <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        {!loading && cardResults.length > 0 && (
          <section className="mb-10">
            <h2 className="font-serif text-xl text-foreground mb-4">
              Cards <span className="text-sm text-muted-foreground font-sans">({cardResults.length})</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cardResults.slice(0, visibleCards).map((card) => (
                <button
                  key={card.id}
                  onClick={() => navigate(`/remembrance?deck=${card.deck_id}&card=${card.id}`)}
                  className="text-left rounded-lg border border-border/60 bg-card p-4 hover:border-primary/60 transition-colors"
                >
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {card.deck_name} · Card {card.card_number}
                  </p>
                  <p className="font-serif text-base text-foreground mt-1">{card.title}</p>
                  {card.subtitle && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{card.subtitle}</p>
                  )}
                  {card.tags && card.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {card.tags.slice(0, 4).map((t) => (
                        <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
            {cardResults.length > visibleCards && (
              <div className="flex justify-center mt-4">
                <Button variant="outline" onClick={() => setVisibleCards((n) => n + 24)}>
                  Show more cards
                </Button>
              </div>
            )}
          </section>
        )}

        {!loading && results.length > 0 && (
          <>
            <h2 className="font-serif text-xl text-foreground mb-4">Teachings &amp; Courses</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((resource, index) => {
                const locked = isLocked(resource);

                const tierInfo = resource.doorBucket ? getRequiredTierForBucket(resource.doorBucket) : null;
                return (
                  <div key={resource.id} className="relative">
                    <ResourceCard
                      resource={resource}
                      index={index}
                      basePath={getBasePath(resource)}
                      comingSoon={locked}
                    />
                    {locked && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/70 backdrop-blur-[2px] rounded-lg pointer-events-none">
                        <Lock className="w-8 h-8 text-muted-foreground mb-2" />
                        <Badge variant="secondary" className="text-xs font-serif">
                          {tierInfo ? `${tierInfo.tierName} Access` : 'Membership Required'}
                        </Badge>
                      </div>
                    )}
                  </div>
                );
              })}
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
