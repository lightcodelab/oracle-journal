import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface JournalTag {
  id: string;
  user_id: string;
  name: string;
  normalized_name: string;
  color: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface EntryTag {
  entry_id: string;
  tag_id: string;
  user_id: string;
  created_at: string;
}

export function useJournalTags() {
  return useQuery({
    queryKey: ['journal-tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('journal_tags')
        .select('*')
        .eq('is_archived', false)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as JournalTag[];
    },
  });
}

export function useEntryTags(entryId: string | undefined) {
  return useQuery({
    queryKey: ['entry-tags', entryId],
    queryFn: async () => {
      if (!entryId) return [];
      const { data, error } = await supabase
        .from('entry_tags')
        .select('*, journal_tags(*)')
        .eq('entry_id', entryId);

      if (error) throw error;
      return data;
    },
    enabled: !!entryId,
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ name, color }: { name: string; color?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const normalizedName = name.toLowerCase().trim();

      const { data, error } = await supabase
        .from('journal_tags')
        .insert({
          user_id: user.id,
          name: name.trim(),
          normalized_name: normalizedName,
          color: color || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as JournalTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-tags'] });
    },
    onError: (error) => {
      toast({
        title: 'Error creating tag',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useAssignTagToEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, tagId }: { entryId: string; tagId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('entry_tags')
        .insert({
          entry_id: entryId,
          tag_id: tagId,
          user_id: user.id,
        });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['entry-tags', variables.entryId] });
    },
  });
}

export function useRemoveTagFromEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, tagId }: { entryId: string; tagId: string }) => {
      const { error } = await supabase
        .from('entry_tags')
        .delete()
        .eq('entry_id', entryId)
        .eq('tag_id', tagId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['entry-tags', variables.entryId] });
    },
  });
}
