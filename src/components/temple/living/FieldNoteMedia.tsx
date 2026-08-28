import { useRef, useState } from "react";
import { Loader2, Paperclip, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MEDIA_LIMITS,
  deleteAttachment,
  signedUrlFor,
  uploadAttachment,
  useFieldNoteMedia,
  type FieldNoteAttachment,
} from "@/hooks/useLivingFieldNoteMedia";

/**
 * LP-C.2 — owner-only attachments for one Field Note (Try / Notice / Return).
 *
 * Presentation only: every read, write, and deletion goes through the LP-C.2
 * owner-derived RPCs and short-lived signed URLs. Nothing here shares, publishes,
 * transcribes, analyses, or scores a member's media.
 */

const ACCEPT = [MEDIA_LIMITS.image.accept, MEDIA_LIMITS.audio.accept, MEDIA_LIMITS.video.accept].join(",");
const MAX_PER_NOTE = 10;

function sizeLabel(bytes: number | null) {
  if (!bytes) return null;
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const AttachmentRow = ({
  attachment,
  onDeleted,
}: {
  attachment: FieldNoteAttachment;
  onDeleted: () => void;
}) => {
  const [url, setUrl] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);

  const open = async () => {
    setOpening(true);
    try {
      setUrl(await signedUrlFor(attachment));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That attachment could not be opened.");
    } finally {
      setOpening(false);
    }
  };

  const remove = async () => {
    setRemoving(true);
    try {
      await deleteAttachment(attachment);
      toast.success("That attachment is deleted.");
      onDeleted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete that attachment.");
    } finally {
      setRemoving(false);
      setConfirming(false);
    }
  };

  const size = sizeLabel(attachment.byte_size);

  return (
    <li className="rounded-md border border-border/60 bg-background/40 p-3 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm text-foreground break-words">{attachment.original_filename}</p>
          <p className="text-xs text-muted-foreground">
            {MEDIA_LIMITS[attachment.media_kind].label}
            {size ? ` · ${size}` : ""}
            {attachment.duration_seconds ? ` · ${attachment.duration_seconds}s` : ""}
            {` · kept ${new Date(attachment.created_at).toLocaleDateString(undefined, {
              dateStyle: "medium",
            })}`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {!url && (
            <Button variant="ghost" size="sm" onClick={open} disabled={opening}>
              {opening && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden />}
              Open privately
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirming(true)}
            aria-label={`Delete ${attachment.original_filename}`}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      </div>

      {url && (
        <div className="mt-3">
          {attachment.media_kind === "image" && (
            <img
              src={url}
              alt={attachment.original_filename}
              className="max-h-72 w-full rounded-md object-contain"
            />
          )}
          {attachment.media_kind === "audio" && (
            <audio src={url} controls controlsList="nodownload" className="w-full" />
          )}
          {attachment.media_kind === "video" && (
            <video src={url} controls controlsList="nodownload" className="max-h-72 w-full rounded-md" />
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            This private link expires shortly. Open it again whenever you wish.
          </p>
        </div>
      )}

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this attachment?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the file itself as well as its record. It cannot be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={remove} disabled={removing}>
              {removing && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              Delete it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
};

const FieldNoteMedia = ({
  fieldNoteId,
  emptyHint = "Nothing is attached here. Words alone are plenty.",
}: {
  fieldNoteId: string | null | undefined;
  emptyHint?: string;
}) => {
  const { attachments, loading, error, reload } = useFieldNoteMedia(fieldNoteId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  if (!fieldNoteId) {
    return (
      <div className="border-t border-border/60 pt-5">
        <p className="text-sm text-muted-foreground">
          Save this note first, and you can keep a photograph, voice note, or short video with it.
        </p>
      </div>
    );
  }

  const full = attachments.length >= MAX_PER_NOTE;

  const onPick = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, MAX_PER_NOTE - attachments.length)) {
        await uploadAttachment(fieldNoteId, file);
      }
      toast.success("Kept privately with this note.");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That upload did not complete.");
      await reload();
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="border-t border-border/60 pt-5 min-w-0">
      <p className="text-sm text-foreground">Private attachments (optional)</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Photographs up to {MEDIA_LIMITS.image.maxLabel}, voice notes up to 10 minutes, short video up
        to 3 minutes. Up to {MAX_PER_NOTE} per note. These stay private to you: they are never
        shared, published, listened to, or read by anyone else.
      </p>

      {loading && (
        <p className="mt-3 text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Opening your attachments…
        </p>
      )}
      {error && !loading && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {!loading && attachments.length === 0 && (
        <p className="mt-3 text-sm text-muted-foreground">{emptyHint}</p>
      )}

      {attachments.length > 0 && (
        <ul className="mt-3 space-y-2">
          {attachments.map((a) => (
            <AttachmentRow key={a.id} attachment={a} onDeleted={reload} />
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="sr-only"
        aria-label="Attach a photograph, voice note, or short video"
        onChange={(e) => void onPick(e.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3"
        disabled={uploading || full}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Paperclip className="mr-2 h-4 w-4" aria-hidden />
        )}
        {full ? "Ten attachments is the limit here" : "Attach something private"}
      </Button>
    </div>
  );
};

export default FieldNoteMedia;
