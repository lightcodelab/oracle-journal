import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Loader2, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  addResourceSupport,
  createExperimentFromResource,
  listExperiments,
  listExperimentsFromResource,
  type LivingExperiment,
  type LivingResourceFamily,
} from "@/hooks/useLivingExperiments";
import { useJournalEntries } from "@/hooks/useJournalEntries";

/**
 * TL-1B — "Field Notes for Your Experiments" at the foot of an eligible Temple
 * resource or card.
 *
 * The resource or card is only ever an explicitly member-selected support she
 * chose to use. Nothing here tracks her automatically, claims the support
 * caused an outcome, prescribes it, or asserts that anything worked. Try alone
 * is a complete record; Notice and Return are never required. Everything is
 * owner-only through the accepted Living Pattern RPCs and never writes to any
 * generic Journal table. There is no Arrival reference or data path.
 */

const PRIVACY_LINE =
  "Private to you. Nothing here is shared, analysed, or visible to Temple administrators.";

const CURIOSITY_LINE =
  "You do not need certainty before you live differently. You need enough curiosity to try one small thing, and enough tenderness to learn from what happens.";

interface ResourceFieldNotesProps {
  /** Canonical server-side family of the support she is looking at. */
  resourceFamily: LivingResourceFamily;
  /** Canonical identity of the resource or card. */
  resourceId: string;
  /** Legacy context pair, used only to show her Earlier Journal Notes read-only. */
  legacyContextType: string;
  legacyContextId: string;
  className?: string;
}

function experimentLabel(x: LivingExperiment) {
  return x.own_experiment?.trim() || "A small experiment";
}

