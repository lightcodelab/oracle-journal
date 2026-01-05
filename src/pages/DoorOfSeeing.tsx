import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogOut, BookOpen, Video, Headphones, MessageCircle } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  route: string | null;
}

const categories: Category[] = [
  {
    id: 'courses',
    name: 'Courses',
    description: 'Structured teachings and guided learning experiences',
    icon: <BookOpen className="w-8 h-8" />,
    route: '/seeing/courses',
  },
  {
    id: 'workshops',
    name: 'Workshops',
    description: 'Interactive sessions and live teachings',
    icon: <Video className="w-8 h-8" />,
    route: null, // Coming soon
  },
  {
    id: 'audiobooks',
    name: 'Audio Books',
    description: 'Listen and learn at your own pace',
    icon: <Headphones className="w-8 h-8" />,
    route: null, // Coming soon
  },
  {
    id: 'channelled',
    name: 'Channelled Messages',
    description: 'Divine wisdom and spiritual guidance',
    icon: <MessageCircle className="w-8 h-8" />,
    route: null, // Coming soon
  },
];

const DoorOfSeeing = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleCategoryClick = (category: Category) => {
    if (category.route) {
      navigate(category.route);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-serif text-xl">
          Opening the Door of Seeing...
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
            The Door of Seeing
          </h1>
          <p className="text-muted-foreground font-sans text-lg max-w-2xl mx-auto">
            Expand your perception through courses, workshops, and channelled wisdom.
          </p>
        </motion.div>

        {/* Category Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

export default DoorOfSeeing;
