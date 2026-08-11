import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import NavActions from '@/components/NavActions';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircleHeart, Sparkles, Flame, Move, Zap, FileHeart, Lock, ArrowUpRight, Folder, LayoutGrid, Grid3X3, DoorOpen } from 'lucide-react';
import AllResourcesSection from '@/components/devotion/AllResourcesSection';
import { useTierAccess } from '@/hooks/useTierAccess';
import { DoorHeader } from '@/components/temple/DoorHeader';
import devotionHeader from '@/assets/door-devotion-header-v1.webp.asset.json';

interface LocationCategory {
  id: string;
  name: string;
  slug: string;
  display_order: number;
}

// Map location slugs to route slugs (for URL formatting)
const getRouteSlug = (locationSlug: string) => {
  // Remove 'loc-' prefix and keep as-is for URL
  return locationSlug.replace(/^loc-/, '');
};

// Static categories that aren't from the database
const STATIC_CATEGORIES = [
  {
    id: 'areekeera',
    name: 'AreekeerA® Protocol Builder',
    description: 'Personalised Energy Healing Protocols built for you based on your symptoms (with trauma informed safety guardrails)',
    icon: <MessageCircleHeart className="w-8 h-8" />,
    route: '/devotion/areekeera',
    isStatic: true,
  },
];

// Icon mapping for dynamic categories (can be extended)
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'loc-guided-meditation': <Sparkles className="w-8 h-8" />,
  'loc-altar-practices': <Flame className="w-8 h-8" />,
  'loc-somatic-rituals': <Move className="w-8 h-8" />,
  'loc-healing-templates': <FileHeart className="w-8 h-8" />,
  'loc-energy-hygiene-practices': <Zap className="w-8 h-8" />,
};

// Custom descriptions for specific categories (overrides auto-generated)
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'loc-energy-hygiene-practices': 'Tools for clearing, cleansing, and protecting your energetic field from outside interference.',
};

const DoorOfDevotion = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [locationCategories, setLocationCategories] = useState<LocationCategory[]>([]);
  const [view, setView] = useState<'categories' | 'all'>('all');
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

      <div className={`${view === 'all' ? 'max-w-6xl' : 'max-w-4xl'} mx-auto pt-12 transition-all duration-300`}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <DoorHeader image={devotionHeader.url} title="The Door of Devotion" />
           <p className="text-muted-foreground font-sans text-lg max-w-2xl mx-auto mb-6">
             <span className="font-bold text-primary">A space to restore your body, regulate your nervous system, and return to yourself.</span>
             <br />
             Guided meditations and Energetic Healing for embodied repair.
           </p>

           {/* View Toggle */}
           <div className="inline-flex items-center gap-1 bg-muted/50 rounded-lg p-1">
             <Button
               variant={view === 'categories' ? 'default' : 'ghost'}
               size="sm"
               onClick={() => setView('categories')}
               className="gap-2"
             >
               <Grid3X3 className="w-4 h-4" />
               Categories
             </Button>
             <Button
               variant={view === 'all' ? 'default' : 'ghost'}
               size="sm"
               onClick={() => setView('all')}
               className="gap-2"
             >
               <LayoutGrid className="w-4 h-4" />
               All Resources
             </Button>
           </div>
         </motion.div>

         {/* View Content */}
         {view === 'categories' ? (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {categories.map((category, index) => (
               <motion.div
                 key={category.id}
                 initial={{ opacity: 0, y: 30 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ duration: 0.6, delay: index * 0.1 }}
                 onClick={() => handleCategoryClick(category)}
                 className="relative group cursor-pointer"
               >
                 <div className="bg-card border border-border rounded-lg p-8 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/20 group-hover:border-primary/30">
                   <div className="mb-4 text-primary transition-colors group-hover:text-primary">
                     {category.icon}
                   </div>
                   <h3 className="font-serif text-2xl mb-2 text-foreground group-hover:text-primary transition-colors">
                     {category.name}
                   </h3>
                   <p className="text-muted-foreground text-sm">
                     {category.description}
                   </p>
                 </div>
               </motion.div>
             ))}
           </div>
         ) : (
           <AllResourcesSection />
         )}
      </div>
    </div>
  );
};

export default DoorOfDevotion;