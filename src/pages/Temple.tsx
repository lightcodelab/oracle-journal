import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import ProfileDropdown from '@/components/ProfileDropdown';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, X } from 'lucide-react';

import templeBanner from '@/assets/temple-banner.png';
import doorRemembrance from '@/assets/door-remembrance.png';
import doorDevotion from '@/assets/door-devotion.png';
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
    route: '/devotion',
  },
  {
    id: 'communion',
    name: 'The Door of Communion',
    image: doorCommunion,
    route: '/communion',
  },
];

const Temple = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showTrialPrompt, setShowTrialPrompt] = useState(false);
  const [promptDismissed, setPromptDismissed] = useState(false);

  useEffect(() => {
    const checkAuthAndSubscription = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      // Check if user has an active subscription
      const { data: profile } = await supabase
        .from('profiles')
        .select('member_tier_code, subscription_status')
        .eq('id', session.user.id)
        .single();

      // Show trial prompt if no tier or no active subscription
      const hasActiveSubscription = profile?.subscription_status === 'active' || 
                                     profile?.subscription_status === 'trialing';
      const hasTier = !!profile?.member_tier_code;
      
      if (!hasTier || !hasActiveSubscription) {
        // Check if they dismissed the prompt in this session
        const dismissed = sessionStorage.getItem('trialPromptDismissed');
        if (!dismissed) {
          setShowTrialPrompt(true);
        }
      }

      setLoading(false);
    };

    checkAuthAndSubscription();

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

  const handleDismissPrompt = () => {
    sessionStorage.setItem('trialPromptDismissed', 'true');
    setPromptDismissed(true);
    setShowTrialPrompt(false);
  };

  const handleStartTrial = () => {
    navigate('/');
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
      {/* Profile Dropdown */}
      <div className="absolute top-4 right-4 z-20">
        <ProfileDropdown />
      </div>

      <div className="max-w-6xl mx-auto pt-6">
        {/* Trial Completion Prompt */}
        {showTrialPrompt && !promptDismissed && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-primary/20">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Complete Your Free Trial</p>
                    <p className="text-sm text-muted-foreground">
                      Start your 7-day free trial to unlock all the sacred content within the Temple.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button onClick={handleStartTrial} size="sm">
                    Start Free Trial
                  </Button>
                  <button
                    onClick={handleDismissPrompt}
                    className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    aria-label="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

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

        {/* Door Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
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
