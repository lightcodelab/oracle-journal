import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Calendar } from 'lucide-react';
import { useLiveSessions } from '@/hooks/useLiveSessions';
import { LiveSessionCard } from '@/components/live-sessions/LiveSessionCard';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';

export default function LiveSessions() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { 
    sessions, 
    isLoading, 
    register, 
    cancelRegistration,
    isRegistering,
    isCancelling,
  } = useLiveSessions();

  const handleJoinSession = (sessionId: string, meetingNumber: string) => {
    navigate(`/live-sessions/${sessionId}/join`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-serif flex items-center gap-3">
              <Video className="h-8 w-8 text-primary" />
              Live Sessions
            </h1>
            <p className="text-muted-foreground font-sans mt-2">
              Join live video sessions with our community
            </p>
          </div>
          
          {isAdmin && (
            <Button onClick={() => navigate('/admin/live-sessions')}>
              <Calendar className="h-4 w-4 mr-2" />
              Manage Sessions
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        ) : sessions && sessions.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session) => (
              <LiveSessionCard
                key={session.id}
                session={session}
                onRegister={() => register(session.id)}
                onCancel={() => cancelRegistration(session.id)}
                onJoin={() => handleJoinSession(session.id, session.zoom_meeting_id!)}
                isRegistering={isRegistering}
                isCancelling={isCancelling}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Video className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-serif mb-2">No upcoming sessions</h2>
            <p className="text-muted-foreground font-sans">
              Check back later for scheduled live sessions
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
