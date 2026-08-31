import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  createTheme,
  deleteTheme,
  detachFromTheme,
  listThemeRecords,
  renameTheme,
  useLivingThemes,
  type LivingTheme,
  type ThemeRecord,
  type ThemeTargetKind,
} from "@/hooks/useLivingThemes";
import {
  formatWhen,
  recordKindLabel,
  recordLink,
} from "@/components/temple/living/livingRecordDisplay";

/**
 * LP-F.1B — Member-named themes.
 *
 * She names the word. Nothing is suggested, inferred, or applied for her, and
 * removing a theme never removes a record.
 */

interface Props {
  enabled: boolean;
  lensLinks: React.ReactNode;
}

const ThemesPanel = ({ enabled, lensLinks }: Props) => {
  const { themes, loading, error, reload, setError } = useLivingThemes(enabled);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<LivingTheme | null>(null);
  const [records, setRecords] = useState<ThemeRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [renaming, setRenaming] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<LivingTheme | null>(null);

  const loadRecords = useCallback(async (theme: LivingTheme) => {
    setRecordsLoading(true);
    try {
      setRecords(await listThemeRecords(theme.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open that theme.");
    } finally {
      setRecordsLoading(false);
    }
  }, [setError]);

  useEffect(() => {
    if (open) void loadRecords(open);
  }, [open, loadRecords]);

  const onCreate = async () => {
    if (!label.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createTheme(label);
      setLabel("");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save that theme.");
    } finally {
      setBusy(false);
    }
  };

  const onRename = async () => {
    if (!open || !renaming.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await renameTheme(open.id, open.content_revision, renaming);
      setOpen(updated);
      setRenaming("");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not rename that theme.");
    } finally {
      setBusy(false);
    }
  };

  const onDetach = async (r: ThemeRecord) => {
    if (!open) return;
    setError(null);
    try {
      await detachFromTheme(open.id, r.kind as ThemeTargetKind, r.id);
      await loadRecords(open);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove that record from the theme.");
    }
  };

  const onDelete = async () => {
    if (!confirmDelete) return;
    setError(null);
    try {
      await deleteTheme(confirmDelete.id);
      if (open?.id === confirmDelete.id) setOpen(null);
      setConfirmDelete(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove that theme.");
    }
  };

  return (
    <section className="mt-8 min-w-0" aria-label="My Themes">
      <p className="text-muted-foreground leading-relaxed">
        A theme is a word you choose, and the records you decide to gather under it. Nothing is
        suggested or grouped for you. Removing a theme removes only the word — every record you
        saved stays exactly where it is.
      </p>

      <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-end">
        <div className="flex-1 min-w-0">
          <label htmlFor="new-theme" className="block text-sm text-muted-foreground mb-1">
            Name a theme in your own words
          </label>
          <Input
            id="new-theme"
            value={label}
            maxLength={80}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="For example: coming back to my own pace"
          />
        </div>
        <Button onClick={() => void onCreate()} disabled={busy || !label.trim()}>
          Save theme
        </Button>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive break-words">
          {error}
        </p>
      )}

      {loading && (
        <p className="mt-6 text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Opening your themes…
        </p>
      )}

      {!loading && themes.length === 0 && (
        <div className="mt-6 rounded-xl border border-border/60 bg-card p-5 sm:p-6">
          <p className="text-muted-foreground">
            You have not named a theme yet. There is no right word and no list to complete — a theme
            is only useful if it is yours.
          </p>
          {lensLinks}
        </div>
      )}

      {!loading && themes.length > 0 && (
        <ul className="mt-6 space-y-3">
          {themes.map((t) => (
            <li key={t.id} className="rounded-xl border border-border/60 bg-card p-4 sm:p-5 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-serif text-lg text-foreground break-words">{t.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t.attachment_count ?? 0} records gathered here
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setOpen(open?.id === t.id ? null : t);
                      setRenaming("");
                    }}
                  >
                    {open?.id === t.id ? "Close" : "Open"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setConfirmDelete(t)}>
                    Remove theme
                  </Button>
                </div>
              </div>

              {open?.id === t.id && (
                <div className="mt-4 border-t border-border/60 pt-4">
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                    <div className="flex-1 min-w-0">
                      <label
                        htmlFor={`rename-${t.id}`}
                        className="block text-sm text-muted-foreground mb-1"
                      >
                        Change this word
                      </label>
                      <Input
                        id={`rename-${t.id}`}
                        value={renaming}
                        maxLength={80}
                        onChange={(e) => setRenaming(e.target.value)}
                        placeholder={t.label}
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => void onRename()}
                      disabled={busy || !renaming.trim()}
                    >
                      Save name
                    </Button>
                  </div>

                  {recordsLoading && (
                    <p className="mt-4 text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Opening records…
                    </p>
                  )}

                  {!recordsLoading && records.length === 0 && (
                    <p className="mt-4 text-sm text-muted-foreground">
                      Nothing is gathered under this word yet. You can add a record to a theme from
                      the record itself.
                    </p>
                  )}

                  {!recordsLoading && records.length > 0 && (
                    <ul className="mt-4 space-y-2">
                      {records.map((r) => {
                        const href = recordLink(r);
                        const when = formatWhen(r.occurred_at ?? r.created_at ?? null);
                        const text = `${recordKindLabel(r.kind)}${
                          r.label ? ` — ${r.label}` : ""
                        }${when ? ` · ${when}` : ""}`;
                        return (
                          <li
                            key={`${r.kind}:${r.id}`}
                            className="flex flex-wrap items-center justify-between gap-2 text-sm"
                          >
                            {href ? (
                              <Link
                                to={href}
                                className="text-foreground hover:text-primary break-words min-w-0"
                              >
                                {text}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground break-words min-w-0">
                                {text}
                              </span>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => void onDetach(r)}>
                              Remove from theme
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this theme?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes only the word “{confirmDelete?.label}”. Every record you gathered under
              it stays exactly where it is.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={() => void onDelete()}>Remove theme</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

export default ThemesPanel;
