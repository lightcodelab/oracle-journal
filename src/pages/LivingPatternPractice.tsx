import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Home, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useMemberState } from "@/hooks/useMemberState";
import NavActions from "@/components/NavActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  addPatternEvidence,
  createPattern,
  getPattern,
  linkPattern,
  listPatternEvidence,
  updatePattern,
  type LivingPatternEvidence,
  type LivingPatternRecord,
} from "@/hooks/useLivingPatterns";
import { createExperiment, useOwnExperiments } from "@/hooks/useLivingExperiments";
import { useOwnStates } from "@/hooks/useLivingMoments";
import {
  CHANGE_COURSE_NOTE,
  EVIDENCE_RELATIONS,
  PRACTICE_GUIDES,
  guideByKey,
} from "@/components/temple/living/experimentGuides";
import { FormHelp, GuideScriptPanel, MovementNote } from "@/components/temple/living/FormHelp";
import {
  GLOBAL_MOVEMENT_HELPER,
  PRACTICE_HELP,
  PRACTICE_LEAD_IN,
} from "@/components/temple/living/orientationContent";

/**
 * LP-E — Practice / Patterns of Choosing.
 *
 * Private, owner-only. Recognise → Resolve → Reinforce. This is not an
 * identity tracker, habit dashboard, streak, score, treatment plan or verdict
 * about who she is. A Pattern may be saved while still uncertain, re-chosen,
 * revised, or retired, and may hold no evidence and no experiments at all.
 *
 * Field Notes remain the one shared evidence practice (Try → Notice → Return);
 * nothing here creates a second experiment or journal system.
 *
 * No Arrival table, route, query, prefill or reference exists in this file.
 */

type Step = 1 | 2 | 3;

const RECOGNISE_FIELDS = [
  {
    key: "commitment_now",
    label: "What commitment are your choices making real right now?",
    rows: 3,
  },
  {
    key: "invitation",
    label: "What way of being are you being invited to choose more consciously?",
    rows: 2,
  },
  { key: "noticing", label: "Anything else you are noticing about this? (optional)", rows: 2 },
] as const;

const RESOLVE_FIELDS = [
  { key: "keep", label: "What do you want to keep?" },
  { key: "change", label: "What do you want to change?" },
  { key: "release", label: "What do you want to release?" },
  { key: "rechoose", label: "What do you want to re-choose?" },
  { key: "boundary", label: "A boundary this might ask for (optional)" },
  { key: "support", label: "Support you might want (optional)" },
  { key: "cost", label: "An honest cost of this (optional)" },
  { key: "uncertainty", label: "What you are still uncertain about (optional)" },
] as const;

type TextMap = Record<string, string>;

const asMap = (v: unknown): TextMap => {
  const out: TextMap = {};
  if (v && typeof v === "object") {
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (typeof val === "string") out[k] = val;
    }
  }
  return out;
};

const trimmed = (m: TextMap) => {
  const out: TextMap = {};
  for (const [k, v] of Object.entries(m)) {
    const t = v.trim();
    if (t) out[k] = t;
  }
  return out;
};

const lifecycleLabel = (p: LivingPatternRecord) =>
  p.retired_at ? "Retired" : p.rechosen_at ? "Re-chosen" : "Chosen";

