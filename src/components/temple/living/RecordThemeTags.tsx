import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  attachToTheme,
  createTheme,
  detachFromTheme,
  listRecordThemes,
  listThemes,
  type LivingTheme,
  type ThemeTargetKind,
} from "@/hooks/useLivingThemes";

/**
 * LP-F.1B — attach one of her own records to a theme she names.
 *
 * Presentation only: no suggestion, inference, or automatic grouping. A theme is
 * her word, applied by her, and removing it never touches the record.
 */

interface Props {
  targetKind: ThemeTargetKind;
  targetId: string;
}

const RecordThemeTags = ({ targetKind, targetId }: Props) => {
  const [mine, setMine] = useState<LivingTheme[]>([]);
  const [all, setAll] = useState<LivingTheme[]>([]);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [attached, everything] = await Promise.all([
        listRecordThemes(targetKind, targetId),
        listThemes(),
      ]);
      setMine(attached);
      setAll(everything);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open your themes.");
    }
  }, [targetKind, targetId]);

  useEffect(() => {
    void load();
  }, [load]);

  const attachedIds = new Set(mine.map((t) => t.id));
  const available = all.filter((t) => !attachedIds.has(t.id));

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save that.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-5 min-w-0">
      <p className="text-[0.7rem] uppercase tracking-[0.15em] text-primary">Your themes</p>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        If a word of your own fits this record, you can gather it under that word. Only you name it,
        and only you see it.
      </p>

      {mine.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {mine.map((t) => (
            <li key={t.id}>
              <Button
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => void run(() => detachFromTheme(t.id, targetKind, targetId))}
                aria-label={`Remove this record from the theme ${t.label}`}
              >
                {t.label} ×
              </Button>
            </li>
          ))}
        </ul>
      )}

      {available.length > 0 && (
        <div className="mt-3">
          <p className="text-sm text-muted-foreground">Add to a theme you already named</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {available.map((t) => (
              <li key={t.id}>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => void run(() => attachToTheme(t.id, targetKind, targetId))}
                >
                  {t.label}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-end">
        <div className="flex-1 min-w-0">
          <label
            htmlFor={`theme-${targetKind}-${targetId}`}
            className="block text-sm text-muted-foreground mb-1"
          >
            Or name a new theme
          </label>
          <Input
            id={`theme-${targetKind}-${targetId}`}
            value={label}
            maxLength={80}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="In your own words"
          />
        </div>
        <Button
          variant="outline"
          disabled={busy || !label.trim()}
          onClick={() =>
            void run(async () => {
              const created = await createTheme(label);
              await attachToTheme(created.id, targetKind, targetId);
              setLabel("");
            })
          }
        >
          Save and add
        </Button>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive break-words">
          {error}
        </p>
      )}
    </div>
  );
};

export default RecordThemeTags;
