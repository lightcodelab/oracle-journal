import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import ProfileDropdown from '@/components/ProfileDropdown';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircleHeart, Sparkles, Flame, Move, Zap, FileHeart, Lock, ArrowUpRight } from 'lucide-react';
import { useTierAccess } from '@/hooks/useTierAccess';

interface Category {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  route: string | null;
}

const DoorOfDevotion = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
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

  const categories: Category[] = [
    {
      id: 'areekeera',
      name: 'AreekeerA® Protocol Guide',
      description: 'AI-guided healing protocols personalized to your symptoms with trauma-informed safety',
      icon: <MessageCircleHeart className="w-8 h-8" />,
      route: '/devotion/areekeera',
    },
    {
      id: 'energy-hygiene',
      name: 'Energy Hygiene Kit',
      description: 'Tools for clearing, cleansing, and protecting your energetic field from outside interference',
      icon: <Zap className="w-8 h-8" />,
      route: '/devotion/energy-hygiene',
    },
    {
      id: 'guided-meditations',
      name: 'Guided Meditations',
      description: 'Journey inward with guided meditation experiences',
      icon: <Sparkles className="w-8 h-8" />,
      route: null,
    },
    {
      id: 'altar-practices',
      name: 'Altar Practices',
      description: 'Sacred rituals for creating and tending your personal altar',
      icon: <Flame className="w-8 h-8" />,
      route: null,
    },
    {
      id: 'somatic-rituals',
      name: 'Somatic Rituals',
      description: 'Body-based practices for releasing and integration',
      icon: <Move className="w-8 h-8" />,
      route: null,
    },
    {
      id: 'healing-templates',
      name: 'Healing Templates',
      description: 'Pre-designed templates for common healing journeys',
      icon: <FileHeart className="w-8 h-8" />,
      route: null,
    },
  ];

  const handleCategoryClick = (category: Category) => {
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
          <PageBreadcrumb items={[{ label: 'Door of Devotion' }]} />
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
        <PageBreadcrumb items={[{ label: 'Door of Devotion' }]} />
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

      <div className="max-w-4xl mx-auto pt-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
            The Door of Devotion
          </h1>
          <p className="text-muted-foreground font-sans text-lg max-w-2xl mx-auto">
            Resources for nervous system regulation, physical wellbeing restoration, and embodied repair through Energetic Healing.
          </p>
        </motion.div>

        {/* Category Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              onClick={() => handleCategoryClick(category)}
              className={`relative group ${
                category.route 
                  ? 'cursor-pointer' 
                  : 'cursor-not-allowed'
              }`}
            >
              <div className={`bg-card border border-border rounded-lg p-8 transition-all duration-300 ${
                category.route 
                  ? 'group-hover:shadow-lg group-hover:shadow-primary/20 group-hover:border-primary/30' 
                  : 'opacity-60'
              }`}>
                <div className={`mb-4 transition-colors ${
                  category.route ? 'text-primary group-hover:text-primary' : 'text-muted-foreground'
                }`}>
                  {category.icon}
                </div>
                <h3 className={`font-serif text-2xl mb-2 transition-colors ${
                  category.route ? 'text-foreground group-hover:text-primary' : 'text-muted-foreground'
                }`}>
                  {category.name}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {category.description}
                </p>
                {!category.route && (
                  <span className="inline-block mt-4 text-xs text-muted-foreground/70 font-sans">
                    Coming Soon
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DoorOfDevotion;