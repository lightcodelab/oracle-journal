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
  rank: number | null;
  score: number | null;
}

type MixedItem =
  | { type: 'deck'; rank: number; score: number; row: TempleRow }
  | { type: 'card'; rank: number; score: number; row: TempleRow }
  | { type: 'resource'; rank: number; score: number; resource: SearchResult };

const STOP_WORDS = new Set([
  'the','and','for','with','that','this','was','are','you','your','yours','from','have','has','had',
  'feel','feels','feeling','felt','but','not','all','any','when','what','why','how','can','get','got',
  'just','like','really','very','been','being','about','into','out','over','keep','keeps','kept',
  'always','still','they','them','their','she','her','who','because','than','then','there','here',
  'some','much','more','most','also','only','even','ever','never','make','makes','made','want',
  'wants','wanted','need','needs','needed',
]);

// Search terms: the full phrase plus each meaningful word, so "I feel stuck"
// finds the same results as "stuck".
const buildTerms = (q: string): string[] => {
  const phrase = q.trim();
  const words = phrase
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
  return [...new Set([phrase.toLowerCase(), ...words])].filter((t) => t.length >= 2);
};

const toPatterns = (terms: string[]) => terms.map((t) => `%${t}%`);

const orFilter = (fields: string[], patterns: string[]) =>
  patterns.flatMap((p) => fields.map((f) => `${f}.ilike.${p}`)).join(',');

const textMatches = (text: string | null | undefined, terms: string[]) => {
  if (!text) return false;
  const lower = text.toLowerCase();
  return terms.some((t) => lower.includes(t));
};

