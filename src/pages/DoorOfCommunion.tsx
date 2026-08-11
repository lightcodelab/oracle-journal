import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Sparkles, Lock, ArrowUpRight } from 'lucide-react';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import NavActions from '@/components/NavActions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTierAccess } from '@/hooks/useTierAccess';
import { DoorHeader } from '@/components/temple/DoorHeader';
import communionHeader from '@/assets/door-communion-header-v1.webp.asset.json';
import imgReadings from '@/assets/communion-live-readings.png.asset.json';
import imgClasses from '@/assets/communion-live-classes.png.asset.json';
import imgWorkshops from '@/assets/communion-live-workshops.png.asset.json';
import imgMeditations from '@/assets/communion-live-meditation-classes.png.asset.json';
import imgAllSessions from '@/assets/communion-all-sessions.png.asset.json';
import imgReplays from '@/assets/communion-live-replays.png.asset.json';
import imgMirror from '@/assets/communion-the-mirror-exchange.png.asset.json';

interface CommunionCategory {
  id: string;
  title: string;
  description: string;
  route: string;
  image: string;
}

const categories: CommunionCategory[] = [
  {
    id: 'mirror-exchange',
    title: 'The Mirror Exchange',
    description: 'A peer-held space where another member can hold the mirror while you listen for your own revelation.',
    route: '/communion/mirror-exchange',
    image: imgMirror.url,
  },
  {
    id: 'live-readings',
    title: 'Live Readings',
    description: 'Join live oracle card readings and receive guidance in real-time.',
    route: '/communion/live-readings',
    image: imgReadings.url,
  },
  {
    id: 'live-classes',
    title: 'Live Classes',
    description: 'Participate in live teaching sessions and deepen your practice.',
    route: '/communion/live-classes',
    image: imgClasses.url,
  },
  {
    id: 'live-workshops',
    title: 'Live Workshops',
    description: 'Join interactive workshops for hands-on learning and group practice.',
    route: '/communion/live-workshops',
    image: imgWorkshops.url,
  },
  {
    id: 'live-meditations',
    title: 'Live Meditation Classes',
    description: 'Join guided meditation sessions for inner peace and spiritual connection.',
    route: '/communion/live-meditations',
    image: imgMeditations.url,
  },
  {
    id: 'all-sessions',
    title: 'All Sessions',
    description: 'Browse all upcoming live sessions in one place with calendar and grid views.',
    route: '/all-live-sessions',
    image: imgAllSessions.url,
  },
  {
    id: 'live-replays',
    title: 'Live Replays',
    description: 'Watch recordings of past live readings, classes, and workshops.',
    route: '/communion/live-replays',
    image: imgReplays.url,
  },
];

export default function DoorOfCommunion() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const { hasAccess, tierName, subscriptionStatus, loading: tierLoading } = useTierAccess();

  const canAccessCommunion = hasAccess('communion');
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

  if (loading || tierLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-serif text-xl">
          Opening the Door of Communion...
        </div>
      </div>
    );
  }

  // Show access denied if user doesn't have communion access
  if (!canAccessCommunion) {
    return (
      <div className="min-h-screen bg-background py-12 px-4 relative">
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
          <PageBreadcrumb items={[{ label: 'Door of Communion' }]} />
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
              The Door of Communion
            </h1>
            <p className="text-muted-foreground">
              This door requires The Initiate membership tier to access.
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
        <PageBreadcrumb items={[{ label: 'Door of Communion' }]} />
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

      <div className="max-w-4xl mx-auto pt-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <DoorHeader image={communionHeader.url} title="The Door of Communion" />
          <p className="text-muted-foreground font-sans text-base max-w-2xl mx-auto">
            <span className="font-bold text-primary">A space to connect through live sessions, readings, and shared experiences.</span>
            <br />
            Come whenever you need support or to be around other humans.
          </p>
        </motion.div>

        {/* Category Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category, index) => {
            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="group"
              >
                <button
                  type="button"
                  onClick={() => navigate(category.route)}
                  className={cn(
                    'relative block w-full text-left aspect-video overflow-hidden rounded-lg',
                    'transition-transform duration-300 group-hover:scale-[1.01]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                  )}
                >
                  <img
                    src={category.image}
                    alt=""
                    aria-hidden
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-[hsl(28_45%_6%/0.92)] via-[hsl(28_40%_10%/0.55)] to-transparent"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <h3 className="font-serif text-2xl text-[hsl(38_60%_94%)] mb-1.5">
                      {category.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-[hsl(36_35%_86%)]">
                      {category.description}
                    </p>
                  </div>
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
