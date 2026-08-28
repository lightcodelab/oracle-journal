/**
 * LP-C.2.2 — verified finalisation for private Field Note media.
 *
 * The owner uploads to her own private path, then calls this function. The
 * duration is derived here from the uploaded bytes; the client-declared value is
 * never trusted. Only this function may finalise an attachment.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { deriveDuration, type Reader } from "./duration.ts";

const BUCKET = "living-field-note-media";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await userClient.auth.getUser();
  const user = userData?.user;
  if (!user) return json({ error: "unauthorized" }, 401);

  let attachmentId: string | null = null;
  try {
    attachmentId = (await req.json())?.id ?? null;
  } catch (_e) {
    attachmentId = null;
  }
  if (!attachmentId) return json({ error: "missing_id" }, 400);

  const admin = createClient(url, service);

  const { data: row } = await admin
    .from("living_media_attachments")
    .select("id, user_id, media_kind, mime_type, object_path, status")
    .eq("id", attachmentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!row) return json({ error: "not_found" }, 404);

  const discard = async () => {
    await admin.storage.from(BUCKET).remove([row.object_path]);
    await admin.from("living_media_attachments").delete().eq("id", row.id).eq("user_id", user.id);
  };

  let duration: number | null = null;

  if (row.media_kind !== "image") {
    const { data: signed } = await admin.storage.from(BUCKET).createSignedUrl(row.object_path, 120);
    if (!signed?.signedUrl) {
      await discard();
      return json({ error: "living_media_missing_object" }, 400);
    }

    // Size and content type come from the stored object itself, never the client.
    const head = await fetch(signed.signedUrl, { method: "HEAD" });
    const size = Number(head.headers.get("content-length") ?? 0);
    const mime = (head.headers.get("content-type") ?? row.mime_type).split(";")[0].trim();
    if (!head.ok || !size) {
      await discard();
      return json({ error: "living_media_missing_object" }, 400);
    }


    const read: Reader = async (start, end) => {
      const res = await fetch(signed.signedUrl, {
        headers: { Range: `bytes=${start}-${Math.max(start, end - 1)}` },
      });
      if (!res.ok && res.status !== 206) return new Uint8Array();
      return new Uint8Array(await res.arrayBuffer());
    };

    const seconds = await deriveDuration(mime, read, size);
    if (seconds === null || !Number.isFinite(seconds) || seconds <= 0) {
      await discard();
      return json({ error: "living_media_duration_unreadable" }, 400);
    }
    duration = Math.ceil(seconds - 0.05);
    if (duration < 1) duration = 1;
  }

  const { data: finalized, error } = await admin.rpc("living_media_finalize_verified", {
    _id: row.id,
    _user_id: user.id,
    _duration_seconds: duration,
  });

  if (error) {
    await admin.storage.from(BUCKET).remove([row.object_path]);
    return json({ error: error.message, derived_duration_seconds: duration }, 400);
  }

  return json({ attachment: finalized, derived_duration_seconds: duration });
});
