import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

/**
 * LP-C.2 — private Field Notes media cleanup.
 *
 * Drains public.living_media_deletions and removes the physical objects from the
 * private `living-field-note-media` bucket. Rows are enqueued by a trigger, so
 * this covers explicit attachment deletion, Field Note / experiment deletion,
 * and full account deletion cascades. It never reads media, never returns URLs,
 * and only ever deletes objects that no longer have an owning record.
 */

const BUCKET = "living-field-note-media";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: queued, error: readError } = await admin
      .from("living_media_deletions")
      .select("id, object_path")
      .order("enqueued_at", { ascending: true })
      .limit(100);

    if (readError) return json({ error: readError.message }, 500);
    if (!queued || queued.length === 0) return json({ removed: 0, remaining: 0 });

    // Never remove an object that still has a live owning attachment row.
    const paths = queued.map((q) => q.object_path);
    const { data: live } = await admin
      .from("living_media_attachments")
      .select("object_path")
      .in("object_path", paths);
    const livePaths = new Set((live ?? []).map((l) => l.object_path));

    const orphans = queued.filter((q) => !livePaths.has(q.object_path));
    if (orphans.length > 0) {
      const { error: removeError } = await admin.storage
        .from(BUCKET)
        .remove(orphans.map((o) => o.object_path));

      if (removeError) {
        await admin
          .from("living_media_deletions")
          .update({ attempts: 1, last_error: removeError.message })
          .in("id", orphans.map((o) => o.id));
        return json({ error: removeError.message }, 500);
      }
    }

    const settled = [...orphans.map((o) => o.id), ...queued.filter((q) => livePaths.has(q.object_path)).map((q) => q.id)];
    if (settled.length > 0) {
      await admin.from("living_media_deletions").delete().in("id", settled);
    }

    const { count } = await admin
      .from("living_media_deletions")
      .select("id", { count: "exact", head: true });

    return json({ removed: orphans.length, remaining: count ?? 0 });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "unknown_error" }, 500);
  }
});
