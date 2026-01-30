import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarDays, LayoutGrid, CalendarX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMyRegisteredSessions, LiveSession } from '@/hooks/useLiveSessions';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import ProfileDropdown from '@/components/ProfileDropdown';
import { LiveSessionCard } from '@/components/live-sessions/LiveSessionCard';
import { SessionCalendar } from '@/components/live-sessions/SessionCalendar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { getSessionTypeConfig } from '@/lib/sessionTypeConfig';

const MyCalendar = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<LiveSession | null>(null);
  const { sessions, isLoading, cancelRegistration, isCancelling } = useMyRegisteredSessions();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-serif text-xl">
          Loading your calendar...
        </div>
      </div>
    );
  }

  const hasRegistrations = sessions && sessions.length > 0;

  return (
    <div className="min-h-screen bg-background py-12 px-4 relative">
      {/* Navigation Header */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
        <PageBreadcrumb items={[{ label: 'My Calendar' }]} />
        <ProfileDropdown />
      </div>

      <div className="max-w-6xl mx-auto pt-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
            My Calendar
          </h1>
          <p className="text-muted-foreground font-sans text-lg max-w-2xl mx-auto">
            Your upcoming registered sessions and events.
          </p>
        </motion.div>

        {hasRegistrations ? (
          <>
            <Tabs defaultValue="calendar" className="w-full">
              <div className="flex justify-center mb-8">
                <TabsList>
                  <TabsTrigger value="calendar" className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" />
                    Calendar
                  </TabsTrigger>
                  <TabsTrigger value="grid" className="flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4" />
                    Grid
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="calendar">
                <SessionCalendar 
                  sessions={sessions || []} 
                  onSessionClick={setSelectedSession}
                />
              </TabsContent>

              <TabsContent value="grid">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sessions?.map((session, index) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                    >
                      <LiveSessionCard
                        session={session}
                        onRegister={() => {}}
                        onCancel={() => cancelRegistration(session.id)}
                        onJoin={() => navigate(`/all-live-sessions/${session.id}/join`)}
                        isRegistering={false}
                        isCancelling={isCancelling}
                      />
                    </motion.div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            {/* Session Detail Dialog */}
            <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
              <DialogContent className="max-w-md">
                {selectedSession && (() => {
                  const config = getSessionTypeConfig(selectedSession.session_type);
                  const Icon = config.icon;
                  const scheduledDate = new Date(selectedSession.scheduled_at);
                  const isLive = selectedSession.status === 'live';

                  return (
                    <>
                      <DialogHeader>
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className={`w-5 h-5 ${config.textColor}`} />
                          <span className={`text-sm ${config.textColor}`}>{config.label}</span>
                        </div>
                        <DialogTitle className="font-serif text-xl">
                          {selectedSession.title}
                        </DialogTitle>
                        <DialogDescription>
                          {format(scheduledDate, 'EEEE, MMMM d, yyyy')} at {format(scheduledDate, 'h:mm a')}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        {selectedSession.description && (
                          <p className="text-muted-foreground text-sm">
                            {selectedSession.description}
                          </p>
                        )}
                        <div className="flex gap-2">
                          {isLive && (
                            <Button 
                              onClick={() => navigate(`/all-live-sessions/${selectedSession.id}/join`)}
                              className="flex-1"
                            >
                              Join Now
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            onClick={() => {
                              cancelRegistration(selectedSession.id);
                              setSelectedSession(null);
                            }}
                            disabled={isCancelling}
                          >
                            Cancel Registration
                          </Button>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center py-16"
          >
            <CalendarX className="w-16 h-16 mx-auto text-muted-foreground/50 mb-6" />
            <h2 className="font-serif text-2xl text-foreground mb-3">
              No Upcoming Sessions
            </h2>
            <p className="text-muted-foreground font-sans mb-6 max-w-md mx-auto">
              You haven't registered for any upcoming sessions yet. Browse available sessions to find something that resonates with you.
            </p>
            <button
              onClick={() => navigate('/all-live-sessions')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-sans transition-colors hover:bg-primary/90"
            >
              <CalendarDays className="w-4 h-4" />
              Browse Sessions
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default MyCalendar;
