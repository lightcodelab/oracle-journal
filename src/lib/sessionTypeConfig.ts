import { Sparkles, GraduationCap, Users } from 'lucide-react';
import { SessionType } from '@/hooks/useLiveSessions';

export interface SessionTypeConfig {
  label: string;
  icon: typeof Sparkles;
  bgColor: string;
  textColor: string;
  borderColor: string;
  badgeClass: string;
  calendarClass: string;
}

export const sessionTypeConfig: Record<SessionType, SessionTypeConfig> = {
  reading: {
    label: 'Live Reading',
    icon: Sparkles,
    bgColor: 'bg-purple-500/20',
    textColor: 'text-purple-400',
    borderColor: 'border-purple-500/30',
    badgeClass: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    calendarClass: 'bg-purple-500/20 border-l-4 border-l-purple-500 hover:bg-purple-500/30',
  },
  class: {
    label: 'Live Class',
    icon: GraduationCap,
    bgColor: 'bg-amber-500/20',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/30',
    badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    calendarClass: 'bg-amber-500/20 border-l-4 border-l-amber-500 hover:bg-amber-500/30',
  },
  workshop: {
    label: 'Live Workshop',
    icon: Users,
    bgColor: 'bg-emerald-500/20',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    calendarClass: 'bg-emerald-500/20 border-l-4 border-l-emerald-500 hover:bg-emerald-500/30',
  },
};

export function getSessionTypeConfig(type: SessionType | undefined): SessionTypeConfig {
  return sessionTypeConfig[type || 'class'];
}
