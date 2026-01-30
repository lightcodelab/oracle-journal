import { format } from 'date-fns';
import { Calendar, Clock, Users, Video, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LiveSession } from '@/hooks/useLiveSessions';
import { useAuth } from '@/hooks/useAuth';

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
  const { user } = useAuth();
  const scheduledDate = new Date(session.scheduled_at);
  const isUpcoming = scheduledDate > new Date();
  const isLive = session.status === 'live';
  const isFull = (session.registrations_count || 0) >= session.capacity;
  const isRegistered = session.user_registration?.status === 'registered';
  const isWaitlisted = session.user_registration?.status === 'waitlist';

  const generateIcsFile = () => {
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
URL:${window.location.origin}/live-sessions/${session.id}
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

  return (
    <Card className="relative overflow-hidden">
      {isLive && (
        <div className="absolute top-0 left-0 right-0 bg-red-500 text-white text-center py-1 text-sm font-medium animate-pulse">
          🔴 LIVE NOW
        </div>
      )}
      
      <CardHeader className={isLive ? 'pt-10' : ''}>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl font-serif">{session.title}</CardTitle>
            <CardDescription className="mt-2 font-sans">
              {session.description}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {isRegistered && <Badge variant="default">Registered</Badge>}
            {isWaitlisted && <Badge variant="secondary">Waitlist</Badge>}
            {isFull && !isRegistered && !isWaitlisted && (
              <Badge variant="destructive">Full</Badge>
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
          ) : isRegistered ? (
            <>
              <Button variant="outline" onClick={generateIcsFile}>
                <Download className="h-4 w-4 mr-2" />
                Add to Calendar
              </Button>
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
