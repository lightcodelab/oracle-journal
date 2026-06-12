import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const k = (n: string, uid?: string) => ["em", n, uid];

export const useEM = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const uid = user?.id;

  const invalidate = (n: string) => qc.invalidateQueries({ queryKey: k(n, uid) });

  const useList = <T = any>(table: string, name: string, order = "created_at") =>
    useQuery({
      queryKey: k(name, uid),
      enabled: !!uid,
      queryFn: async () => {
        const { data, error } = await (supabase as any).from(table).select("*").eq("user_id", uid!).order(order, { ascending: false });
        if (error) throw error;
        return (data || []) as T[];
      },
    });

  const somatic = useList<any>("emotional_somatic_entries", "somatic");
  const nowThen = useList<any>("emotional_now_then_entries", "nowthen");
  const regulation = useList<any>("emotional_regulation_logs", "reglog");
  const translation = useList<any>("emotional_translation_entries", "translation");
  const weekly = useList<any>("emotional_weekly_reflections", "weekly");
  const capacity = useList<any>("emotional_capacity_checkins", "capacity");
  const recovery = useList<any>("emotional_recovery_logs", "recovery");

  const mk = (table: string, name: string) =>
    useMutation({
      mutationFn: async (payload: any) => {
        if (!uid) throw new Error("Not signed in");
        const { data, error } = await (supabase as any).from(table).insert({ ...payload, user_id: uid }).select().single();
        if (error) throw error;
        return data;
      },
      onSuccess: () => invalidate(name),
    });

  const update = (table: string, name: string) =>
    useMutation({
      mutationFn: async ({ id, ...payload }: any) => {
        const { data, error } = await (supabase as any).from(table).update(payload).eq("id", id).select().single();
        if (error) throw error;
        return data;
      },
      onSuccess: () => invalidate(name),
    });

  return {
    uid,
    somatic,
    nowThen,
    regulation,
    translation,
    weekly,
    capacity,
    recovery,
    saveSomatic: mk("emotional_somatic_entries", "somatic"),
    saveNowThen: mk("emotional_now_then_entries", "nowthen"),
    saveRegulation: mk("emotional_regulation_logs", "reglog"),
    saveTranslation: mk("emotional_translation_entries", "translation"),
    saveWeekly: mk("emotional_weekly_reflections", "weekly"),
    saveCapacity: mk("emotional_capacity_checkins", "capacity"),
    saveRecovery: mk("emotional_recovery_logs", "recovery"),
    updateRecovery: update("emotional_recovery_logs", "recovery"),
  };
};