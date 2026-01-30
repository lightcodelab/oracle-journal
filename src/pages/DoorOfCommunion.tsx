import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, GraduationCap, Users, CalendarDays } from 'lucide-react';
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
  bgClass: string;
}

const categories: CommunionCategory[] = [
  {
    id: 'live-readings',
    title: 'Live Readings',
    description: 'Join live oracle card readings and receive guidance in real-time.',
    icon: Sparkles,
    route: '/communion/live-readings',
    colorClass: 'text-purple-400',
    bgClass: 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30',
  },
  {
    id: 'live-classes',
    title: 'Live Classes',
    description: 'Participate in live teaching sessions and deepen your practice.',
    icon: GraduationCap,
    route: '/communion/live-classes',
    colorClass: 'text-amber-400',
    bgClass: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30',
  },
  {
    id: 'live-workshops',
    title: 'Live Workshops',
    description: 'Join interactive workshops for hands-on learning and group practice.',
    icon: Users,
    route: '/communion/live-workshops',
    colorClass: 'text-emerald-400',
    bgClass: 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30',
  },
  {
    id: 'all-sessions',
    title: 'All Sessions',
    description: 'Browse all upcoming live sessions in one place with calendar and grid views.',
    icon: CalendarDays,
    route: '/all-live-sessions',
    colorClass: 'text-primary',
    bgClass: 'bg-primary/10 hover:bg-primary/20 border-primary/30',
  },
];

export default function DoorOfCommunion() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Profile Dropdown */}
      <div className="absolute top-4 right-4 z-20">
        <ProfileDropdown />
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <PageBreadcrumb items={[{ label: 'Door of Communion' }]} />
        </div>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-serif mb-2">The Door of Communion</h1>
          <p className="text-muted-foreground font-sans">
            Connect with our community through live sessions, readings, and interactive experiences.
          </p>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {categories.map((category, index) => {
            const Icon = category.icon;
            return (
              <motion.button
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                onClick={() => navigate(category.route)}
                className={cn(
                  'p-6 rounded-lg border text-left transition-all duration-300',
                  'hover:shadow-lg hover:scale-[1.02]',
                  category.bgClass
                )}
              >
                <Icon className={cn('h-10 w-10 mb-4', category.colorClass)} />
                <h2 className="text-xl font-serif mb-2">{category.title}</h2>
                <p className="text-muted-foreground font-sans text-sm">
                  {category.description}
                </p>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
