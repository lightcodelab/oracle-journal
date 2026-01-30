import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Calendar, LayoutGrid, CalendarDays } from 'lucide-react';
import { useLiveSessions, LiveSession } from '@/hooks/useLiveSessions';
import { LiveSessionCard } from '@/components/live-sessions/LiveSessionCard';
import { SessionCalendar } from '@/components/live-sessions/SessionCalendar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getSessionTypeConfig } from '@/lib/sessionTypeConfig';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function LiveSessions() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [viewMode, setViewMode] = useState<'grid' | 'calendar'>('grid');
  const [selectedSession, setSelectedSession] = useState<LiveSession | null>(null);
  
  const { 
    sessions, 
    isLoading, 
    register, 
    cancelRegistration,
    isRegistering,
    isCancelling,
  } = useLiveSessions();

  const handleJoinSession = (sessionId: string) => {
    navigate(`/all-live-sessions/${sessionId}/join`);
  };

  const handleSessionClick = (session: LiveSession) => {
    setSelectedSession(session);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <PageBreadcrumb items={[{ label: 'All Sessions' }]} />
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-serif flex items-center gap-3">
              <Video className="h-8 w-8 text-primary" />
              All Sessions
            </h1>
            <p className="text-muted-foreground font-sans mt-2">
              Browse and book live readings, classes, and workshops
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'calendar')}>
              <TabsList>
                <TabsTrigger value="grid" className="gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  <span className="hidden sm:inline">Grid</span>
                </TabsTrigger>
                <TabsTrigger value="calendar" className="gap-2">
                  <CalendarDays className="h-4 w-4" />
                  <span className="hidden sm:inline">Calendar</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {isAdmin && (
              <Button onClick={() => navigate('/admin/live-sessions')}>
                <Calendar className="h-4 w-4 mr-2" />
                Manage
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        ) : sessions && sessions.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {sessions.map((session) => (
                <LiveSessionCard
                  key={session.id}
                  session={session}
                  onRegister={() => register(session.id)}
                  onCancel={() => cancelRegistration(session.id)}
                  onJoin={() => handleJoinSession(session.id)}
                  isRegistering={isRegistering}
                  isCancelling={isCancelling}
                />
              ))}
            </div>
          ) : (
            <SessionCalendar 
              sessions={sessions} 
              onSessionClick={handleSessionClick} 
            />
          )
        ) : (
          <div className="text-center py-16">
            <Video className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-serif mb-2">No upcoming sessions</h2>
            <p className="text-muted-foreground font-sans">
              Check back later for scheduled live sessions
            </p>
          </div>
        )}

        {/* Session Detail Dialog (from calendar click) */}
        <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
          <DialogContent>
            {selectedSession && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2 mb-2">
                    {(() => {
                      const config = getSessionTypeConfig(selectedSession.session_type);
                      const Icon = config.icon;
                      return (
                        <Badge className={cn('gap-1', config.badgeClass)}>
                          <Icon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      );
                    })()}
                  </div>
                  <DialogTitle className="font-serif text-xl">
                    {selectedSession.title}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  {selectedSession.description && (
                    <p className="text-muted-foreground font-sans">
                      {selectedSession.description}
                    </p>
                  )}
                  
                  <div className="text-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <span>{format(new Date(selectedSession.scheduled_at), 'EEEE, MMMM d, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-muted-foreground" />
                      <span>{format(new Date(selectedSession.scheduled_at), 'h:mm a')} ({selectedSession.duration_minutes} min)</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    {selectedSession.user_registration?.status === 'registered' ? (
                      selectedSession.status === 'live' ? (
                        <Button onClick={() => handleJoinSession(selectedSession.id)} className="bg-red-500 hover:bg-red-600">
                          Join Now
                        </Button>
                      ) : (
                        <Button variant="outline" onClick={() => cancelRegistration(selectedSession.id)} disabled={isCancelling}>
                          Cancel Registration
                        </Button>
                      )
                    ) : (
                      <Button onClick={() => register(selectedSession.id)} disabled={isRegistering}>
                        {(selectedSession.registrations_count || 0) >= selectedSession.capacity ? 'Join Waitlist' : 'Register'}
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
