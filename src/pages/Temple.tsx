import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

import templeBanner from '@/assets/temple-banner.png';
import doorRemembrance from '@/assets/door-remembrance.png';
import doorDevotion from '@/assets/door-devotion.png';
import doorSeeing from '@/assets/door-seeing.png';
import doorCommunion from '@/assets/door-communion.png';

interface Door {
  id: string;
  name: string;
  image: string;
  route: string | null;
}

const doors: Door[] = [
  {
    id: 'remembrance',
    name: 'The Door of Remembrance',
    image: doorRemembrance,
    route: '/decks',
  },
  {
    id: 'devotion',
    name: 'The Door of Devotion',
    image: doorDevotion,
    route: null, // Coming soon
  },
  {
    id: 'seeing',
    name: 'The Door of Seeing',
    image: doorSeeing,
    route: '/seeing',
  },
  {
    id: 'communion',
    name: 'The Door of Communion',
    image: doorCommunion,
    route: null, // Coming soon
  },
];

const Temple = () => {
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

  const handleDoorClick = (door: Door) => {
    if (door.route) {
      navigate(door.route);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-serif text-xl">
          Opening the Temple...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 relative">
      {/* Sign Out Button */}
      <div className="absolute top-4 right-4 z-20">
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

      <div className="max-w-6xl mx-auto">
        {/* Banner Image */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="mb-8"
        >
          <img
            src={templeBanner}
            alt="The Temple of Sustainment"
            className="w-full h-auto"
          />
        </motion.div>

        {/* Header Text */}
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center font-serif text-3xl md:text-4xl text-white mb-12"
        >
          The Temple is open to you.
        </motion.h1>

        {/* Door Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {doors.map((door, index) => (
            <motion.div
              key={door.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              onClick={() => handleDoorClick(door)}
              className={`relative group ${
                door.route 
                  ? 'cursor-pointer' 
                  : 'cursor-not-allowed opacity-70'
              }`}
            >
              <div className="overflow-hidden rounded-lg transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/20">
                <img
                  src={door.image}
                  alt={door.name}
                  className={`w-full h-auto transition-transform duration-500 ${
                    door.route ? 'group-hover:scale-105' : ''
                  }`}
                />
              </div>
              {!door.route && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-lg">
                  <span className="font-sans text-sm text-muted-foreground">
                    Coming Soon
                  </span>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Footer Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="text-center font-sans text-muted-foreground space-y-1"
        >
          <p>You may move between Doors as you wish.</p>
          <p>There is no correct order.</p>
        </motion.div>
      </div>
    </div>
  );
};

export default Temple;
