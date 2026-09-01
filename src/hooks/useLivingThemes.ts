import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * LP-F.1B — Member-named themes.
 *
 * A theme is only a word she chooses and the records she chooses to gather
 * under it. Nothing is inferred, suggested, scored, or shared, and deleting a
 * theme never deletes a record. Owner-scoped through the accepted
 * `living_theme_*` SECURITY DEFINER RPCs. Nothing here touches Arrival.
 */

export type ThemeTargetKind =
  | "state"
  | "moment"
  | "pattern"
  | "pattern_evidence"
  | "experiment"
  | "field_note";

export interface LivingTheme {
  id: string;
  label: string;
  note: string | null;
  content_revision: number;
  created_at: string;
  updated_at: string;
  attachment_count?: number;
}

export interface ThemeRecord {
  kind: ThemeTargetKind;
  id: string;
  label?: string | null;
  occurred_at?: string | null;
  created_at?: string | null;
  parent_id?: string | null;
}

function rpc(name: string, args: Record<string, unknown>) {
  return (supabase.rpc as unknown as (
    n: string,
    a: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>)(name, args);
}

function friendly(message: string): string {
  if (message.includes("living_duplicate_theme")) return "You already have a theme with that name.";
  if (message.includes("living_revision_conflict"))
    return "This theme changed somewhere else. Reopen it and try again.";
  if (message.includes("living_duplicate_attachment"))
    return "That record is already gathered under this theme.";
  if (message.includes("living_invalid")) return "A theme name can be up to 80 characters.";
  if (message.includes("living_not_found")) return "That theme is no longer here.";
  return message;
}

export async function createTheme(label: string, note?: string | null): Promise<LivingTheme> {
  const { data, error } = await rpc("living_theme_create", {
    _label: label.trim(),
    _note: note?.trim() || null,
  });
  if (error) throw new Error(friendly(error.message));
  return data as LivingTheme;
}

export async function renameTheme(
  id: string,
  expectedRevision: number,
  label: string,
): Promise<LivingTheme> {
  const { data, error } = await rpc("living_theme_update", {
    _id: id,
    _expected_revision: expectedRevision,
    _label: label.trim(),
  });
  if (error) throw new Error(friendly(error.message));
  return data as LivingTheme;
}

export async function deleteTheme(id: string): Promise<void> {
  const { error } = await rpc("living_theme_delete", { _id: id });
  if (error) throw new Error(friendly(error.message));
}

export async function listThemes(): Promise<LivingTheme[]> {
  const { data, error } = await rpc("living_themes_list", { _limit: 50 });
  if (error) throw new Error(friendly(error.message));
  return ((data as { records?: LivingTheme[] })?.records ?? []) as LivingTheme[];
}

export async function attachToTheme(
  themeId: string,
  targetKind: ThemeTargetKind,
  targetId: string,
): Promise<void> {
  const { error } = await rpc("living_theme_attach", {
    _theme_id: themeId,
    _target_kind: targetKind,
    _target_id: targetId,
  });
  if (error) throw new Error(friendly(error.message));
}

export async function detachFromTheme(
  themeId: string,
  targetKind: ThemeTargetKind,
  targetId: string,
): Promise<void> {
  const { error } = await rpc("living_theme_detach", {
    _theme_id: themeId,
    _target_kind: targetKind,
    _target_id: targetId,
  });
  if (error) throw new Error(friendly(error.message));
}

export async function listThemeRecords(themeId: string): Promise<ThemeRecord[]> {
  const { data, error } = await rpc("living_theme_records", { _theme_id: themeId, _limit: 50 });
  if (error) throw new Error(friendly(error.message));
  return ((data as { records?: ThemeRecord[] })?.records ?? []) as ThemeRecord[];
}

export async function listRecordThemes(
  targetKind: ThemeTargetKind,
  targetId: string,
): Promise<LivingTheme[]> {
  const { data, error } = await rpc("living_record_themes", {
    _target_kind: targetKind,
    _target_id: targetId,
  });
  if (error) throw new Error(friendly(error.message));
  // `living_record_themes` returns { theme_id, label, attached_at }; normalise to
  // the shared LivingTheme shape so attach/detach always carry a theme id.
  const rows = ((data as { records?: Array<Record<string, unknown>> })?.records ?? []) as Array<
    Record<string, unknown>
  >;
  return rows.map((r) => ({
    id: String(r.id ?? r.theme_id ?? ""),
    label: String(r.label ?? ""),
    note: (r.note as string | null) ?? null,
    content_revision: Number(r.content_revision ?? 0),
    created_at: String(r.attached_at ?? r.created_at ?? ""),
    updated_at: String(r.updated_at ?? r.attached_at ?? ""),
  }));
}


export function useLivingThemes(enabled: boolean) {
  const [themes, setThemes] = useState<LivingTheme[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setThemes(await listThemes());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open your themes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) void reload();
  }, [enabled, reload]);

  return { themes, loading, error, reload, setError };
}
