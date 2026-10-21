import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useContentByLocation } from '@/hooks/useContentByLocation';
import ResourceCard from '@/components/devotion/ResourceCard';
import { DOOR_SECTIONS, type PracticeDoor } from '@/lib/doorSections';
import { Button } from '@/components/ui/button';
import { BookOpen, FolderOpen, ArrowUpRight } from 'lucide-react';

function LocationResources({ slug, door }: { slug: string; door: PracticeDoor }) {
  const { resources, loading, error, isAdmin } = useContentByLocation(slug);
  if (loading) return <p className="py-4 text-sm text-muted-foreground" role="status">Loading…</p>;
  if (error) return <p className="py-4 text-sm text-destructive">Unable to load resources. Please try again.</p>;
  if (!resources.length) return null;
  return <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {resources.map((resource, index) => <ResourceCard key={`${resource.source}-${resource.id}`} resource={resource} index={index} basePath={`/${door}`} showDraftBadge={isAdmin} />)}
  </div>;
}

function AssignedDecks({ slug }: { slug: string }) {
  const { data: decks = [], isError } = useQuery({
    queryKey: ['door-section-decks', slug],
    queryFn: async () => {
      const { data: location, error } = await supabase.from('content_categories').select('id').eq('type', 'location').eq('slug', slug).single();
      if (error) throw error;
      const { data, error: deckError } = await supabase.from('decks').select('id,name,thumbnail_url,is_published').eq('location_id', location.id).eq('is_starter', false).order('display_order');
      if (deckError) throw deckError;
      return data || [];
    },
  });
  if (isError) return <p className="text-sm text-destructive">Unable to load decks. Please try again.</p>;
  if (!decks.length) return null;
  return <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {decks.map(deck => <Link key={deck.id} to={`/remembrance?deck=${deck.id}`} className="overflow-hidden rounded-lg border border-border bg-card focus-visible:ring-2 focus-visible:ring-ring">
      {deck.thumbnail_url && <img src={deck.thumbnail_url} alt={deck.name} className="aspect-video w-full object-cover" />}
      <div className="p-5"><h3 className="font-serif text-lg text-foreground">{deck.name}</h3><p className="mt-2 text-sm text-primary-strong">Draw from Deck{!deck.is_published && ' · Draft'} →</p></div>
    </Link>)}
  </div>;
}

export function DoorSectionBand({ door, index, children, legacyLocations = [] }: { door: PracticeDoor; index: number; children?: ReactNode; legacyLocations?: string[] }) {
  const section = DOOR_SECTIONS[door].sections[index];
  if (!section) return null;
  const last = index === DOOR_SECTIONS[door].sections.length - 1;
  return <section aria-labelledby={`${section.slug}-heading`} className={`door-section-band door-section-tone-${index + 1} scroll-mt-24 py-10 px-4 sm:px-6`}>
    <div className="mx-auto max-w-6xl">
      <header className="mb-8 text-center">
        <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Section {index + 1}</p>
        <h2 id={`${section.slug}-heading`} className="font-serif text-2xl text-foreground md:text-3xl">{section.title}</h2>
      </header>
      <div className="space-y-8">
        {children}
        <LocationResources slug={section.slug} door={door} />
        {legacyLocations.map(slug => <LocationResources key={slug} slug={slug} door={door} />)}
        <AssignedDecks slug={section.slug} />
        {last && <div className="flex flex-wrap justify-center gap-3">
          <Button asChild variant="outline"><Link to="/case-notes"><FolderOpen className="mr-2 h-4 w-4" />{door === 'remembrance' ? 'Open a Case File' : 'Case Notes'}<ArrowUpRight className="ml-2 h-4 w-4" /></Link></Button>
          {door !== 'remembrance' && <Button asChild variant="outline"><Link to="/journal"><BookOpen className="mr-2 h-4 w-4" />My Journal<ArrowUpRight className="ml-2 h-4 w-4" /></Link></Button>}
        </div>}
      </div>
    </div>
  </section>;
}