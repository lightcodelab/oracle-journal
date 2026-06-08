import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ToolFieldType =
  | "text" | "textarea" | "slider" | "dropdown"
  | "multiselect" | "radio" | "yes_no" | "yes_partial_no";

export interface ToolField {
  id: string;
  tool_id: string;
  order_index: number;
  key: string;
  label: string;
  helper_text: string | null;
  field_type: ToolFieldType;
  options: any;
  min: number | null;
  max: number | null;
  min_label: string | null;
  max_label: string | null;
  is_required: boolean;
  contributes_to_score: boolean;
}

export interface ScoreFormula {
  type: "single" | "average" | "ordinal" | "none";
  field?: string;
  fields?: string[];
  max?: number;
}

export interface TransformationTool {
  id: string;
  slug: string;
  title: string;
  short_description: string | null;
  purpose: string | null;
  when_to_use: string | null;
  intro_microcopy: string | null;
  save_button_label: string;
  icon_name: string | null;
  display_order: number;
  is_published: boolean;
  score_formula: ScoreFormula;
  recommended_resource_ids: string[];
}

export interface TransformationEntry {
  id: string;
  user_id: string;
  tool_id: string;
  answers_json: Record<string, any>;
  scores_json: { primary?: number; breakdown?: Record<string, number> };
  linked_card_id: string | null;
  linked_course_id: string | null;
  linked_symptom_pathway: string | null;
  created_at: string;
}

export const useTransformationTools = (includeUnpublished = false) =>
  useQuery({
    queryKey: ["tt-tools", includeUnpublished],
    queryFn: async () => {
      const q = supabase.from("transformation_tools").select("*").order("display_order");
      const { data, error } = includeUnpublished ? await q : await q.eq("is_published", true);
      if (error) throw error;
      return (data || []) as unknown as TransformationTool[];
    },
  });

export const useTransformationTool = (slug: string | undefined) =>
  useQuery({
    queryKey: ["tt-tool", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transformation_tools").select("*").eq("slug", slug!).maybeSingle();
      if (error) throw error;
      return data as unknown as TransformationTool | null;
    },
  });

export const useToolFields = (toolId: string | undefined) =>
  useQuery({
    queryKey: ["tt-fields", toolId],
    enabled: !!toolId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transformation_tool_fields").select("*")
        .eq("tool_id", toolId!).order("order_index");
      if (error) throw error;
      return (data || []) as unknown as ToolField[];
    },
  });

export const useToolEntries = (toolId: string | undefined, userId: string | undefined) =>
  useQuery({
    queryKey: ["tt-entries", toolId, userId],
    enabled: !!toolId && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transformation_entries").select("*")
        .eq("tool_id", toolId!).eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as TransformationEntry[];
    },
  });

export const useAllUserEntries = (userId: string | undefined, limit = 50) =>
  useQuery({
    queryKey: ["tt-all-entries", userId, limit],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transformation_entries").select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false }).limit(limit);
      if (error) throw error;
      return (data || []) as unknown as TransformationEntry[];
    },
  });

export const computeScore = (
  formula: ScoreFormula,
  answers: Record<string, any>,
  fields: ToolField[],
): { primary?: number; breakdown?: Record<string, number> } => {
  if (!formula || formula.type === "none") return {};
  if (formula.type === "single" && formula.field) {
    const v = Number(answers[formula.field]);
    return isNaN(v) ? {} : { primary: v };
  }
  if (formula.type === "average" && formula.fields?.length) {
    const vals = formula.fields.map((f) => Number(answers[f])).filter((v) => !isNaN(v));
    if (!vals.length) return {};
    const breakdown: Record<string, number> = {};
    formula.fields.forEach((f) => {
      const v = Number(answers[f]);
      if (!isNaN(v)) breakdown[f] = v;
    });
    return { primary: vals.reduce((a, b) => a + b, 0) / vals.length, breakdown };
  }
  if (formula.type === "ordinal" && formula.field) {
    const field = fields.find((f) => f.key === formula.field);
    const raw = answers[formula.field];
    if (!field || raw == null) return {};
    const opt = (field.options as any[])?.find((o: any) =>
      typeof o === "object" ? o.label === raw || o.value === raw : o === raw,
    );
    if (opt && typeof opt === "object" && typeof opt.value === "number") return { primary: opt.value };
    return {};
  }
  return {};
};

export const useSaveEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: {
      tool_id: string;
      answers_json: Record<string, any>;
      scores_json: any;
      linked_card_id?: string | null;
      linked_course_id?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("transformation_entries")
        .insert({ ...entry, user_id: user.id })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["tt-entries", vars.tool_id] });
      qc.invalidateQueries({ queryKey: ["tt-all-entries"] });
    },
  });
};