const LivingPatternPractice = () => {
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { hasFullTempleAccess, isAdmin, loading: memberLoading } = useMemberState();

  const [step, setStep] = useState<Step>(1);
  const [label, setLabel] = useState("");
  const [commitment, setCommitment] = useState("");
  const [recognise, setRecognise] = useState<TextMap>({});
  const [resolve, setResolve] = useState<TextMap>({});
  const [reinforce, setReinforce] = useState<TextMap>({});

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState<LivingPatternRecord | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(!!routeId);

  const [evidence, setEvidence] = useState<LivingPatternEvidence[]>([]);
  const [evidenceBody, setEvidenceBody] = useState("");
  const [evidenceRelation, setEvidenceRelation] = useState<string | null>(null);
  const [addingEvidence, setAddingEvidence] = useState(false);

  const [wantExperiment, setWantExperiment] = useState(false);
  const [guideKey, setGuideKey] = useState<string | null>(null);
  const [ownText, setOwnText] = useState("");
  const [tryText, setTryText] = useState("");
  const [creating, setCreating] = useState(false);
  const selectedGuide = guideByKey(guideKey);

  const accessResolved = !authLoading && !memberLoading && !!user;
  const enabled = accessResolved && hasFullTempleAccess && isAdmin;
  const states = useOwnStates(enabled);
  const { experiments } = useOwnExperiments(enabled);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  // Opening a Pattern of her own.
  useEffect(() => {
    if (!routeId || !enabled) return;
    let cancelled = false;
    (async () => {
      try {
        const [p, e] = await Promise.all([getPattern(routeId), listPatternEvidence(routeId)]);
        if (cancelled) return;
        setSaved(p);
        setEvidence(e);
        setLabel(p.label);
        setCommitment(p.commitment ?? "");
        setRecognise(asMap((p.content as Record<string, unknown>)?.recognise));
        setResolve(asMap((p.content as Record<string, unknown>)?.resolve));
        setReinforce(asMap((p.content as Record<string, unknown>)?.reinforce));
      } catch (e) {
        if (!cancelled) {
          setSaveError(e instanceof Error ? e.message : "Could not open that Pattern.");
        }
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [routeId, enabled]);

  const patternExperiments = useMemo(
    () => (saved ? experiments.filter((x) => x.pattern_id === saved.id) : []),
    [experiments, saved],
  );

  const canSave = useMemo(() => {
    const anyText = [recognise, resolve, reinforce].some((m) =>
      Object.values(m).some((v) => v.trim().length > 0),
    );
    return label.trim().length > 0 || commitment.trim().length > 0 || anyText;
  }, [label, commitment, recognise, resolve, reinforce]);

  const setField = (
    set: (fn: (prev: TextMap) => TextMap) => void,
    key: string,
    value: string,
  ) => set((prev) => ({ ...prev, [key]: value }));

  const derivedLabel = () =>
    label.trim() ||
    commitment.trim().slice(0, 120) ||
    (recognise.commitment_now ?? "").trim().slice(0, 120) ||
    "A pattern I am noticing";

  const handleSave = async (alsoExperiment: boolean) => {
    setSaving(true);
    setSaveError(null);
    const content = {
      recognise: trimmed(recognise),
      resolve: trimmed(resolve),
      reinforce: trimmed(reinforce),
    };
    try {
      if (saved) {
        const updated = await updatePattern(saved.id, saved.content_revision, {
          label: derivedLabel(),
          commitment: commitment.trim() || null,
          content,
        });
        setSaved(updated);
        toast.success("Your Pattern has been updated.");
      } else {
        const created = await createPattern({
          label: derivedLabel(),
          commitment: commitment.trim() || null,
          content,
        });
        setSaved(created);
        setLabel(created.label);
        toast.success("Your Pattern of Choosing is saved to your private record.");
      }
      setWantExperiment(alsoExperiment);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Something went wrong while saving.");
    } finally {
      setSaving(false);
    }
  };

  const handleLifecycle = async (patch: { rechoose?: boolean; retire?: boolean; unretire?: boolean }) => {
    if (!saved) return;
    try {
      const updated = await updatePattern(saved.id, saved.content_revision, patch);
      setSaved(updated);
      toast.success(
        patch.retire
          ? "Retired. It stays in your record as something you once chose."
          : patch.unretire
            ? "Open again, exactly as you left it."
            : "Re-chosen, today.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update that Pattern.");
    }
  };

  const handleAddEvidence = async () => {
    if (!saved || !evidenceBody.trim()) return;
    setAddingEvidence(true);
    try {
      const row = await addPatternEvidence({
        patternId: saved.id,
        body: evidenceBody,
        relation: evidenceRelation,
      });
      setEvidence((prev) => [row, ...prev]);
      setEvidenceBody("");
      setEvidenceRelation(null);
      toast.success("Added to your own evidence.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add that.");
    } finally {
      setAddingEvidence(false);
    }
  };

  const handleBeginExperiment = async () => {
    if (!saved || !guideKey) return;
    if (guideKey === "own" && !ownText.trim()) {
      toast.error("Add a sentence describing your own experiment.");
      return;
    }
    setCreating(true);
    try {
      const experiment = await createExperiment({
        patternId: saved.id,
        guideKey,
        ownExperiment: guideKey === "own" ? ownText : null,
        tryBody: tryText,
      });
      navigate(`/living-pattern/experiments/${experiment.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not begin that experiment.");
    } finally {
      setCreating(false);
    }
  };

  const handleLink = async (kind: "state" | "experiment", targetId: string) => {
    if (!saved) return;
    try {
      await linkPattern(saved.id, kind, targetId);
      toast.success("Linked, because you said so — nothing is assumed.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create that link.");
    }
  };

  if (authLoading || memberLoading || !user || loadingExisting) {
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
          <h1 className="font-serif text-3xl text-foreground mb-4">
            Your Living Pattern is private
          </h1>
          <p className="text-muted-foreground mb-8">
            An active membership opens this record. Return to the entrance to see what is currently
            open.
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
          to="/temple"
          className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="font-medium truncate">Back to Home</span>
        </Link>
        <NavActions />
      </header>

      <main className="max-w-3xl mx-auto px-4 pb-16">
        <p className="text-[0.7rem] tracking-[0.2em] uppercase text-primary">
          Patterns of Choosing
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl text-foreground mt-1">Practice</h1>
        <p className="mt-3 max-w-2xl text-sm sm:text-base leading-relaxed text-muted-foreground">
          You do not need certainty before you live differently. You need enough curiosity to try
          one small thing, and enough tenderness to learn from what happens. This is a private place
          to notice the commitments your choices are already making real, and to choose or revise one
          consciously. It is not a verdict about who you are.
        </p>

        <nav aria-label="Practice movement" className="mt-8 flex flex-wrap gap-2">
          {(["Recognise", "Resolve", "Reinforce"] as const).map((l, i) => {
            const n = (i + 1) as Step;
            return (
              <button
                key={l}
                type="button"
                onClick={() => setStep(n)}
                aria-current={step === n ? "step" : undefined}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  step === n
                    ? "border-primary bg-primary/15 text-foreground"
                    : "border-border/70 text-muted-foreground hover:border-primary/50"
                }`}
              >
                {l}
              </button>
            );
          })}
        </nav>
        <MovementNote>{GLOBAL_MOVEMENT_HELPER}</MovementNote>
        <p className="mt-3 text-sm text-muted-foreground">{PRACTICE_LEAD_IN}</p>


        <div className="mt-6 rounded-xl border border-border/60 bg-card p-5 sm:p-6 space-y-6">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="pattern-label">
                  A few words to name this pattern (optional)
                </Label>
                <Input
                  id="pattern-label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="However you would name it — no aspirational identity required."
                />
              </div>
              {RECOGNISE_FIELDS.map((f) => (
                <div key={f.key} className="space-y-2">
                  <Label htmlFor={`rg-${f.key}`}>{f.label}</Label>
                  <Textarea
                    id={`rg-${f.key}`}
                    rows={f.rows}
                    value={recognise[f.key] ?? ""}
                    onChange={(e) => setField(setRecognise, f.key, e.target.value)}
                    placeholder="As much or as little as you like."
                  />
                  <FormHelp help={PRACTICE_HELP.recognise} />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Every field is an invitation. Uncertainty, grief, and “I am not sure yet” all belong
                here.
              </p>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-muted-foreground">
                What do you want to keep, change, release, or re-choose? Answer only what is true
                today; you can revise this whenever you like.
              </p>
              <div className="space-y-2">
                <Label htmlFor="pattern-commitment">
                  If you want one, a commitment in your own words (optional)
                </Label>
                <Textarea
                  id="pattern-commitment"
                  rows={2}
                  value={commitment}
                  onChange={(e) => setCommitment(e.target.value)}
                />
                <FormHelp help={PRACTICE_HELP.resolve} />
              </div>
              {RESOLVE_FIELDS.map((f) => (
                <div key={f.key} className="space-y-2">
                  <Label htmlFor={`rs-${f.key}`}>{f.label}</Label>
                  <Textarea
                    id={`rs-${f.key}`}
                    rows={2}
                    value={resolve[f.key] ?? ""}
                    onChange={(e) => setField(setResolve, f.key, e.target.value)}
                  />
                </div>
              ))}
            </>
          )}

          {step === 3 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="rf-expression">
                  What is one small expression of this you could try?
                </Label>
                <Textarea
                  id="rf-expression"
                  rows={2}
                  value={reinforce.expression ?? ""}
                  onChange={(e) => setField(setReinforce, "expression", e.target.value)}
                />
                <FormHelp help={PRACTICE_HELP.reinforce} />
              </div>
              <div className="rounded-lg border border-border/60 bg-background/40 p-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  If it helps, shape it as a simple if–then: “When [cue], I will [small action].”
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="rf-cue">When…</Label>
                    <Input
                      id="rf-cue"
                      value={reinforce.cue ?? ""}
                      onChange={(e) => setField(setReinforce, "cue", e.target.value)}
                      placeholder="the cue you would actually notice"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rf-action">I will…</Label>
                    <Input
                      id="rf-action"
                      value={reinforce.action ?? ""}
                      onChange={(e) => setField(setReinforce, "action", e.target.value)}
                      placeholder="something small enough to be possible"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rf-tenderness">
                  What would tenderness look like if this does not go as you hoped? (optional)
                </Label>
                <Textarea
                  id="rf-tenderness"
                  rows={2}
                  value={reinforce.tenderness ?? ""}
                  onChange={(e) => setField(setReinforce, "tenderness", e.target.value)}
                />
                <FormHelp help={PRACTICE_HELP.tenderness} />
              </div>
            </>
          )}

          <div className="flex flex-wrap gap-2 border-t border-border/50 pt-5">
            <Button onClick={() => handleSave(false)} disabled={saving || !canSave}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              {saved ? "Update this Pattern" : "Save this Pattern"}
            </Button>
            <Button variant="outline" onClick={() => handleSave(true)} disabled={saving || !canSave}>
              Make this a small experiment
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Both are equally complete. A Pattern can be saved while you are still uncertain, with no
            experiment and no evidence at all.
          </p>
          {saveError && (
            <p role="alert" className="text-sm text-destructive">
              {saveError}
            </p>
          )}
        </div>

        {saved && (
          <div className="mt-6 rounded-xl border border-border/60 bg-card p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-serif text-2xl text-foreground">This Pattern, today</h2>
              <span className="text-xs tracking-[0.15em] uppercase text-primary">
                {lifecycleLabel(saved)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Nothing here is measured or due. You can re-choose this today, or retire it without
              explanation.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => handleLifecycle({ rechoose: true })}>
                Re-choose this today
              </Button>
              {saved.retired_at ? (
                <Button size="sm" variant="ghost" onClick={() => handleLifecycle({ unretire: true })}>
                  Open this again
                </Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => handleLifecycle({ retire: true })}>
                  Retire this
                </Button>
              )}
            </div>
          </div>
        )}

        {saved && wantExperiment && (
          <div className="mt-6 rounded-xl border border-border/60 bg-card p-5 sm:p-6 space-y-4">
            <h2 className="font-serif text-2xl text-foreground">Field Notes for your experiment</h2>
            <p className="text-sm text-muted-foreground">
              Try → Notice → Return — the same evidence practice used everywhere in your Living
              Pattern. Choose a guide if one is useful, or write your own. None is better than
              another, and none is advice.
            </p>
            <div className="flex flex-wrap gap-2">
              {PRACTICE_GUIDES.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  aria-pressed={guideKey === g.key}
                  onClick={() => setGuideKey(g.key)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    guideKey === g.key
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-border/70 bg-card/60 text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {g.title}
                </button>
              ))}
            </div>

            {selectedGuide && (
              <div className="space-y-2 rounded-lg border border-border/60 bg-background/40 p-4 text-sm">
                <p className="text-muted-foreground">
                  <span className="text-primary">What this is for — </span>
                  {selectedGuide.purpose}
                </p>
                <p className="text-foreground">
                  <span className="text-primary">Try this — </span>
                  {selectedGuide.tryThis}
                </p>
                {selectedGuide.script && (
                  <p className="rounded-md border border-border/60 p-3 italic text-foreground">
                    “{selectedGuide.script}”
                  </p>
                )}
                <p className="text-muted-foreground">
                  <span className="text-primary">What you are testing — </span>
                  {selectedGuide.testing}
                </p>
                <p className="text-muted-foreground">
                  <span className="text-primary">What to notice afterwards — </span>
                  {selectedGuide.notice}
                </p>
                <p className="text-xs text-muted-foreground">{CHANGE_COURSE_NOTE}</p>
              </div>
            )}

            {guideKey === "own" && (
              <div className="space-y-2">
                <Label htmlFor="own-experiment">Your own experiment</Label>
                <Textarea
                  id="own-experiment"
                  rows={2}
                  value={ownText}
                  onChange={(e) => setOwnText(e.target.value)}
                  placeholder="In your own words, as small as you like."
                />
              </div>
            )}

            {guideKey && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="try-note">
                    What, if anything, are you curious to try? (optional)
                  </Label>
                  <Textarea
                    id="try-note"
                    rows={2}
                    value={tryText}
                    onChange={(e) => setTryText(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleBeginExperiment} disabled={creating}>
                    {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                    Begin this experiment
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setWantExperiment(false)}
                    disabled={creating}
                  >
                    Not now
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {saved && (
          <div className="mt-6 rounded-xl border border-border/60 bg-card p-5 sm:p-6 space-y-5">
            <h2 className="font-serif text-2xl text-foreground">Add a piece of evidence</h2>
            <p className="text-sm text-muted-foreground">
              Anything you noticed that belongs to this Pattern. Nothing here is graded, and nothing
              is claimed to have caused anything.
            </p>
            <div className="space-y-2">
              <Label htmlFor="evidence-body">What did you notice?</Label>
              <Textarea
                id="evidence-body"
                rows={3}
                value={evidenceBody}
                onChange={(e) => setEvidenceBody(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {EVIDENCE_RELATIONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  aria-pressed={evidenceRelation === r.value}
                  onClick={() =>
                    setEvidenceRelation((prev) => (prev === r.value ? null : r.value))
                  }
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    evidenceRelation === r.value
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-border/70 text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <Button onClick={handleAddEvidence} disabled={addingEvidence || !evidenceBody.trim()}>
              {addingEvidence && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              Add this
            </Button>

            {evidence.length > 0 && (
              <ul className="space-y-3 border-t border-border/50 pt-5">
                {evidence.map((e) => {
                  const body = typeof e.content?.body === "string" ? e.content.body : "";
                  const relation =
                    typeof e.content?.relation === "string" ? e.content.relation : null;
                  const relationLabel =
                    EVIDENCE_RELATIONS.find((r) => r.value === relation)?.label ?? null;
                  return (
                    <li key={e.id} className="rounded-lg border border-border/60 p-3">
                      <p className="text-xs text-muted-foreground">
                        {new Date(e.occurred_at).toLocaleString()}
                      </p>
                      {body && <p className="mt-1 text-sm text-foreground">{body}</p>}
                      {relationLabel && (
                        <p className="mt-1 text-xs text-primary">{relationLabel}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {saved && (
          <div className="mt-6 rounded-xl border border-border/60 bg-card p-5 sm:p-6 space-y-5">
            <h2 className="font-serif text-2xl text-foreground">Your own connections</h2>
            <p className="text-sm text-muted-foreground">
              Only you can make these. Nothing is linked because two records happen to sit close
              together in time, and a link never implies cause.
            </p>

            {patternExperiments.length > 0 && (
              <div className="space-y-2">
                <Label>Experiments you began here</Label>
                <ul className="space-y-2">
                  {patternExperiments.map((x) => (
                    <li key={x.id}>
                      <Link
                        to={`/living-pattern/experiments/${x.id}`}
                        className="block rounded-lg border border-border/60 p-3 text-sm text-foreground transition-colors hover:border-primary/50"
                      >
                        {x.own_experiment || guideByKey(x.guide_key)?.title || "An experiment"}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {states.length > 0 && (
              <div className="space-y-2">
                <Label>Link to a State of Being</Label>
                <div className="flex flex-wrap gap-2">
                  {states.slice(0, 8).map((s) => (
                    <Button
                      key={s.id}
                      size="sm"
                      variant="outline"
                      onClick={() => handleLink("state", s.id)}
                    >
                      {new Date(s.occurred_at).toLocaleDateString()}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {experiments.length > 0 && (
              <div className="space-y-2">
                <Label>Link to an experiment of yours</Label>
                <div className="flex flex-wrap gap-2">
                  {experiments.slice(0, 8).map((x) => (
                    <Button
                      key={x.id}
                      size="sm"
                      variant="outline"
                      onClick={() => handleLink("experiment", x.id)}
                    >
                      {x.own_experiment?.slice(0, 40) ||
                        guideByKey(x.guide_key)?.title ||
                        "An experiment"}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              <Link to="/living-pattern/patterns" className="underline hover:text-foreground">
                My Patterns
              </Link>{" "}
              ·{" "}
              <Link to="/living-pattern/experiments" className="underline hover:text-foreground">
                My experiments
              </Link>
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default LivingPatternPractice;
