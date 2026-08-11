import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Sparkles, GraduationCap, Users, CalendarDays, Video, Flower2, Lock, ArrowUpRight, Eye } from 'lucide-react';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import NavActions from '@/components/NavActions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTierAccess } from '@/hooks/useTierAccess';
import { DoorHeader } from '@/components/temple/DoorHeader';
import communionHeader from '@/assets/door-communion-header-v1.webp.asset.json';

interface CommunionCategory {
  id: string;
  title: string;
  description: string;
  icon: typeof Sparkles;
  route: string;
  colorClass: string;
  borderColor: string;
}

const categories: CommunionCategory[] = [
  {
    id: 'mirror-exchange',
    title: 'The Mirror Exchange',
    description: 'A peer-held space where another member can hold the mirror while you listen for your own revelation.',
    icon: Eye,
    route: '/communion/mirror-exchange',
    colorClass: 'text-primary',
    borderColor: 'border-primary/30 group-hover:border-primary/50',
  },
  {
    id: 'live-readings',
    title: 'Live Readings',
    description: 'Join live oracle card readings and receive guidance in real-time.',
    icon: Sparkles,
    route: '/communion/live-readings',
    colorClass: 'text-purple-400',
    borderColor: 'border-purple-500/30 group-hover:border-purple-500/50',
  },
  {
    id: 'live-classes',
    title: 'Live Classes',
    description: 'Participate in live teaching sessions and deepen your practice.',
    icon: GraduationCap,
    route: '/communion/live-classes',
    colorClass: 'text-amber-400',
    borderColor: 'border-amber-500/30 group-hover:border-amber-500/50',
  },
  {
    id: 'live-workshops',
    title: 'Live Workshops',
    description: 'Join interactive workshops for hands-on learning and group practice.',
    icon: Users,
    route: '/communion/live-workshops',
    colorClass: 'text-emerald-400',
    borderColor: 'border-emerald-500/30 group-hover:border-emerald-500/50',
  },
  {
    id: 'live-meditations',
    title: 'Live Meditation Classes',
    description: 'Join guided meditation sessions for inner peace and spiritual connection.',
    icon: Flower2,
    route: '/communion/live-meditations',
    colorClass: 'text-cyan-400',
    borderColor: 'border-cyan-500/30 group-hover:border-cyan-500/50',
  },
  {
    id: 'all-sessions',
    title: 'All Sessions',
    description: 'Browse all upcoming live sessions in one place with calendar and grid views.',
    icon: CalendarDays,
    route: '/all-live-sessions',
    colorClass: 'text-primary',
    borderColor: 'border-primary/30 group-hover:border-primary/50',
  },
  {
    id: 'live-replays',
    title: 'Live Replays',
    description: 'Watch recordings of past live readings, classes, and workshops.',
    icon: Video,
    route: '/communion/live-replays',
    colorClass: 'text-rose-400',
    borderColor: 'border-rose-500/30 group-hover:border-rose-500/50',
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
          <p className="text-muted-foreground font-sans text-lg max-w-2xl mx-auto">
            Connect with our community through live sessions, readings, and interactive experiences.
          </p>
        </motion.div>

        {/* Category Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category, index) => {
            const Icon = category.icon;
            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                onClick={() => navigate(category.route)}
                className="cursor-pointer group"
              >
                <div className={cn(
                  'bg-card border rounded-lg p-8 transition-all duration-300',
                  'group-hover:shadow-lg group-hover:scale-[1.01]',
                  category.borderColor
                )}>
                  <div className={cn('mb-4 transition-colors', category.colorClass)}>
                    <Icon className="w-8 h-8" />
                  </div>
                  <h3 className={cn(
                    'font-serif text-2xl mb-2 transition-colors text-foreground',
                    `group-hover:${category.colorClass}`
                  )}>
                    {category.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {category.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
