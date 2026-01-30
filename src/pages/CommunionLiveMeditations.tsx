import { Loader2 } from 'lucide-react';
import { useLiveSessionsByType } from '@/hooks/useLiveSessions';
import { LiveSessionCard } from '@/components/live-sessions/LiveSessionCard';
import { useNavigate } from 'react-router-dom';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import ProfileDropdown from '@/components/ProfileDropdown';
import { getSessionTypeConfig } from '@/lib/sessionTypeConfig';
import { cn } from '@/lib/utils';

export default function CommunionLiveMeditations() {
  const navigate = useNavigate();
  const config = getSessionTypeConfig('meditation');
  const Icon = config.icon;
  
  const { 
    sessions, 
    isLoading, 
    register, 
    cancelRegistration, 
    isRegistering, 
    isCancelling 
  } = useLiveSessionsByType('meditation');

  return (
    <div className="min-h-screen bg-background py-12 px-4 relative">
      {/* Navigation Header */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
        <PageBreadcrumb items={[
          { label: 'Door of Communion', href: '/communion' },
          { label: 'Live Meditation Classes' }
        ]} />
        <ProfileDropdown />
      </div>

      <div className="max-w-4xl mx-auto pt-8">
        <div className="mb-8">
          <h1 className="text-3xl font-serif flex items-center gap-3 mb-2">
            <Icon className={cn('h-8 w-8', config.textColor)} />
            Live Meditation Classes
          </h1>
          <p className="text-muted-foreground font-sans">
            Join guided meditation sessions for inner peace and spiritual connection.
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
                onJoin={() => navigate(`/all-live-sessions/${session.id}/join`)}
                isRegistering={isRegistering}
                isCancelling={isCancelling}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border rounded-lg">
            <Icon className={cn('h-16 w-16 mx-auto mb-4', config.textColor)} />
            <h2 className="text-xl font-serif mb-2">No live meditation classes scheduled</h2>
            <p className="text-muted-foreground font-sans">
              Check back soon for upcoming guided meditation sessions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
