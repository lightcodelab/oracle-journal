import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import NavActions from '@/components/NavActions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, X, Lock, ArrowUpRight } from 'lucide-react';
import { useTierAccess, TIER_NAMES, getRequiredTierForBucket } from '@/hooks/useTierAccess';

import templeBanner from '@/assets/temple-banner.png';
import doorRemembrance from '@/assets/door-remembrance.png';
import doorDevotion from '@/assets/door-devotion.png';
import doorCommunion from '@/assets/door-communion.png';

interface Door {
  id: string;
  name: string;
  image: string;
  route: string;
  bucket: string;
}

const doors: Door[] = [
  {
    id: 'remembrance',
    name: 'The Door of Remembrance',
    image: doorRemembrance,
    route: '/decks',
    bucket: 'remembrance',
  },
  {
    id: 'devotion',
    name: 'The Door of Devotion',
    image: doorDevotion,
    route: '/devotion',
    bucket: 'devotion',
  },
  {
    id: 'communion',
    name: 'The Door of Communion',
    image: doorCommunion,
    route: '/communion',
    bucket: 'communion',
  },
];

const Temple = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showTrialPrompt, setShowTrialPrompt] = useState(false);
  const [promptDismissed, setPromptDismissed] = useState(false);
  const { hasAccess, memberTierCode, subscriptionStatus, tierName, loading: tierLoading, isAdmin } = useTierAccess();

  const isActiveMember = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';
  
  // Show trial prompt only if user has started signup but hasn't completed payment
  // Don't show to admins or users with active memberships
  const shouldShowTrialPrompt = !isAdmin && !isActiveMember;

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

  useEffect(() => {
    // Show trial prompt only if user should see it (not admin, not active member)
    if (!tierLoading && shouldShowTrialPrompt) {
      const dismissed = sessionStorage.getItem('trialPromptDismissed');
      if (!dismissed) {
        setShowTrialPrompt(true);
      }
    } else {
      setShowTrialPrompt(false);
    }
  }, [tierLoading, shouldShowTrialPrompt]);

  const handleDoorClick = (door: Door) => {
    if (hasAccess(door.bucket)) {
      navigate(door.route);
    }
  };

  const handleDismissPrompt = () => {
    sessionStorage.setItem('trialPromptDismissed', 'true');
    setPromptDismissed(true);
    setShowTrialPrompt(false);
  };

  const handleUpgrade = () => {
    navigate('/membership');
  };

  if (loading || tierLoading) {
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
      {/* Nav Actions */}
      <div className="absolute top-4 right-4 z-20">
        <NavActions />
      </div>

      <div className="max-w-6xl mx-auto pt-6">
        {/* Current Membership Status */}
        {isActiveMember && tierName && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5">
                <Sparkles className="w-3 h-3 mr-1" />
                {tierName}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {subscriptionStatus === 'trialing' ? '(Trial)' : ''}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleUpgrade} className="text-muted-foreground hover:text-foreground">
              Upgrade Membership
              <ArrowUpRight className="w-4 h-4 ml-1" />
            </Button>
          </motion.div>
        )}

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
                    <p className="font-medium text-foreground">Start Your Membership</p>
                    <p className="text-sm text-muted-foreground">
                      Choose a membership tier to unlock the sacred content within the Temple.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button onClick={handleUpgrade} size="sm">
                    View Memberships
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
          {doors.map((door, index) => {
            const canAccess = hasAccess(door.bucket);
            const requiredTier = getRequiredTierForBucket(door.bucket);

            return (
              <motion.div
                key={door.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                onClick={() => canAccess && handleDoorClick(door)}
                className={`relative group ${canAccess ? 'cursor-pointer' : ''}`}
              >
                <div className={`overflow-hidden rounded-lg transition-all duration-300 ${
                  canAccess ? 'group-hover:shadow-lg group-hover:shadow-primary/20' : ''
                }`}>
                  <img
                    src={door.image}
                    alt={door.name}
                    className={`w-full h-auto transition-transform duration-500 ${
                      canAccess ? 'group-hover:scale-105' : 'opacity-60'
                    }`}
                  />
                </div>
                
                {/* Locked Overlay */}
                {!canAccess && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/70 rounded-lg backdrop-blur-sm">
                    <Lock className="w-8 h-8 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground mb-2 text-center px-4">
                      Requires {requiredTier?.tierName || 'Membership'}
                    </p>
                    <Button 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/membership');
                      }}
                    >
                      {isActiveMember ? 'Upgrade' : 'Join Now'}
                    </Button>
                  </div>
                )}
              </motion.div>
            );
          })}
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