export default function ResourceFieldNotes({
  resourceFamily,
  resourceId,
  legacyContextType,
  legacyContextId,
  className,
}: ResourceFieldNotesProps) {
  const [experiments, setExperiments] = useState<LivingExperiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [starting, setStarting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ownDraft, setOwnDraft] = useState("");
  const [tryDraft, setTryDraft] = useState("");
  const [safeDraft, setSafeDraft] = useState("");
  const [supportTitle, setSupportTitle] = useState<string | null>(null);

  const [attaching, setAttaching] = useState(false);
  const [openExperiments, setOpenExperiments] = useState<LivingExperiment[] | null>(null);

  const { data: legacyEntries = [] } = useJournalEntries({
    contextType: legacyContextType,
    contextId: legacyContextId,
  });

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const records = await listExperimentsFromResource(resourceFamily, resourceId);
      setExperiments(records);
      const withTitle = records.find((r) => r.title_snapshot);
      if (withTitle?.title_snapshot) setSupportTitle(withTitle.title_snapshot);
    } catch (e) {
      setLoadError(
        e instanceof Error && e.message.includes("living_resource_unavailable")
          ? "This support is no longer available in the Temple."
          : "Your Field Notes could not be opened just now.",
      );
    } finally {
      setLoading(false);
    }
  }, [resourceFamily, resourceId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleStart = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await createExperimentFromResource({
        resourceFamily,
        resourceId,
        ownExperiment: ownDraft,
        tryBody: tryDraft,
        trySafeEnough: safeDraft,
      });
      setSupportTitle(result.support?.title_snapshot ?? null);
      setOwnDraft("");
      setTryDraft("");
      setSafeDraft("");
      setStarting(false);
      await reload();
      toast.success("Saved to your Field Notes.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      if (message.includes("living_resource_unavailable")) {
        toast.error("This support is no longer available in the Temple.");
      } else if (message.includes("living_invalid")) {
        toast.error("A few words are needed before this can be kept.");
      } else {
        toast.error("That did not save. Your words are still here — try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleOpenPicker = async () => {
    setAttaching(true);
    if (openExperiments) return;
    try {
      const all = await listExperiments(false);
      const alreadyHere = new Set(experiments.map((x) => x.id));
      setOpenExperiments(all.filter((x) => !alreadyHere.has(x.id)));
    } catch {
      setOpenExperiments([]);
    }
  };

  const handleAttach = async (experimentId: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await addResourceSupport({ experimentId, resourceFamily, resourceId });
      setAttaching(false);
      setOpenExperiments(null);
      await reload();
      toast.success("Recorded as support you used.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      if (message.includes("living_duplicate_tag")) {
        toast.info("This is already recorded in that experiment.");
      } else if (message.includes("living_resource_unavailable")) {
        toast.error("This support is no longer available in the Temple.");
      } else {
        toast.error("That did not save. Try again when you are ready.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      <div className="border-t border-border my-8" />

      <div className="rounded-lg border border-border bg-[#e0c8bb] p-5 sm:p-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <Sprout className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-serif text-lg text-foreground sm:text-xl">
              Field Notes for Your Experiments
            </h3>
            <p className="text-sm text-muted-foreground">{PRIVACY_LINE}</p>
          </div>
        </div>

        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-foreground/80">
          {CURIOSITY_LINE}
        </p>

        {supportTitle && (
          <p className="mt-3 text-xs text-muted-foreground">
            Temple support I used: <em>{supportTitle}</em>
          </p>
        )}

        {/* Her existing experiments begun here */}
        <div className="mt-5">
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Opening your Field Notes…
            </p>
          ) : loadError ? (
            <p className="text-sm text-muted-foreground">{loadError}</p>
          ) : experiments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing here yet. You can begin whenever something small is worth trying.
            </p>
          ) : (
            <ul className="space-y-2">
              {experiments.map((x) => (
                <li key={x.id}>
                  <Link
                    to={`/living-pattern/experiments/${x.id}`}
                    className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-border/70 bg-background/50 px-3 py-2 transition-colors hover:border-primary/50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-foreground">
                        {experimentLabel(x)}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        Began {new Date(x.created_at).toLocaleDateString()}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Start a new experiment from here */}
        {!loadError && (
          <div className="mt-5">
            {starting ? (
              <div className="space-y-4 rounded-md border border-border/70 bg-background/50 p-4">
                <div className="space-y-1.5">
                  <Label htmlFor="rfn-own" className="text-sm">
                    What one small thing will you try?
                  </Label>
                  <Textarea
                    id="rfn-own"
                    value={ownDraft}
                    onChange={(e) => setOwnDraft(e.target.value)}
                    placeholder="One small, adaptable thing…"
                    rows={2}
                    maxLength={2000}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rfn-try" className="text-sm">
                    Anything else you want to hold as you begin (optional)
                  </Label>
                  <Textarea
                    id="rfn-try"
                    value={tryDraft}
                    onChange={(e) => setTryDraft(e.target.value)}
                    placeholder="What you are curious to learn…"
                    rows={3}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rfn-safe" className="text-sm">
                    What would make this safe enough to try? (optional)
                  </Label>
                  <Textarea
                    id="rfn-safe"
                    value={safeDraft}
                    onChange={(e) => setSafeDraft(e.target.value)}
                    rows={2}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  This is enough on its own. You never have to add Notice or Return.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleStart} disabled={busy}>
                    {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Keep this
                  </Button>
                  <Button variant="ghost" onClick={() => setStarting(false)} disabled={busy}>
                    Not now
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  variant="outline"
                  className="h-auto w-full whitespace-normal py-2 text-left sm:w-auto"
                  onClick={() => setStarting(true)}
                >
                  {experiments.length === 0
                    ? "Start a small experiment from here"
                    : "Start another small experiment from here"}
                </Button>
                <Button
                  variant="ghost"
                  className="h-auto w-full whitespace-normal py-2 text-left sm:w-auto"
                  onClick={handleOpenPicker}
                >
                  Add this as support in an experiment I already have
                </Button>
              </div>

            )}

            {attaching && (
              <div className="mt-3 rounded-md border border-border/70 bg-background/50 p-3">
                {openExperiments === null ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Opening your experiments…
                  </p>
                ) : openExperiments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    You have no other open experiments to add this to.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {openExperiments.map((x) => (
                      <li key={x.id} className="flex min-w-0 items-center justify-between gap-3">
                        <span className="min-w-0 truncate text-sm text-foreground">
                          {experimentLabel(x)}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => handleAttach(x.id)}
                        >
                          Add
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => setAttaching(false)}
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Earlier Journal Notes — preserved history, read-only, never relabelled */}
        {legacyEntries.length > 0 && (
          <details className="group mt-6 rounded-md border border-border/60 bg-background/40 open:bg-background/60">
            <summary className="cursor-pointer list-none px-3 py-2 text-sm text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              Earlier Journal Notes ({legacyEntries.length})
            </summary>
            <div className="space-y-3 px-3 pb-3 pt-1">
              <p className="text-xs text-muted-foreground">
                Notes you wrote here before. They are unchanged and remain in My Journal.
              </p>
              {legacyEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-md border border-border/60 bg-background/60 p-3"
                >
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.captured_at).toLocaleDateString()}
                    {entry.title ? ` — ${entry.title}` : ""}
                  </p>
                  <p className="mt-1 whitespace-pre-line break-words text-sm text-foreground/90">
                    {entry.content_text?.trim() || "(no text)"}
                  </p>
                </div>
              ))}
              <Link
                to="/journal"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                <BookOpen className="h-4 w-4" />
                Open My Journal
              </Link>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
