import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

export interface JournalEntry {
  id: string;
  user_id: string;
  title: string | null;
  content_json: Json;
  content_text: string;
  is_quick_capture: boolean;
  is_pinned: boolean;
  revisit_count: number;
  last_revisited_at: string | null;
  captured_at: string;
  updated_at: string;
  deleted_at: string | null;
  version: number;
  context_type: string | null;
  context_id: string | null;
  context_title: string | null;
}

export interface CreateEntryData {
  title?: string;
  content_json?: Json;
  content_text?: string;
  is_quick_capture?: boolean;
  context_type?: string;
  context_id?: string;
  context_title?: string;
}

export interface UpdateEntryData {
  title?: string;
  content_json?: Json;
  content_text?: string;
  is_pinned?: boolean;
}

export function useJournalEntries(options?: {
  contextType?: string;
  contextId?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['journal-entries', options],
    queryFn: async () => {
      let query = supabase
        .from('journal_entries')
        .select('*')
        .is('deleted_at', null)
        .order('captured_at', { ascending: false });

      if (options?.contextType && options?.contextId) {
        query = query
          .eq('context_type', options.contextType)
          .eq('context_id', options.contextId);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as JournalEntry[];
    },
  });
}

export function useJournalEntry(entryId: string | undefined) {
  return useQuery({
    queryKey: ['journal-entry', entryId],
    queryFn: async () => {
      if (!entryId) return null;
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('id', entryId)
        .single();
      if (error) throw error;
      return data as JournalEntry;
    },
    enabled: !!entryId,
  });
}

export function useCreateJournalEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateEntryData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const insertData = {
        user_id: user.id,
        title: data.title || null,
        content_json: data.content_json || {},
        content_text: data.content_text || '',
        is_quick_capture: data.is_quick_capture ?? true,
        context_type: data.context_type || null,
        context_id: data.context_id || null,
        context_title: data.context_title || null,
      };

      const { data: entry, error } = await supabase
        .from('journal_entries')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return entry as JournalEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast({
        title: 'Entry created',
        description: 'Your journal entry has been saved.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateJournalEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateEntryData & { id: string }) => {
      const updateData: Record<string, unknown> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.content_json !== undefined) updateData.content_json = data.content_json;
      if (data.content_text !== undefined) updateData.content_text = data.content_text;
      if (data.is_pinned !== undefined) updateData.is_pinned = data.is_pinned;

      const { data: entry, error } = await supabase
        .from('journal_entries')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return entry as JournalEntry;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entry', data.id] });
    },
    onError: (error) => {
      toast({
        title: 'Error saving',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteJournalEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete
      const { error } = await supabase
        .from('journal_entries')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast({
        title: 'Entry deleted',
        description: 'Your journal entry has been removed.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useTogglePinEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from('journal_entries')
        .update({ is_pinned: isPinned })
        .eq('id', id);

      if (error) throw error;
      return { id, isPinned };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
    },
  });
}
