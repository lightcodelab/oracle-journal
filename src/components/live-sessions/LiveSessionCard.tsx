import { format, differenceInMinutes } from 'date-fns';
import { Calendar, Clock, Users, Video, ChevronDown, DoorOpen, Play, Square, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LiveSession } from '@/hooks/useLiveSessions';
import { useAuth } from '@/hooks/useAuth';
import { getSessionTypeConfig } from '@/lib/sessionTypeConfig';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const EARLY_ACCESS_MINUTES = 15;

interface LiveSessionCardProps {
  session: LiveSession;
  onRegister: () => void;
  onCancel: () => void;
  onJoin: () => void;
  isRegistering: boolean;
  isCancelling: boolean;
}

export function LiveSessionCard({
  session,
  onRegister,
  onCancel,
  onJoin,
  isRegistering,
  isCancelling,
}: LiveSessionCardProps) {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const now = new Date();
  const scheduledDate = new Date(session.scheduled_at);
  const isUpcoming = scheduledDate > now;
  const isLive = session.status === 'live';
  const isScheduled = session.status === 'scheduled';
  const isFull = (session.registrations_count || 0) >= session.capacity;
  const isRegistered = session.user_registration?.status === 'registered';
  const isWaitlisted = session.user_registration?.status === 'waitlist';
  
  // Check if within early access window (15 minutes before start)
  const minutesUntilStart = differenceInMinutes(scheduledDate, now);
  const canEnterWaitingRoom = isRegistered && minutesUntilStart <= EARLY_ACCESS_MINUTES && minutesUntilStart > 0 && !isLive;

  // Admin mutation to update session status
  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase
        .from('live_sessions')
        .update({ status })
        .eq('id', session.id);

      if (error) throw error;
    },
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ['live-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-live-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['my-registered-sessions'] });
      
      if (status === 'live') {
        toast.success('Session is now LIVE!');
      } else if (status === 'completed') {
        toast.success('Session ended');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleStartMeeting = () => {
    updateStatusMutation.mutate('live');
    // Also join the meeting as admin
    onJoin();
  };

  const handleEndMeeting = () => {
    updateStatusMutation.mutate('completed');
  };

  const getCalendarUrls = () => {
    const startDate = new Date(session.scheduled_at);
    const endDate = new Date(startDate.getTime() + session.duration_minutes * 60000);
    
    const formatGoogleDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const title = encodeURIComponent(session.title);
    const description = encodeURIComponent(session.description || 'Live session at Temple of Sustainment');
    const sessionJoinUrl = window.location.origin + '/all-live-sessions/' + session.id + '/join';

    // Google Calendar
    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}&details=${description}&location=${encodeURIComponent(sessionJoinUrl)}`;

    // Outlook Web
    const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${startDate.toISOString()}&enddt=${endDate.toISOString()}&body=${description}&location=${encodeURIComponent(sessionJoinUrl)}`;

    // Yahoo Calendar
    const yahooUrl = `https://calendar.yahoo.com/?v=60&title=${title}&st=${formatGoogleDate(startDate)}&et=${formatGoogleDate(endDate)}&desc=${description}&in_loc=${encodeURIComponent(sessionJoinUrl)}`;

    return { googleUrl, outlookUrl, yahooUrl };
  };

  const downloadIcsFile = () => {
    const startDate = new Date(session.scheduled_at);
    const endDate = new Date(startDate.getTime() + session.duration_minutes * 60000);
    
    const formatIcsDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Temple of Sustainment//Live Session//EN
BEGIN:VEVENT
UID:${session.id}@templeofsustainment.com
DTSTAMP:${formatIcsDate(new Date())}
DTSTART:${formatIcsDate(startDate)}
DTEND:${formatIcsDate(endDate)}
SUMMARY:${session.title}
DESCRIPTION:${session.description || 'Live session at Temple of Sustainment'}
URL:${window.location.origin}/all-live-sessions/${session.id}/join
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${session.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const { googleUrl, outlookUrl, yahooUrl } = getCalendarUrls();

  return (
    <Card className="relative overflow-hidden">
      {isLive && (
        <div className="absolute top-0 left-0 right-0 bg-red-500 text-white text-center py-1 text-sm font-medium animate-pulse">
          🔴 LIVE NOW
        </div>
      )}
      {canEnterWaitingRoom && (
        <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-center py-1 text-sm font-medium">
          🚪 Room Open — Starts in {minutesUntilStart} min
        </div>
      )}
      
      <CardHeader className={isLive || canEnterWaitingRoom ? 'pt-10' : ''}>
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1">
            {/* Session Type Badge */}
            {(() => {
              const config = getSessionTypeConfig(session.session_type);
              const TypeIcon = config.icon;
              return (
                <Badge className={cn('gap-1 mb-2', config.badgeClass)}>
                  <TypeIcon className="h-3 w-3" />
                  {config.label}
                </Badge>
              );
            })()}
            <CardTitle className="text-xl font-serif">{session.title}</CardTitle>
            <CardDescription className="mt-2 font-sans">
              {session.description}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-1 items-end">
            {isRegistered && <Badge variant="default">Registered</Badge>}
            {isWaitlisted && <Badge variant="secondary">Waitlist</Badge>}
            {isFull && !isRegistered && !isWaitlisted && (
              <Badge variant="destructive">Full</Badge>
            )}
            {/* Admin badge */}
            {isAdmin && (
              <Badge variant="outline" className="text-xs">
                Admin
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{format(scheduledDate, 'EEEE, MMMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{format(scheduledDate, 'h:mm a')} ({session.duration_minutes} min)</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{session.registrations_count || 0} / {session.capacity} registered</span>
          </div>
        </div>

        {/* Admin Controls */}
        {isAdmin && (
          <div className="flex flex-wrap gap-2 pt-2 pb-2 border-t border-b border-dashed">
            {isScheduled && (
              <Button 
                onClick={handleStartMeeting} 
                className="bg-green-600 hover:bg-green-700"
                disabled={updateStatusMutation.isPending}
              >
                <Play className="h-4 w-4 mr-2" />
                Start Meeting
              </Button>
            )}
            {isLive && (
              <>
                <Button 
                  onClick={onJoin}
                  className="bg-red-500 hover:bg-red-600"
                >
                  <Video className="h-4 w-4 mr-2" />
                  Join as Host
                </Button>
                <Button 
                  onClick={handleEndMeeting}
                  variant="outline"
                  disabled={updateStatusMutation.isPending}
                >
                  <Square className="h-4 w-4 mr-2" />
                  End Session
                </Button>
              </>
            )}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/admin/live-sessions')}
            >
              <Settings className="h-4 w-4 mr-1" />
              Manage
            </Button>
          </div>
        )}

        {/* User Controls */}
        <div className="flex flex-wrap gap-2 pt-2">
          {!user ? (
            <Button variant="outline" disabled>
              Sign in to register
            </Button>
          ) : isLive && isRegistered ? (
            <Button onClick={onJoin} className="bg-red-500 hover:bg-red-600">
              <Video className="h-4 w-4 mr-2" />
              Join Session
            </Button>
          ) : canEnterWaitingRoom ? (
            <>
              <Button onClick={onJoin} variant="default">
                <DoorOpen className="h-4 w-4 mr-2" />
                Enter Waiting Room
              </Button>
              <Button 
                variant="ghost" 
                onClick={onCancel}
                disabled={isCancelling}
              >
                Cancel
              </Button>
            </>
          ) : isRegistered ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Calendar className="h-4 w-4 mr-2" />
                    Add to Calendar
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => window.open(googleUrl, '_blank')}>
                    Google Calendar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.open(outlookUrl, '_blank')}>
                    Outlook
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.open(yahooUrl, '_blank')}>
                    Yahoo Calendar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={downloadIcsFile}>
                    Download .ics file
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button 
                variant="ghost" 
                onClick={onCancel}
                disabled={isCancelling}
              >
                Cancel Registration
              </Button>
            </>
          ) : isWaitlisted ? (
            <Button 
              variant="ghost" 
              onClick={onCancel}
              disabled={isCancelling}
            >
              Leave Waitlist
            </Button>
          ) : isUpcoming ? (
            <Button 
              onClick={onRegister}
              disabled={isRegistering}
            >
              {isFull ? 'Join Waitlist' : 'Register'}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
