import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface JournalCategory {
  id: string;
  user_id: string;
  name: string;
  normalized_name: string;
  color: string | null;
  emoji: string | null;
  description: string | null;
  is_system: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useJournalCategories() {
  return useQuery({
    queryKey: ['journal-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('journal_categories')
        .select('*')
        .is('archived_at', null)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as JournalCategory[];
    },
  });
}

export function useEntryCategories(entryId: string | undefined) {
  return useQuery({
    queryKey: ['entry-categories', entryId],
    queryFn: async () => {
      if (!entryId) return [];
      const { data, error } = await supabase
        .from('entry_categories')
        .select('*, journal_categories(*)')
        .eq('entry_id', entryId);

      if (error) throw error;
      return data;
    },
    enabled: !!entryId,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ name, color, emoji }: { name: string; color?: string; emoji?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const normalizedName = name.toLowerCase().trim();

      const { data, error } = await supabase
        .from('journal_categories')
        .insert({
          user_id: user.id,
          name: name.trim(),
          normalized_name: normalizedName,
          color: color || null,
          emoji: emoji || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as JournalCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-categories'] });
    },
    onError: (error) => {
      toast({
        title: 'Error creating category',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useAssignCategoryToEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, categoryId }: { entryId: string; categoryId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('entry_categories')
        .insert({
          entry_id: entryId,
          category_id: categoryId,
          added_by: user.id,
        });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['entry-categories', variables.entryId] });
    },
  });
}

export function useRemoveCategoryFromEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, categoryId }: { entryId: string; categoryId: string }) => {
      const { error } = await supabase
        .from('entry_categories')
        .delete()
        .eq('entry_id', entryId)
        .eq('category_id', categoryId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['entry-categories', variables.entryId] });
    },
  });
}
