import { Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLiveSessionsByType } from '@/hooks/useLiveSessions';
import { LiveSessionCard } from '@/components/live-sessions/LiveSessionCard';
import { useNavigate } from 'react-router-dom';

export default function CommunionLiveReadings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    sessions, 
    isLoading, 
    register, 
    cancelRegistration, 
    isRegistering, 
    isCancelling 
  } = useLiveSessionsByType('reading');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-serif flex items-center gap-3 mb-2">
          <Sparkles className="h-8 w-8 text-primary" />
          Live Readings
        </h1>
        <p className="text-muted-foreground font-sans">
          Join live oracle card readings and receive guidance in real-time.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : sessions && sessions.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {sessions.map((session) => (
            <LiveSessionCard
              key={session.id}
              session={session}
              onRegister={() => register(session.id)}
              onCancel={() => cancelRegistration(session.id)}
              onJoin={() => navigate(`/live-sessions/${session.id}`)}
              isRegistering={isRegistering}
              isCancelling={isCancelling}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border rounded-lg">
          <Sparkles className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-serif mb-2">No live readings scheduled</h2>
          <p className="text-muted-foreground font-sans">
            Check back soon for upcoming live reading sessions.
          </p>
        </div>
      )}
    </div>
  );
}
