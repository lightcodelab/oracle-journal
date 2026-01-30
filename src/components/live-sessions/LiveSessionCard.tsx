import { format } from 'date-fns';
import { Calendar, Clock, Users, Video, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

  const getCalendarUrls = () => {
    const startDate = new Date(session.scheduled_at);
    const endDate = new Date(startDate.getTime() + session.duration_minutes * 60000);
    
    const formatGoogleDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const title = encodeURIComponent(session.title);
    const description = encodeURIComponent(session.description || 'Live session at Temple of Sustainment');
    const location = encodeURIComponent(window.location.origin + '/live-sessions/' + session.id);

    // Google Calendar
    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}&details=${description}&location=${location}`;

    // Outlook Web
    const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${startDate.toISOString()}&enddt=${endDate.toISOString()}&body=${description}&location=${location}`;

    // Yahoo Calendar
    const yahooUrl = `https://calendar.yahoo.com/?v=60&title=${title}&st=${formatGoogleDate(startDate)}&et=${formatGoogleDate(endDate)}&desc=${description}&in_loc=${location}`;

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

  const { googleUrl, outlookUrl, yahooUrl } = getCalendarUrls();

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
