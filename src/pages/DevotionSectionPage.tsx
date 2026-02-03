import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import ProfileDropdown from '@/components/ProfileDropdown';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Lock, ArrowUpRight, ArrowLeft } from 'lucide-react';
import { useTierAccess } from '@/hooks/useTierAccess';
import { useContentByLocation } from '@/hooks/useContentByLocation';
import ResourceCard from '@/components/devotion/ResourceCard';

// Map URL slugs to location slugs in the database
const SECTION_LOCATION_MAP: Record<string, string> = {
  'guided-meditations': 'loc-guided-meditation',
  'altar-practices': 'loc-altar-practices',
  'somatic-rituals': 'loc-somatic-rituals',
  'healing-templates': 'loc-healing-templates',
};

// Section metadata for display
const SECTION_META: Record<string, { title: string; description: string }> = {
  'guided-meditations': {
    title: 'Guided Meditations',
    description: 'Journey inward with guided meditation experiences designed to restore, regulate, and reconnect you with your deepest self.',
  },
  'altar-practices': {
    title: 'Altar Practices',
    description: 'Sacred rituals for creating and tending your personal altar as a space of devotion and healing.',
  },
  'somatic-rituals': {
    title: 'Somatic Rituals',
    description: 'Body-based practices for releasing held tension and integrating healing at the cellular level.',
  },
  'healing-templates': {
    title: 'Healing Templates',
    description: 'Pre-designed templates for common healing journeys to guide your practice.',
  },
};

const DevotionSectionPage = () => {
  const { section } = useParams<{ section: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const { hasAccess, tierName, subscriptionStatus, loading: tierLoading } = useTierAccess();

  const canAccessDevotion = hasAccess('devotion');
  const isActiveMember = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';

  const locationSlug = section ? SECTION_LOCATION_MAP[section] : '';
  const sectionMeta = section ? SECTION_META[section] : null;

  const { resources, loading: contentLoading, error, locationName } = useContentByLocation(locationSlug);

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

  if (loading || tierLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-serif text-xl">
          Loading...
        </div>
      </div>
    );
  }

  // Redirect if section doesn't exist
  if (!sectionMeta || !locationSlug) {
    navigate('/devotion');
    return null;
  }

  // Show access denied if user doesn't have devotion access
  if (!canAccessDevotion) {
    return (
      <div className="min-h-screen bg-background py-12 px-4 relative">
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
          <PageBreadcrumb items={[
            { label: 'Door of Devotion', href: '/devotion' },
            { label: sectionMeta.title }
          ]} />
          <ProfileDropdown />
        </div>

        <div className="max-w-lg mx-auto pt-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8 text-muted-foreground" />
            </div>
            <h1 className="font-serif text-3xl text-foreground">
              {sectionMeta.title}
            </h1>
            <p className="text-muted-foreground">
              This content requires The Devotee membership tier or higher to access.
            </p>
            {tierName && (
              <p className="text-sm text-muted-foreground">
                Your current tier: <Badge variant="outline">{tierName}</Badge>
              </p>
            )}
            <div className="flex flex-col gap-3 pt-4">
              <Button onClick={() => navigate('/membership')} size="lg">
                {isActiveMember ? 'Upgrade Membership' : 'View Memberships'}
                <ArrowUpRight className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="ghost" onClick={() => navigate('/devotion')}>
                Return to Door of Devotion
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 relative">
      {/* Navigation Header */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
        <PageBreadcrumb items={[
          { label: 'Door of Devotion', href: '/devotion' },
          { label: sectionMeta.title }
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
          onClick={() => navigate('/devotion')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Door of Devotion
        </Button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
            {sectionMeta.title}
          </h1>
          <p className="text-muted-foreground font-sans text-lg max-w-2xl mx-auto">
            {sectionMeta.description}
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
              <ResourceCard key={resource.id} resource={resource} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DevotionSectionPage;
