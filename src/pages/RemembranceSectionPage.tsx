import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import ProfileDropdown from '@/components/ProfileDropdown';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowLeft, DoorOpen } from 'lucide-react';
import { useTierAccess } from '@/hooks/useTierAccess';
import { TempleAccessGate } from '@/components/temple/TempleAccessGate';
import { useContentByLocation } from '@/hooks/useContentByLocation';
import ResourceCard from '@/components/devotion/ResourceCard';

interface LocationInfo {
  id: string;
  name: string;
  slug: string;
}

const RemembranceSectionPage = () => {
  const { section } = useParams<{ section: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const { tierName, loading: tierLoading } = useTierAccess();

  // Fetch the location info from database based on URL section
  useEffect(() => {
    const fetchLocationInfo = async () => {
      if (!section) return;
      
      setLocationLoading(true);
      
      // Convert URL slug to database slug format (add 'loc-' prefix)
      const possibleSlugs = [
        `loc-${section}`,
        section,
      ];

      const { data, error } = await supabase
        .from('content_categories')
        .select('id, name, slug')
        .eq('type', 'location')
        .eq('active', true)
        .eq('page', 'remembrance')
        .in('slug', possibleSlugs)
        .single();

      if (data) {
        setLocationInfo(data);
      } else {
        setLocationInfo(null);
      }
      
      setLocationLoading(false);
    };

    fetchLocationInfo();
  }, [section]);

  const locationSlug = locationInfo?.slug || '';
  const { resources, loading: contentLoading, error, locationName, isAdmin } = useContentByLocation(locationSlug);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading || tierLoading || locationLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-serif text-xl">
          Loading...
        </div>
      </div>
    );
  }

  // Redirect if location doesn't exist in database
  if (!locationInfo) {
    navigate('/decks');
    return null;
  }

  const sectionTitle = locationInfo.name;
  const sectionDescription = `Explore ${locationInfo.name.toLowerCase()} to deepen your journey of remembrance.`;

  return (
   <TempleAccessGate>
    <div className="min-h-screen bg-background py-12 px-4 relative">
      {/* Navigation Header */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
        <PageBreadcrumb items={[
          { label: 'The Door of Remembrance', href: '/decks', icon: DoorOpen },
          { label: sectionTitle }
        ]} />
        <div className="flex items-center gap-3">
          {tierName && (
            <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5 hidden sm:flex">
              <Sparkles className="w-3 h-3 mr-1" />
              {tierName}
            </Badge>
          )}
          <ProfileDropdown />
        </div>
      </div>

      <div className="max-w-5xl mx-auto pt-12">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/decks')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Door of Remembrance
        </Button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
            {sectionTitle}
          </h1>
          <p className="text-muted-foreground font-sans text-lg max-w-2xl mx-auto">
            {sectionDescription}
          </p>
        </motion.div>

        {/* Content Grid */}
        {contentLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-pulse text-primary font-serif">
              Loading content...
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>Unable to load content. Please try again later.</p>
          </div>
        ) : resources.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <p className="text-muted-foreground font-sans">
              Content for this section is coming soon.
            </p>
            <p className="text-sm text-muted-foreground/70 mt-2">
              Check back later for new resources.
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resources.map((resource, index) => (
              <ResourceCard key={resource.id} resource={resource} index={index} showDraftBadge={isAdmin} basePath="/decks" />
            ))}
          </div>
        )}
      </div>
    </div>
   </TempleAccessGate>
  );
};

export default RemembranceSectionPage;
