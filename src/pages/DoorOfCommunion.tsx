import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, GraduationCap, Users, CalendarDays, Video, Flower2 } from 'lucide-react';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import ProfileDropdown from '@/components/ProfileDropdown';
import { cn } from '@/lib/utils';

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

  return (
    <div className="min-h-screen bg-background py-12 px-4 relative">
      {/* Navigation Header */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
        <PageBreadcrumb items={[{ label: 'Door of Communion' }]} />
        <ProfileDropdown />
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
            The Door of Communion
          </h1>
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
