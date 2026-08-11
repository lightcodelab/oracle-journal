import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import ProfileDropdown from '@/components/ProfileDropdown';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Lock, ArrowUpRight, ArrowLeft, DoorOpen } from 'lucide-react';
import { useTierAccess } from '@/hooks/useTierAccess';
import { useContentByLocation } from '@/hooks/useContentByLocation';
import ResourceCard from '@/components/devotion/ResourceCard';

interface Course {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
}

const LOCATION_SLUG = 'loc-energy-hygiene-practices';

const DevotionCourses = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const { hasAccess, tierName, subscriptionStatus, loading: tierLoading } = useTierAccess();

  const canAccessDevotion = hasAccess('devotion');
  const isActiveMember = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';

  // Fetch resources via the unified hook
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Also fetch legacy courses from the courses table — scope to this location
  // so courses mapped to other doors (e.g. Remembrance) don't leak in.
  const { data: legacyCourses, isLoading: coursesLoading } = useQuery({
    queryKey: ['devotion-courses', LOCATION_SLUG],
    queryFn: async () => {
      // Look up the location id for Energy Hygiene Practices
      const { data: locationData, error: locErr } = await supabase
        .from('content_categories')
        .select('id')
        .eq('slug', LOCATION_SLUG)
        .eq('type', 'location')
        .eq('active', true)
        .single();

      if (locErr || !locationData) return [] as Course[];

      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('location_id', locationData.id)
        .eq('is_published', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as Course[];
    },
    enabled: !loading,
  });

  const handleCourseClick = (courseId: string) => {
    navigate(`/devotion/course/${courseId}`);
  };

  if (loading || tierLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-serif text-xl">
          Loading practices...
        </div>
      </div>
    );
  }

  // Show access denied if user doesn't have devotion access
  if (!canAccessDevotion) {
    return (
      <div className="min-h-screen bg-background py-12 px-4 relative">
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
          <PageBreadcrumb items={[
             { label: 'The Door of Devotion', href: '/devotion', icon: DoorOpen },
            { label: 'Energy Hygiene Practices' }
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
              Energy Hygiene Practices
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

  const hasLegacyCourses = legacyCourses && legacyCourses.length > 0;
  const hasResources = resources.length > 0;
  const isPageLoading = contentLoading || coursesLoading;

  return (
    <div className="min-h-screen bg-background py-12 px-4 relative">
      {/* Navigation Header */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
        <PageBreadcrumb 
          items={[
            { label: 'The Door of Devotion', href: '/devotion', icon: DoorOpen },
            { label: 'Energy Hygiene Practices' }
          ]} 
        />
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

      <div className="max-w-6xl mx-auto pt-12">
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
            Energy Hygiene Practices
          </h1>
          <p className="text-muted-foreground font-sans text-lg max-w-2xl mx-auto">
            Tools for clearing, cleansing, and protecting your energetic field from outside interference.
          </p>
        </motion.div>

        {isPageLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-pulse text-primary font-serif">
              Loading content...
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>Unable to load content. Please try again later.</p>
          </div>
        ) : !hasLegacyCourses && !hasResources ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-center py-16"
          >
            <p className="text-muted-foreground font-sans text-lg">
              New practices are being prepared for you.
            </p>
            <p className="text-muted-foreground/70 font-sans text-sm mt-2">
              Check back soon.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-12">
            {/* Resources Grid (from content_resources and healing_resources) */}
            {hasResources && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {resources.map((resource, index) => (
                  <ResourceCard key={resource.id} resource={resource} index={index} showDraftBadge={isAdmin} />
                ))}
              </div>
            )}

            {/* Legacy Courses Grid */}
            {hasLegacyCourses && (
              <>
                {hasResources && (
                  <div className="text-center">
                    <h2 className="font-serif text-2xl text-foreground">Courses</h2>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {legacyCourses.map((course, index) => (
                    <motion.div
                      key={course.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: (resources.length + index) * 0.1 }}
                      onClick={() => handleCourseClick(course.id)}
                      className="cursor-pointer group"
                    >
                      <div className="bg-card border border-border rounded-lg overflow-hidden transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/20 group-hover:border-primary/30">
                        {course.image_url ? (
                          <div className="aspect-square overflow-hidden">
                            <img
                              src={course.image_url}
                              alt={course.title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          </div>
                        ) : (
                          <div className="aspect-square bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                            <span className="text-primary/50 font-serif text-2xl">✦</span>
                          </div>
                        )}
                        <div className="p-6">
                          <h3 className="font-serif text-xl text-foreground mb-2 group-hover:text-primary transition-colors">
                            {course.title}
                          </h3>
                          {course.description && (
                            <p className="text-muted-foreground text-sm line-clamp-3">
                              {course.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DevotionCourses;
