import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface LiveSession {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  capacity: number;
  zoom_meeting_id: string | null;
  zoom_join_url: string | null;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  created_at: string;
  registrations_count?: number;
  user_registration?: {
    id: string;
    status: string;
  } | null;
}

export interface SessionRegistration {
  id: string;
  session_id: string;
  user_id: string;
  status: 'registered' | 'waitlist' | 'attended' | 'cancelled';
  registered_at: string;
  calendar_added: boolean;
}

export function useLiveSessions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['live-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_sessions')
        .select('*')
        .in('status', ['scheduled', 'live'])
        .order('scheduled_at', { ascending: true });

      if (error) throw error;

      // Get registration counts and user registration status
      const sessionsWithDetails = await Promise.all(
        (data || []).map(async (session) => {
          const { count } = await supabase
            .from('session_registrations')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session.id)
            .eq('status', 'registered');

          let userRegistration = null;
          if (user) {
            const { data: regData } = await supabase
              .from('session_registrations')
              .select('id, status')
              .eq('session_id', session.id)
              .eq('user_id', user.id)
              .single();
            userRegistration = regData;
          }

          return {
            ...session,
            registrations_count: count || 0,
            user_registration: userRegistration,
          };
        })
      );

      return sessionsWithDetails as LiveSession[];
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      if (!user) throw new Error('Must be logged in');

      // Check capacity
      const session = sessions?.find(s => s.id === sessionId);
      if (!session) throw new Error('Session not found');

      const status = (session.registrations_count || 0) >= session.capacity 
        ? 'waitlist' 
        : 'registered';

      const { data, error } = await supabase
        .from('session_registrations')
        .insert({
          session_id: sessionId,
          user_id: user.id,
          status,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['live-sessions'] });
      if (data.status === 'waitlist') {
        toast.info('Added to waitlist - we\'ll notify you if a spot opens');
      } else {
        toast.success('Successfully registered for the session!');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const cancelRegistrationMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      if (!user) throw new Error('Must be logged in');

      const { error } = await supabase
        .from('session_registrations')
        .update({ status: 'cancelled' })
        .eq('session_id', sessionId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-sessions'] });
      toast.success('Registration cancelled');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    sessions,
    isLoading,
    register: registerMutation.mutate,
    cancelRegistration: cancelRegistrationMutation.mutate,
    isRegistering: registerMutation.isPending,
    isCancelling: cancelRegistrationMutation.isPending,
  };
}

export function useMyRegistrations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-registrations', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_registrations')
        .select(`
          *,
          live_sessions (*)
        `)
        .eq('user_id', user!.id)
        .neq('status', 'cancelled')
        .order('registered_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}
