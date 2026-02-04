import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SavedReading {
  id: string;
  user_id: string;
  card_id: string | null;
  deck_id: string | null;
  card_title: string;
  deck_name: string | null;
  image_file_name: string | null;
  notes: string | null;
  saved_at: string;
  created_at: string;
  updated_at: string;
}

export const useSavedReadings = () => {
  return useQuery({
    queryKey: ['saved-readings'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];

      const { data, error } = await supabase
        .from('saved_readings')
        .select('*')
        .eq('user_id', session.user.id)
        .order('saved_at', { ascending: false });

      if (error) {
        console.error('Error fetching saved readings:', error);
        throw error;
      }

      return data as SavedReading[];
    },
  });
};

export const useDeleteSavedReading = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (readingId: string) => {
      const { error } = await supabase
        .from('saved_readings')
        .delete()
        .eq('id', readingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-readings'] });
    },
  });
};

export const useUpdateReadingNotes = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from('saved_readings')
        .update({ notes })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-readings'] });
    },
  });
};
