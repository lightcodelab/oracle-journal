import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import ProfileDropdown from '@/components/ProfileDropdown';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Lock, ArrowUpRight, ArrowLeft, DoorOpen } from 'lucide-react';
import { useTierAccess } from '@/hooks/useTierAccess';
import { useContentByLocation } from '@/hooks/useContentByLocation';
import ResourceCard from '@/components/devotion/ResourceCard';

const LOCATION_SLUG = 'loc-deepening-courses';
const PAGE_TITLE = 'Companion Courses';
const PAGE_DESCRIPTION = 'To deepen your experience with the cards and remember who you are.';

const DeepeningCourses = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const { hasAccess, tierName, subscriptionStatus, loading: tierLoading } = useTierAccess();

  const canAccessRemembrance = hasAccess('remembrance');
  const isActiveMember = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';

  const { resources, loading: contentLoading, error, isAdmin } = useContentByLocation(LOCATION_SLUG);

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading || tierLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-serif text-xl">Loading...</div>
      </div>
    );
  }

  if (!canAccessRemembrance) {
    return (
      <div className="min-h-screen bg-background py-12 px-4 relative">
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
          <PageBreadcrumb items={[
            { label: 'The Door of Remembrance', href: '/remembrance', icon: DoorOpen },
            { label: PAGE_TITLE }
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
            <h1 className="font-serif text-3xl text-foreground">{PAGE_TITLE}</h1>
            <p className="text-muted-foreground">This content requires a membership to access.</p>
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
              <Button variant="ghost" onClick={() => navigate('/remembrance')}>
                Return to Door of Remembrance
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 relative">
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
        <PageBreadcrumb items={[
          { label: 'The Door of Remembrance', href: '/remembrance', icon: DoorOpen },
          { label: PAGE_TITLE }
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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/remembrance')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Door of Remembrance
        </Button>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">{PAGE_TITLE}</h1>
          <p className="text-muted-foreground font-sans text-lg max-w-2xl mx-auto">
            {PAGE_DESCRIPTION}
          </p>
        </motion.div>

        {contentLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-pulse text-primary font-serif">Loading courses...</div>
          </div>
        ) : error ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>Unable to load courses. Please try again later.</p>
          </div>
        ) : resources.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <p className="text-muted-foreground font-sans">Companion courses are coming soon.</p>
            <p className="text-sm text-muted-foreground/70 mt-2">Check back later for new courses.</p>
          </motion.div>
        ) : (
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${resources.length === 1 ? 'max-w-sm mx-auto' : ''}`}>
            {resources.map((resource, index) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                index={index}
                showDraftBadge={isAdmin}
                basePath="/remembrance"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeepeningCourses;