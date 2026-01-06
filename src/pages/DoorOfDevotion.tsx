import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogOut, MessageCircleHeart, FolderHeart, Settings, Sparkles, Flame, Move, Zap, FileHeart } from 'lucide-react';

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
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      // Check if user is admin
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .single();

      setIsAdmin(!!roles);
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const categories: Category[] = [
    {
      id: 'maelin',
      name: 'Maelin: Custom Protocols Guide',
      description: 'Your personal healing companion who creates custom protocols based on your symptoms',
      icon: <MessageCircleHeart className="w-8 h-8" />,
      route: '/devotion/healing-bot',
    },
    {
      id: 'my-protocols',
      name: 'My Protocols',
      description: 'View and manage your saved healing protocols',
      icon: <FolderHeart className="w-8 h-8" />,
      route: '/devotion/protocols',
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
      id: 'energy-hygiene',
      name: 'Energy Hygiene Practices',
      description: 'Tools for clearing and protecting your energetic field',
      icon: <Zap className="w-8 h-8" />,
      route: null,
    },
    {
      id: 'healing-templates',
      name: 'Healing Templates',
      description: 'Pre-designed templates for common healing journeys',
      icon: <FileHeart className="w-8 h-8" />,
      route: null,
    },
    ...(isAdmin ? [{
      id: 'admin',
      name: 'Admin Dashboard',
      description: 'Manage healing content and view analytics',
      icon: <Settings className="w-8 h-8" />,
      route: '/devotion/admin',
    }] : []),
  ];

  const handleCategoryClick = (category: Category) => {
    if (category.route) {
      navigate(category.route);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-serif text-xl">
          Opening the Door of Devotion...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 relative">
      {/* Navigation Header */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
        <Button
          onClick={() => navigate('/')}
          variant="ghost"
          size="sm"
          className="text-foreground/70 hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Temple
        </Button>
        <Button
          onClick={handleSignOut}
          variant="ghost"
          size="sm"
          className="text-foreground/70 hover:text-foreground"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
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
            Connect with personalized healing guidance tailored to your unique journey.
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