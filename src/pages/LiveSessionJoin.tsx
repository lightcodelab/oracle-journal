import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ZoomMeetingPlayer } from '@/components/live-sessions/ZoomMeetingPlayer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Clock, CalendarDays, Lock, Video } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { format, differenceInMinutes, differenceInSeconds } from 'date-fns';
import { useState, useEffect } from 'react';
import { getSessionTypeConfig } from '@/lib/sessionTypeConfig';
import { SessionType } from '@/hooks/useLiveSessions';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const EARLY_ACCESS_MINUTES = 15;

export default function LiveSessionJoin() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [now, setNow] = useState(new Date());

  // Update time every second for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch session details
  const { data: session, isLoading: sessionLoading, error: sessionError } = useQuery({
    queryKey: ['live-session', sessionId],
    enabled: !!sessionId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Check if user is registered
  const { data: registration, isLoading: registrationLoading } = useQuery({
    queryKey: ['session-registration', sessionId, user?.id],
    enabled: !!sessionId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_registrations')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', user!.id)
        .eq('status', 'registered')
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const isLoading = sessionLoading || registrationLoading;

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Lock className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
          <h1 className="font-serif text-2xl mb-2">Sign In Required</h1>
          <p className="text-muted-foreground font-sans mb-6">
            Please sign in to join this session.
          </p>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground font-sans">Loading session...</p>
        </div>
      </div>
    );
  }

  if (sessionError || !session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <CalendarDays className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
          <h1 className="font-serif text-2xl mb-2">Session Not Found</h1>
          <p className="text-muted-foreground font-sans mb-6">
            This session doesn't exist or may have been removed.
          </p>
          <Button onClick={() => navigate('/all-live-sessions')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Browse Sessions
          </Button>
        </div>
      </div>
    );
  }

  // Check if user is registered
  if (!registration) {
    const config = getSessionTypeConfig(session.session_type as SessionType);
    const Icon = config.icon;
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Lock className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
          <Badge className={cn('gap-1 mb-4', config.badgeClass)}>
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
          <h1 className="font-serif text-2xl mb-2">Registration Required</h1>
          <p className="text-muted-foreground font-sans mb-2">
            You need to register for this session to join.
          </p>
          <p className="font-serif text-lg mb-6">{session.title}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate('/all-live-sessions')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button onClick={() => navigate('/all-live-sessions')}>
              Register Now
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Check if Zoom meeting is configured
  if (!session.zoom_meeting_id) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Video className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
          <h1 className="font-serif text-2xl mb-2">Session Not Ready</h1>
          <p className="text-muted-foreground font-sans mb-6">
            This session is not yet configured. Please check back closer to the scheduled time.
          </p>
          <Button onClick={() => navigate('/all-live-sessions')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sessions
          </Button>
        </div>
      </div>
    );
  }

  // Calculate time until session
  const scheduledAt = new Date(session.scheduled_at);
  const earlyAccessTime = new Date(scheduledAt.getTime() - EARLY_ACCESS_MINUTES * 60 * 1000);
  const minutesUntilAccess = differenceInMinutes(earlyAccessTime, now);
  const secondsUntilAccess = differenceInSeconds(earlyAccessTime, now);
  const canJoin = now >= earlyAccessTime || session.status === 'live';

  // Waiting room - too early to join
  if (!canJoin) {
    const config = getSessionTypeConfig(session.session_type as SessionType);
    const Icon = config.icon;
    
    // Format countdown
    const hours = Math.floor(secondsUntilAccess / 3600);
    const minutes = Math.floor((secondsUntilAccess % 3600) / 60);
    const seconds = secondsUntilAccess % 60;
    
    let countdownText = '';
    if (hours > 0) {
      countdownText = `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      countdownText = `${minutes}m ${seconds}s`;
    } else {
      countdownText = `${seconds}s`;
    }

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-lg">
          <div className="mb-8">
            <Badge className={cn('gap-1 mb-4', config.badgeClass)}>
              <Icon className="h-3 w-3" />
              {config.label}
            </Badge>
            <h1 className="font-serif text-3xl mb-2">{session.title}</h1>
            {session.description && (
              <p className="text-muted-foreground font-sans">{session.description}</p>
            )}
          </div>

          <div className="bg-card border rounded-lg p-8 mb-6">
            <Clock className="h-12 w-12 mx-auto text-primary mb-4" />
            <h2 className="font-serif text-xl mb-2">Waiting Room</h2>
            <p className="text-muted-foreground font-sans mb-4">
              The session room will open {EARLY_ACCESS_MINUTES} minutes before the scheduled start time.
            </p>
            
            <div className="bg-muted/50 rounded-lg p-4 mb-4">
              <p className="text-sm text-muted-foreground mb-1">Session starts at</p>
              <p className="font-serif text-lg">
                {format(scheduledAt, 'EEEE, MMMM d')} at {format(scheduledAt, 'h:mm a')}
              </p>
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Room opens in</p>
              <p className="font-mono text-3xl font-bold text-primary">
                {countdownText}
              </p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            This page will automatically refresh when the room opens.
          </p>
          
          <Button variant="outline" onClick={() => navigate('/all-live-sessions')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sessions
          </Button>
        </div>
      </div>
    );
  }

  // User can join - show Zoom player
  return (
    <div className="min-h-screen bg-black">
      <ZoomMeetingPlayer
        sessionId={session.id}
        meetingNumber={session.zoom_meeting_id}
        onLeave={() => navigate('/all-live-sessions')}
      />
    </div>
  );
}
