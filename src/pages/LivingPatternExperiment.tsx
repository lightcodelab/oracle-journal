import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Home, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMemberState } from "@/hooks/useMemberState";
import NavActions from "@/components/NavActions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  createFieldNote,
  getExperiment,
  updateExperiment,
  updateFieldNote,
  type LivingExperiment,
  type LivingFieldNote,
} from "@/hooks/useLivingExperiments";
import {
  CHANGE_COURSE_NOTE,
  LIFECYCLE_LABELS,
  OUTCOME_LABELS,
  guideByKey,
} from "@/components/temple/living/experimentGuides";
import { FormHelp, GuideScriptPanel, MovementNote } from "@/components/temple/living/FormHelp";
import {
  FIELD_NOTE_HELP,
  FIELD_NOTE_TAB_NOTE,
} from "@/components/temple/living/orientationContent";

/**
 * LP-C.1 — private Field Notes detail surface for one experiment.
 *
 * Three temporal tabs: Try / Notice / Return. Text only. No due dates, overdue
 * state, reminders, streaks, or completion percentage. Owner-only through the
 * LP-C.1 RPCs. No Arrival reference, route, or data path.
 */

type Tab = "try" | "notice" | "return";

const LivingPatternExperiment = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { hasFullTempleAccess, isAdmin, loading: memberLoading } = useMemberState();

  const [tab, setTab] = useState<Tab>("try");
  const [experiment, setExperiment] = useState<LivingExperiment | null>(null);
  const [notes, setNotes] = useState<LivingFieldNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [tryDraft, setTryDraft] = useState("");
  const [safeDraft, setSafeDraft] = useState("");
  const [noticeDraft, setNoticeDraft] = useState("");
  const [returnDraft, setReturnDraft] = useState("");
  const [unknownDraft, setUnknownDraft] = useState("");
  const [nextDraft, setNextDraft] = useState("");
  const [outcome, setOutcome] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getExperiment(id);
      setExperiment(result.experiment);
      setNotes(result.field_notes);
      const tryNote = result.field_notes.find((n) => n.phase === "try");
      setTryDraft(tryNote?.body ?? "");
      setSafeDraft(String(tryNote?.content?.safe_enough ?? ""));
      const returnNote = result.field_notes.find((n) => n.phase === "return");
      if (returnNote) {
        setReturnDraft(returnNote.body);
        setUnknownDraft(String(returnNote.content?.still_unknown ?? ""));
        setNextDraft(String(returnNote.content?.keep_alter_release ?? ""));
        setOutcome(returnNote.outcome);
        setTab("return");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open this experiment.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!authLoading && !memberLoading && user && hasFullTempleAccess && isAdmin) void load();
  }, [authLoading, memberLoading, user, hasFullTempleAccess, isAdmin, load]);

  const tryNote = notes.find((n) => n.phase === "try") ?? null;
  const noticeNotes = notes.filter((n) => n.phase === "notice");
  const returnNote = notes.find((n) => n.phase === "return") ?? null;
  const guide = guideByKey(experiment?.guide_key);

  const saveTry = async () => {
    if (!tryNote) return;
    setBusy(true);
    try {
      await updateFieldNote(tryNote.id, tryNote.content_revision, {
        body: tryDraft.trim(),
        content: safeDraft.trim() ? { safe_enough: safeDraft.trim() } : {},
      });
      toast.success("Your Try note is saved.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save that note.");
    } finally {
      setBusy(false);
    }
  };

  const addNotice = async () => {
    if (!experiment) return;
    setBusy(true);
    try {
      await createFieldNote({
        experimentId: experiment.id,
        phase: "notice",
        body: noticeDraft.trim(),
      });
      setNoticeDraft("");
      toast.success("Noticing recorded.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not record that note.");
    } finally {
      setBusy(false);
    }
  };

  const saveReturn = async () => {
    if (!experiment) return;
    setBusy(true);
    try {
      const content: Record<string, string> = {};
      if (unknownDraft.trim()) content.still_unknown = unknownDraft.trim();
      if (nextDraft.trim()) content.keep_alter_release = nextDraft.trim();

      if (returnNote) {
        await updateFieldNote(returnNote.id, returnNote.content_revision, {
          body: returnDraft.trim(),
          content,
          outcome,
        });
      } else {
        await createFieldNote({
          experimentId: experiment.id,
          phase: "return",
          body: returnDraft.trim(),
          content,
          outcome,
        });
      }
      toast.success("Your Return is recorded.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not record your Return.");
    } finally {
      setBusy(false);
    }
  };

  const setLifecycle = async (lifecycle: "changed_course" | "stopped" | "active") => {
    if (!experiment) return;
    setBusy(true);
    try {
      const updated = await updateExperiment(experiment.id, experiment.content_revision, { lifecycle });
      setExperiment({ ...experiment, ...updated });
      toast.success("Noted. This is valid evidence too.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update this experiment.");
    } finally {
      setBusy(false);
    }
  };

  if (authLoading || memberLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-serif text-xl">Opening a quiet place…</div>
      </div>
    );
  }

  if (!hasFullTempleAccess || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <header className="max-w-3xl mx-auto px-4 pt-4 pb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
            <Home className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="font-medium truncate">The Temple of Sustainment</span>
          </div>
          <NavActions />
        </header>
        <main className="max-w-xl mx-auto px-4 pt-16 pb-16 text-center">
          <h1 className="font-serif text-3xl text-foreground mb-4">Your Living Pattern is private</h1>
          <p className="text-muted-foreground mb-8">
            An active membership opens this record. Return to the entrance to see what is currently open.
          </p>
          <Button asChild size="lg">
            <Link to="/">Return to the entrance</Link>
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="max-w-3xl mx-auto px-4 pt-4 pb-3 flex items-center justify-between gap-3">
        <Link
          to="/living-pattern/experiments"
          className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="font-medium truncate">Back to my experiments</span>
        </Link>
        <NavActions />
      </header>

      <main className="max-w-3xl mx-auto px-4 pb-16">
        <p className="text-[0.7rem] tracking-[0.2em] uppercase text-primary">
          Field Notes for Your Experiments
        </p>
        <h1 className="font-serif text-2xl sm:text-3xl text-foreground mt-1 break-words">
          {guide && guide.key !== "own" ? guide.title : experiment?.own_experiment || "Your experiment"}
        </h1>

        {loading && (
          <p className="mt-6 text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Opening your notes…
          </p>
        )}
        {error && !loading && (
          <p role="alert" className="mt-6 text-sm text-destructive">
            {error}
          </p>
        )}

        {experiment && !loading && (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              {LIFECYCLE_LABELS[experiment.lifecycle] ?? "Open"} · began{" "}
              {new Date(experiment.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
              {experiment.state_id ? " · linked to a State of Being" : ""}
            </p>

            <nav aria-label="Field Note phases" className="mt-6 flex flex-wrap gap-2">
              {(["try", "notice", "return"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  aria-current={tab === t ? "true" : undefined}
                  className={`rounded-md border px-3 py-1.5 text-sm capitalize ${
                    tab === t
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-border/70 text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {t}
                </button>
              ))}
            </nav>

            <div className="mt-6 rounded-xl border border-border/60 bg-card p-5 sm:p-6 space-y-6">
              {tab === "try" && (
                <>
                  {guide && (
                    <div className="space-y-2 text-sm">
                      <p className="text-muted-foreground">{guide.purpose}</p>
                      <p className="text-foreground">
                        <span className="text-primary">Try this — </span>
                        {guide.tryThis}
                      </p>
                      {guide.script && (
                        <p className="rounded-md border border-border/60 bg-background/50 p-3 italic text-foreground">
                          “{guide.script}”
                        </p>
                      )}
                      <p className="text-muted-foreground">
                        <span className="text-primary">What you are testing — </span>
                        {guide.testing}
                      </p>
                      <p className="text-muted-foreground">
                        <span className="text-primary">What to notice afterwards — </span>
                        {guide.notice}
                      </p>
                      <p className="text-xs text-muted-foreground">{CHANGE_COURSE_NOTE}</p>
                    </div>
                  )}
                  {experiment.own_experiment && (
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {experiment.own_experiment}
                    </p>
                  )}

                  <div className="space-y-2 border-t border-border/60 pt-5">
                    <Label htmlFor="try-body">What, if anything, are you curious to try? (optional)</Label>
                    <Textarea
                      id="try-body"
                      rows={3}
                      value={tryDraft}
                      onChange={(e) => setTryDraft(e.target.value)}
                      placeholder="As small as you like."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="try-safe">What would make this safe enough to try? (optional)</Label>
                    <Textarea
                      id="try-safe"
                      rows={2}
                      value={safeDraft}
                      onChange={(e) => setSafeDraft(e.target.value)}
                      placeholder="A time, a place, a person, or a way out."
                    />
                  </div>
                  <Button variant="outline" onClick={saveTry} disabled={busy}>
                    {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                    Save this Try note
                  </Button>
                  {tryNote && (
                    <p className="text-xs text-muted-foreground">
                      Recorded{" "}
                      {new Date(tryNote.recorded_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                      . An empty note is fine.
                    </p>
                  )}
                </>
              )}

              {tab === "notice" && (
                <>
                  {noticeNotes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nothing noticed here yet. That is a perfectly ordinary place to be.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {noticeNotes.map((n) => (
                        <li key={n.id} className="rounded-md border border-border/60 bg-background/40 p-3">
                          <p className="text-xs text-muted-foreground">
                            {new Date(n.recorded_at).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </p>
                          <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">
                            {n.body || "—"}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="space-y-2 border-t border-border/60 pt-5">
                    <Label htmlFor="notice-body">
                      What are you noticing in your body, capacity, circumstances, relationship, or story?
                    </Label>
                    <Textarea
                      id="notice-body"
                      rows={3}
                      value={noticeDraft}
                      onChange={(e) => setNoticeDraft(e.target.value)}
                      placeholder="What is different, the same, or surprising?"
                    />
                    <Button onClick={addNotice} disabled={busy || !noticeDraft.trim()}>
                      {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                      Add a noticing
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Never required. You can leave this empty for as long as you like.
                    </p>
                  </div>
                </>
              )}

              {tab === "return" && (
                <>
                  <p className="text-sm text-primary">
                    Return when you have more information—not when you have succeeded.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="return-body">What happened? What did this support, complicate, or contradict?</Label>
                    <Textarea
                      id="return-body"
                      rows={4}
                      value={returnDraft}
                      onChange={(e) => setReturnDraft(e.target.value)}
                    />
                    <FormHelp help={FIELD_NOTE_HELP.return} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="return-unknown">What is still unknown? (optional)</Label>
                    <Textarea
                      id="return-unknown"
                      rows={2}
                      value={unknownDraft}
                      onChange={(e) => setUnknownDraft(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="return-next">
                      What would you like to keep, alter, release, or try next? (optional)
                    </Label>
                    <Textarea
                      id="return-next"
                      rows={2}
                      value={nextDraft}
                      onChange={(e) => setNextDraft(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>An optional label, only if one fits</Label>
                    <div className="flex flex-wrap gap-2">
                      {OUTCOME_LABELS.map((o) => (
                        <button
                          key={o.value}
                          type="button"
                          aria-pressed={outcome === o.value}
                          onClick={() => setOutcome(outcome === o.value ? null : o.value)}
                          className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                            outcome === o.value
                              ? "border-primary bg-primary/15 text-foreground"
                              : "border-border/70 bg-card/60 text-muted-foreground hover:border-primary/50"
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      No label is needed. None of these is better than another.
                    </p>
                  </div>
                  <Button onClick={saveReturn} disabled={busy}>
                    {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                    {returnNote ? "Update my Return" : "Record my Return"}
                  </Button>
                </>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" onClick={() => setLifecycle("changed_course")} disabled={busy}>
                I changed course
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setLifecycle("stopped")} disabled={busy}>
                I stopped this
              </Button>
              {experiment.lifecycle !== "active" && (
                <Button variant="ghost" size="sm" onClick={() => setLifecycle("active")} disabled={busy}>
                  Open this again
                </Button>
              )}
            </div>

            <div className="mt-8 flex flex-wrap gap-2 border-t border-border/60 pt-5">
              <Button asChild variant="ghost">
                <Link to="/living-pattern/experiments">My experiments</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/temple">Back to Home</Link>
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default LivingPatternExperiment;
