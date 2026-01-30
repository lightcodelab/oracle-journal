import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEncryption } from '@/hooks/useEncryption';
import type { EncryptedField } from '@/lib/encryption';

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
  // Encrypted fields
  notes_encrypted?: unknown | null;
  is_encrypted?: boolean;
}

export const useSavedReadings = () => {
  const { isUnlocked, decryptText } = useEncryption();

  return useQuery({
    queryKey: ['saved-readings', isUnlocked],
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

      const readings = data as SavedReading[];

      // Decrypt notes if encryption is unlocked
      if (isUnlocked) {
        const decryptedReadings = await Promise.all(
          readings.map(async (reading) => {
            if (!reading.is_encrypted || !reading.notes_encrypted) return reading;
            try {
              const decryptedNotes = await decryptText(
                reading.notes_encrypted as unknown as EncryptedField
              );
              return { ...reading, notes: decryptedNotes };
            } catch (error) {
              console.error('Failed to decrypt reading notes:', reading.id, error);
              return { ...reading, notes: '[Unable to decrypt]' };
            }
          })
        );
        return decryptedReadings;
      }

      // Show placeholder for encrypted notes if not unlocked
      return readings.map(reading => {
        if (reading.is_encrypted) {
          return { ...reading, notes: reading.notes_encrypted ? '[Encrypted - unlock to view]' : null };
        }
        return reading;
      });
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
  const { isUnlocked, encryptText } = useEncryption();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      let updateData: Record<string, unknown> = { notes };

      // Encrypt notes if encryption is unlocked
      if (isUnlocked && notes) {
        const encryptedNotes = await encryptText(notes);
        updateData = {
          notes: '', // Clear plaintext
          notes_encrypted: encryptedNotes,
          is_encrypted: true,
        };
      }

      const { error } = await supabase
        .from('saved_readings')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-readings'] });
    },
  });
};
