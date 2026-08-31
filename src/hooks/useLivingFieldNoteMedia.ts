import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * LP-C.2 — owner-only private media attachments for Field Notes.
 *
 * Every database operation goes through the LP-C.2 SECURITY DEFINER RPCs; the
 * attachment table grants nothing to `authenticated`. Files live in the private
 * `living-field-note-media` bucket, are reachable only through short-lived
 * signed URLs the owner requests herself, and are never public, shared,
 * analysed, transcribed, or readable by administrators.
 */

const BUCKET = "living-field-note-media";
const SIGNED_URL_SECONDS = 60;

export const MEDIA_LIMITS = {
  image: {
    label: "Photograph",
    accept: "image/jpeg,image/png,image/webp",
    mimes: ["image/jpeg", "image/png", "image/webp"],
    maxBytes: 15 * 1024 * 1024,
    maxLabel: "15 MB",
    maxSeconds: null as number | null,
  },
  audio: {
    label: "Voice note",
    // `audio/x-m4a` is the practical MIME Chromium reports for iPhone voice
    // memos; it is the same M4A container as `audio/mp4`.
    accept: "audio/mpeg,audio/mp4,audio/x-m4a,audio/webm,audio/ogg,audio/wav,.m4a",
    mimes: [
      "audio/mpeg",
      "audio/mp4",
      "audio/x-m4a",
      "audio/webm",
      "audio/ogg",
      "audio/wav",
    ],
    maxBytes: 50 * 1024 * 1024,
    maxLabel: "50 MB",
    maxSeconds: 600,
  },

  video: {
    label: "Short video",
    accept: "video/mp4,video/webm,video/quicktime",
    mimes: ["video/mp4", "video/webm", "video/quicktime"],
    maxBytes: 150 * 1024 * 1024,
    maxLabel: "150 MB",
    maxSeconds: 180,
  },
} as const;

export type MediaKind = keyof typeof MEDIA_LIMITS;

export interface FieldNoteAttachment {
  id: string;
  field_note_id: string;
  media_kind: MediaKind;
  object_path: string;
  original_filename: string;
  mime_type: string;
  byte_size: number | null;
  duration_seconds: number | null;
  status: "pending" | "ready";
  created_at: string;
}

function rpc(name: string, args: Record<string, unknown>) {
  return (supabase.rpc as unknown as (
    n: string,
    a: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>)(name, args);
}

export function kindForFile(file: File): MediaKind | null {
  const mime = file.type;
  if (MEDIA_LIMITS.image.mimes.includes(mime as never)) return "image";
  if (MEDIA_LIMITS.audio.mimes.includes(mime as never)) return "audio";
  if (MEDIA_LIMITS.video.mimes.includes(mime as never)) return "video";
  return null;
}

async function probeDuration(file: File, kind: MediaKind): Promise<number | null> {
  if (kind === "image") return null;
  return new Promise((resolve) => {
    const el = document.createElement(kind === "audio" ? "audio" : "video");
    const url = URL.createObjectURL(file);
    const done = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    el.preload = "metadata";
    el.onloadedmetadata = () =>
      done(Number.isFinite(el.duration) && el.duration > 0 ? Math.ceil(el.duration) : null);
    el.onerror = () => done(null);
    el.src = url;
  });
}

export async function listAttachments(fieldNoteId: string): Promise<FieldNoteAttachment[]> {
  const { data, error } = await rpc("living_media_list", { _field_note_id: fieldNoteId });
  if (error) throw new Error(error.message);
  return ((data as { records?: FieldNoteAttachment[] })?.records ?? []) as FieldNoteAttachment[];
}

export async function uploadAttachment(
  fieldNoteId: string,
  file: File,
): Promise<FieldNoteAttachment> {
  const kind = kindForFile(file);
  if (!kind) throw new Error("That file type is not supported here yet.");

  const limits = MEDIA_LIMITS[kind];
  if (file.size > limits.maxBytes) {
    throw new Error(`${limits.label}s need to be ${limits.maxLabel} or smaller.`);
  }

  const duration = await probeDuration(file, kind);
  if (limits.maxSeconds && duration && duration > limits.maxSeconds) {
    throw new Error(
      `${limits.label}s need to be ${Math.floor(limits.maxSeconds / 60)} minutes or shorter.`,
    );
  }

  const prepared = await rpc("living_media_prepare", {
    _field_note_id: fieldNoteId,
    _media_kind: kind,
    _filename: file.name,
    _mime_type: file.type,
    _byte_size: file.size,
    _duration_seconds: duration,
  });
  if (prepared.error) throw new Error(prepared.error.message);
  const attachment = (prepared.data as { attachment: FieldNoteAttachment }).attachment;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(attachment.object_path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    await rpc("living_media_delete", { _id: attachment.id }).catch(() => undefined);
    throw new Error("That upload did not complete. You can try again whenever you like.");
  }

  // The server derives the real duration from the uploaded bytes and is the only
  // place an attachment can become `ready`; the probe above is a courtesy check.
  const verified = await supabase.functions.invoke("living-media-verify", {
    body: { id: attachment.id },
  });
  const verifiedAttachment = (verified.data as { attachment?: FieldNoteAttachment } | null)
    ?.attachment;
  if (verified.error || !verifiedAttachment) {
    await supabase.storage.from(BUCKET).remove([attachment.object_path]).catch(() => undefined);
    await rpc("living_media_delete", { _id: attachment.id }).catch(() => undefined);
    const limitLabel = limits.maxSeconds
      ? ` ${limits.label}s need to be ${Math.floor(limits.maxSeconds / 60)} minutes or shorter.`
      : "";
    throw new Error(`That file could not be accepted. Nothing was kept.${limitLabel}`);
  }
  return verifiedAttachment;
}

export async function deleteAttachment(attachment: FieldNoteAttachment): Promise<void> {
  // Remove the physical object first; the RPC always queues cleanup as a backstop.
  await supabase.storage.from(BUCKET).remove([attachment.object_path]).catch(() => undefined);
  const { error } = await rpc("living_media_delete", { _id: attachment.id });
  if (error) throw new Error(error.message);
}

export async function signedUrlFor(attachment: FieldNoteAttachment): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(attachment.object_path, SIGNED_URL_SECONDS);
  if (error || !data?.signedUrl) throw new Error("That attachment could not be opened.");
  return data.signedUrl;
}

export function useFieldNoteMedia(fieldNoteId: string | null | undefined) {
  const [attachments, setAttachments] = useState<FieldNoteAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!fieldNoteId) {
      setAttachments([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setAttachments(await listAttachments(fieldNoteId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open your attachments.");
    } finally {
      setLoading(false);
    }
  }, [fieldNoteId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { attachments, loading, error, reload };
}