// Priority: 1 = title match, 2 = tag match, 3 = body/content match.
const clientRank = (
  title: string | null | undefined,
  summary: string | null | undefined,
  terms: string[],
  tagMatched: boolean,
): number => {
  if (textMatches(title, terms)) return 1;
  if (tagMatched) return 2;
  if (textMatches(summary, terms)) return 3;
  return 3;
};

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
  const [items, setItems] = useState<MixedItem[]>([]);
  const [visibleCount, setVisibleCount] = useState(24);
  const [loading, setLoading] = useState(false);
  const { hasAccess, loading: tierLoading } = useTierAccess();

  useEffect(() => {
    setLocalQuery(query);
    setVisibleCount(24);
  }, [query]);


  useEffect(() => {
    if (!query.trim()) {
      setItems([]);
      return;
    }


    const search = async () => {
      setLoading(true);

      const terms = buildTerms(query);
      const patterns = toPatterns(terms);
      const titleSummaryFilter = orFilter(['title', 'summary'], patterns);
      const nameFilter = orFilter(['name'], patterns);


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
        .or(titleSummaryFilter)
        .limit(50);

      // Decks, individual cards and courses — matched on titles, body content,
      // lesson content and any assigned tags (server-side, with match-location rank).
      const { data: templeRows } = await supabase.rpc('search_temple', { _q: query });
      const temple = (templeRows || []) as TempleRow[];


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
        .or(titleSummaryFilter)
        .limit(50);

      // Find matching symptom IDs
      const { data: matchingSymptoms } = await supabase
        .from('symptoms')
        .select('id')
        .or(nameFilter);

      // Find matching condition IDs
      const { data: matchingConditions } = await supabase
        .from('conditions')
        .select('id')
        .or(nameFilter);

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
      const tagResourceIds = [...new Set([...symptomResourceIds, ...conditionResourceIds])];
      const tagMatchedIds = new Set(tagResourceIds);
      const extraTagIds = tagResourceIds.filter(id => !directHealingIds.has(id));

      // Fetch additional healing resources by tag matches
      let tagHealingData: any[] = [];
      if (extraTagIds.length > 0) {
        const { data } = await supabase
          .from('healing_resources')
          .select(`
            id, title, slug, summary, 
            display_image_url, vimeo_embed_url, audio_file_url,
            status, modality, location_id,
            location:content_categories!healing_resources_location_id_fkey(id, page)
          `)
          .eq('status', 'published')
          .in('id', extraTagIds)
          .limit(50);
        tagHealingData = data || [];
      }

      const allHealingData = [...(healingData || []), ...tagHealingData];

      const mixed: MixedItem[] = [];

      // Decks and cards straight from the ranked RPC
      for (const row of temple) {
        if (row.kind === 'course') continue;
        mixed.push({
          type: row.kind,
          rank: row.rank ?? 4,
          score: row.score ?? 0,
          row,
        });
      }

      // Courses from the RPC, mapped to resource cards
      for (const row of temple) {
        if (row.kind !== 'course') continue;
        mixed.push({
          type: 'resource',
          rank: row.rank ?? 4,
          score: row.score ?? 0,
          resource: {
            id: row.id,
            title: row.title,
            slug: `legacy-course-${row.id}`,
            summary: htmlToPlainText(row.subtitle),
            thumbnail_url: row.image_url || null,
            main_media_kind: 'none' as const,
            main_media_file_url: null,
            main_media_embed_url: null,
            secondary_audio_url: null,
            is_course: true,
            status: 'published' as const,
            source: 'content' as const,
            resource_type: { id: '', name: 'Course', slug: 'course' },
            doorBucket: row.door || null,
          },
        });
      }

      for (const r of contentData || []) {
        const resource: SearchResult = {
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
          resource_type: (r as any).resource_type || null,
          doorBucket: (r as any).location?.page || null,
        };
        mixed.push({
          type: 'resource',
          rank: clientRank(r.title, r.summary, terms, false),
          score: 0,
          resource,
        });
      }

      for (const r of allHealingData) {
        const resource: SearchResult = {
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
          doorBucket: (r as any).location?.page || null,
        };
        mixed.push({
          type: 'resource',
          rank: clientRank(r.title, r.summary, terms, tagMatchedIds.has(r.id)),
          score: 0,
          resource,
        });
      }

      mixed.sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank;
        if (a.score !== b.score) return b.score - a.score;
        const ta = a.type === 'resource' ? a.resource.title : a.row.title;
        const tb = b.type === 'resource' ? b.resource.title : b.row.title;
        return (ta || '').localeCompare(tb || '');
      });

      setItems(mixed.filter((i) => i.type !== 'resource' || !!i.resource.slug));
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

  const visible = items.slice(0, visibleCount);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <PageBreadcrumb items={[{ label: 'Search' }]} />
          <NavActions />
        </div>
      </header>

      <div className="container max-w-6xl px-4 py-8">
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

        {!loading && query && items.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-10 h-10 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground">No resources found for "{query}"</p>
          </div>
        )}

        {!loading && items.length > 0 && (
          <p className="text-sm text-muted-foreground mb-6">
            {items.length} result{items.length !== 1 ? 's' : ''} for "{query}"
          </p>
        )}

        {!loading && visible.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visible.map((item) => {
                if (item.type === 'deck') {
                  const deck = item.row;
                  return (
                    <button
                      key={`deck-${deck.id}`}
                      onClick={() => navigate(`/remembrance?deck=${deck.id}`)}
                      className="text-left rounded-lg border border-border/60 bg-card p-4 hover:border-primary/60 transition-colors"
                    >
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Card Deck</p>
                      <p className="font-serif text-lg text-foreground mt-1">{deck.title}</p>
                      {deck.subtitle && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{htmlToPlainText(deck.subtitle)}</p>
                      )}
                      {deck.tags && deck.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {deck.tags.slice(0, 4).map((t) => (
                            <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                }

                if (item.type === 'card') {
                  const card = item.row;
                  return (
                    <button
                      key={`card-${card.id}`}
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
                  );
                }

                const resource = item.resource;
                const locked = isLocked(resource);
                const tierInfo = resource.doorBucket ? getRequiredTierForBucket(resource.doorBucket) : null;
                return (
                  <div key={`res-${resource.id}`} className="relative">
                    <ResourceCard
                      resource={resource}
                      index={0}
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
            {items.length > visibleCount && (
              <div className="flex justify-center mt-6">
                <Button variant="outline" onClick={() => setVisibleCount((n) => n + 24)}>
                  Show more results
                </Button>
              </div>
            )}
          </>
        )}

        {!loading && !query && (
          <div className="text-center py-12">
            <Search className="w-10 h-10 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground">Enter a search term to find resources across the Temple</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;
