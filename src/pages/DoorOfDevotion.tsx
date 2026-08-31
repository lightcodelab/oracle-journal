import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import NavActions from '@/components/NavActions';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Lock, ArrowUpRight, DoorOpen } from 'lucide-react';
import AllResourcesSection from '@/components/devotion/AllResourcesSection';
import { useTierAccess } from '@/hooks/useTierAccess';
import { DoorHeader } from '@/components/temple/DoorHeader';
import { GuideNextStepCard } from '@/components/temple/GuideNextStepCard';
import { SearchTheTempleCard } from '@/components/temple/SearchTheTempleCard';
import devotionHeader from '@/assets/door-devotion-header-v1.webp.asset.json';


const DoorOfDevotion = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [locationCategories, setLocationCategories] = useState<LocationCategory[]>([]);
  
  const { hasAccess, tierName, subscriptionStatus, loading: tierLoading } = useTierAccess();

  const canAccessDevotion = hasAccess('devotion');
  const isActiveMember = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';

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

  // Fetch location categories from database
  useEffect(() => {
    const fetchLocations = async () => {
      const { data, error } = await supabase
        .from('content_categories')
        .select('id, name, slug, display_order, page')
        .eq('type', 'location')
        .eq('active', true)
        .eq('page', 'devotion')
        .order('display_order');

      if (data) {
        setLocationCategories(data);
      }
    };

    fetchLocations();
  }, []);

  // Build dynamic categories from database locations
  const dynamicCategories = locationCategories.map(loc => ({
    id: loc.id,
    name: loc.name,
    description: CATEGORY_DESCRIPTIONS[loc.slug] || `Explore ${loc.name.toLowerCase()} resources for your healing journey.`,
    icon: CATEGORY_ICONS[loc.slug] || <Folder className="w-8 h-8" />,
    route: `/devotion/section/${getRouteSlug(loc.slug)}`,
    isStatic: false,
  }));

  // Combine static and dynamic categories
  const categories = [...STATIC_CATEGORIES, ...dynamicCategories];

  const handleCategoryClick = (category: typeof categories[0]) => {
    if (category.route && canAccessDevotion) {
      navigate(category.route);
    }
  };

  if (loading || tierLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-serif text-xl">
          Opening the Door of Devotion...
        </div>
      </div>
    );
  }

  // Show access denied if user doesn't have devotion access
  if (!canAccessDevotion) {
    return (
      <div className="min-h-screen bg-background py-12 px-4 relative">
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
          <PageBreadcrumb items={[{ label: 'The Door of Devotion', icon: DoorOpen }]} />
          <NavActions />
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
              The Door of Devotion
            </h1>
            <p className="text-muted-foreground">
              This door requires The Devotee membership tier or higher to access.
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
              <Button variant="ghost" onClick={() => navigate('/temple')}>
                Return to Temple
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
        <PageBreadcrumb items={[{ label: 'The Door of Devotion', icon: DoorOpen }]} />
        <div className="flex items-center gap-3">
          {tierName && (
            <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5 hidden sm:flex">
              <Sparkles className="w-3 h-3 mr-1" />
              {tierName}
            </Badge>
          )}
          <NavActions />
        </div>
      </div>

      <div className="max-w-6xl mx-auto pt-12 transition-all duration-300">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <DoorHeader image={devotionHeader.url} title="The Door of Devotion" />
           <p className="text-muted-foreground font-sans text-base max-w-2xl mx-auto mb-6">
              <span className="font-bold text-primary">A space to restore your body, regulate your nervous system, and return to yourself.</span>
              <br />
              Guided meditations and Energetic Healing for embodied repair.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-12">
            <GuideNextStepCard />
            <SearchTheTempleCard />
          </div>

          <AllResourcesSection />
      </div>
    </div>
  );
};

export default DoorOfDevotion;