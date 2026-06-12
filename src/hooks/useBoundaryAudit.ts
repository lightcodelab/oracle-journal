import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Cast helper — the new tables are not in the auto-generated supabase types yet.
const sb = supabase as any;

export interface BoundaryAuditEntry {
  id: string;
  user_id: string;
  situation: string | null;
  truth_status: "yes" | "no" | "unsure" | "need_more_info" | null;
  truth_text: string | null;
  body_signals: string[];
  body_first_response: string | null;
  abandonment_patterns: string[];
  abandonment_text: string | null;
  needed_boundary: string | null;
  next_time_script: string | null;
  relationship_category: string | null;
  integrity_rating: number | null;
  created_at: string;
}

export interface RehearsalScript {
  id: string;
  user_id: string;
  audit_entry_id: string | null;
  original_text: string | null;
  shorter_text: string | null;
  no_apology_text: string | null;
  no_overexplain_text: string | null;
  final_text: string | null;
  relationship_category: string | null;
  added_to_library: boolean;
  created_at: string;
}

export interface LibraryScript {
  id: string;
  user_id: string | null;
  category: string;
  text: string;
  is_seed: boolean;
  is_favourite: boolean;
  display_order: number;
  created_at: string;
}

export interface IntegrityReflection {
  id: string;
  user_id: string;
  status: "yes" | "mostly" | "partly" | "no" | "unsure" | null;
  held_text: string | null;
  wobbled_text: string | null;
  practise_text: string | null;
  resentment: number | null;
  communication: number | null;
  exhaustion: number | null;
  recovery_time:
    | "under_5m" | "5_15m" | "15_60m" | "1_4h" | "all_day" | "longer" | null;
  boundary_outcome: "held" | "wobbled" | "collapsed" | "repaired" | null;
  created_at: string;
}

export const RELATIONSHIP_CATEGORIES = [
  "Family", "Work", "Partners", "Clients", "Friends", "Strangers", "Community", "Other",
] as const;

// ── Audit entries ───────────────────────────────────────────────────────────
export const useAuditEntries = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["bia-audit", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await sb
        .from("boundary_audit_entries")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as BoundaryAuditEntry[];
    },
  });
};

export const useSaveAuditEntry = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (entry: Partial<BoundaryAuditEntry>) => {
      if (!user) throw new Error("Not signed in");
      const payload = { ...entry, user_id: user.id };
      const { data, error } = await sb
        .from("boundary_audit_entries")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as BoundaryAuditEntry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bia-audit"] });
    },
  });
};

// ── Rehearsal scripts ───────────────────────────────────────────────────────
export const useRehearsalScripts = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["bia-rehearsal", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await sb
        .from("boundary_rehearsal_scripts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as RehearsalScript[];
    },
  });
};

export const useSaveRehearsal = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (script: Partial<RehearsalScript>) => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await sb
        .from("boundary_rehearsal_scripts")
        .insert({ ...script, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as RehearsalScript;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bia-rehearsal"] }),
  });
};

// ── Script library ──────────────────────────────────────────────────────────
export const useScriptLibrary = () => {
  return useQuery({
    queryKey: ["bia-library"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("boundary_script_library")
        .select("*")
        .order("category")
        .order("display_order");
      if (error) throw error;
      return (data || []) as LibraryScript[];
    },
  });
};

export const useAddLibraryScript = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ category, text }: { category: string; text: string }) => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await sb
        .from("boundary_script_library")
        .insert({ user_id: user.id, category, text, is_seed: false })
        .select()
        .single();
      if (error) throw error;
      return data as LibraryScript;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bia-library"] }),
  });
};

export const useToggleFavourite = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (script: LibraryScript) => {
      if (!user) throw new Error("Not signed in");
      if (script.is_seed && script.user_id !== user.id) {
        // For seeded scripts, favourite by cloning to the user's library
        const { data, error } = await sb
          .from("boundary_script_library")
          .insert({
            user_id: user.id,
            category: script.category,
            text: script.text,
            is_seed: false,
            is_favourite: true,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await sb
        .from("boundary_script_library")
        .update({ is_favourite: !script.is_favourite })
        .eq("id", script.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bia-library"] }),
  });
};

export const useDeleteLibraryScript = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("boundary_script_library").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bia-library"] }),
  });
};

// ── Integrity reflections ───────────────────────────────────────────────────
export const useReflections = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["bia-reflections", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await sb
        .from("integrity_reflections")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as IntegrityReflection[];
    },
  });
};

export const useSaveReflection = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (r: Partial<IntegrityReflection>) => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await sb
        .from("integrity_reflections")
        .insert({ ...r, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as IntegrityReflection;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bia-reflections"] }),
  });
};