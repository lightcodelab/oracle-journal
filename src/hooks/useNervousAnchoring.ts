import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// New tables not in auto-generated types yet
const sb = supabase as any;

export interface AnchoringSession {
  id: string;
  user_id: string;
  duration_minutes: number;
  completed: boolean;
  reflection: string | null;
  created_at: string;
}

export interface AnchorMap {
  id: string;
  user_id: string;
  primary_anchor: string | null;
  secondary_anchors: string[];
  ratings: Record<string, number>;
  sensations: Record<string, string[]>;
  created_at: string;
}

export interface StabilityCheckin {
  id: string;
  user_id: string;
  entry_date: string;
  body_connection: number;
  regulation: number;
  truth_connection: number;
  capacity: number;
  score: number;
  created_at: string;
}

export interface WeeklyAnchoring {
  id: string;
  user_id: string;
  week_start: string;
  triggers: string[];
  body_response: string | null;
  best_tool: "orient" | "breath" | "anchor_point" | "truth" | null;
  truth: string | null;
  return_strategy: string | null;
  next_week_focus: string | null;
  created_at: string;
}

// ── Anchoring sessions ─────────────────────────────────────────────────────
export const useAnchoringSessions = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["nsa-sessions", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await sb
        .from("nervous_anchoring_sessions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as AnchoringSession[];
    },
  });
};

export const useSaveAnchoringSession = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (s: Partial<AnchoringSession>) => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await sb
        .from("nervous_anchoring_sessions")
        .insert({ ...s, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as AnchoringSession;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nsa-sessions"] }),
  });
};

// ── Anchor maps ────────────────────────────────────────────────────────────
export const useAnchorMaps = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["nsa-maps", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await sb
        .from("nervous_anchor_maps")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as AnchorMap[];
    },
  });
};

export const useSaveAnchorMap = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (m: Partial<AnchorMap>) => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await sb
        .from("nervous_anchor_maps")
        .insert({ ...m, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as AnchorMap;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nsa-maps"] }),
  });
};

// ── Stability check-ins ────────────────────────────────────────────────────
export const useStabilityCheckins = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["nsa-checkins", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await sb
        .from("nervous_stability_checkins")
        .select("*")
        .order("entry_date", { ascending: false });
      if (error) throw error;
      return (data || []) as StabilityCheckin[];
    },
  });
};

export const useSaveStabilityCheckin = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (c: Partial<StabilityCheckin>) => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await sb
        .from("nervous_stability_checkins")
        .insert({ ...c, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as StabilityCheckin;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nsa-checkins"] }),
  });
};

// ── Weekly logs ────────────────────────────────────────────────────────────
export const useWeeklyAnchoring = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["nsa-weekly", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await sb
        .from("nervous_anchoring_weekly")
        .select("*")
        .order("week_start", { ascending: false });
      if (error) throw error;
      return (data || []) as WeeklyAnchoring[];
    },
  });
};

export const useSaveWeeklyAnchoring = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (w: Partial<WeeklyAnchoring>) => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await sb
        .from("nervous_anchoring_weekly")
        .insert({ ...w, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as WeeklyAnchoring;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nsa-weekly"] }),
  });
};

// ── Helpers ────────────────────────────────────────────────────────────────
export const ANCHOR_BODY_AREAS = [
  "Head","Jaw","Throat","Chest","Sternum","Heart Space","Upper Back",
  "Lower Ribs","Solar Plexus","Belly","Pelvis","Sacrum","Hips","Thighs",
  "Knees","Calves","Feet","Hands",
] as const;

export const ANCHOR_SENSATIONS = [
  "Warm","Heavy","Grounded","Spacious","Open","Calm","Strong","Soft","Neutral",
] as const;

export const WEEKLY_TRIGGERS = [
  "Conflict","Uncertainty","Rejection","Pressure","Overwhelm","Time Stress",
  "People Pleasing","Boundaries","Family","Work","Health","Finances","Other",
] as const;

export const getMondayISO = (d = new Date()): string => {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // 0 = Monday
  date.setDate(date.getDate() - day);
  return date.toISOString().slice(0, 10);
};