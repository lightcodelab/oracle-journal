import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Home, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMemberState } from "@/hooks/useMemberState";
import NavActions from "@/components/NavActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createMoment,
  getMoment,
  linkMoment,
  tagMomentResource,
  updateMoment,
  useOwnStates,
  type MomentPayload,
} from "@/hooks/useLivingMoments";
import { useOwnPatterns } from "@/hooks/useLivingStates";
import { createExperiment } from "@/hooks/useLivingExperiments";
import {
  CHANGE_COURSE_NOTE,
  PRESENCE_GUIDES,
  guideByKey,
} from "@/components/temple/living/experimentGuides";

/**
 * LP-D — Presence / Moments of Meaning.
 *
 * Private, owner-only. Register → Recognise → Recalibrate. Nothing here
 * diagnoses, argues a feeling away, scores, reminds, shares, or analyses.
 * "Meaningful" means noticed: delight, relief, courage, beauty and evidence
 * that something is working belong here as much as difficulty does.
 *
 * No Arrival table, route, query, prefill or reference exists in this file.
 */

type Step = 1 | 2 | 3;

const REGISTER_FIELDS = [
  { key: "happened", label: "What happened?", rows: 3 },
  { key: "stood_out", label: "What stood out?", rows: 2 },
  {
    key: "noticed_first",
    label: "What did you notice first — in the moment, in your body, or afterward?",
    rows: 2,
  },
] as const;

const RECOGNISE_FIELDS = [
  { key: "meaning", label: "What am I making this mean?" },
  { key: "prediction", label: "What does my mind seem to be predicting?" },
  { key: "told_before", label: "Where has this story been told before, if anywhere?" },
  {
    key: "then_now",
    label: "Am I saying: “this happened then, therefore it is happening now”?",
  },
  { key: "facts", label: "What do I know as fact?" },
  { key: "story", label: "What is story, prediction, or interpretation?" },
  { key: "else_true", label: "What else could plausibly be true?" },
  {
    key: "protector",
    label:
      "Is a protective part trying to help here? What might it be trying to prevent or protect?",
  },
] as const;

const RECALIBRATE_FIELDS = [
  { key: "next_choice", label: "What is my grounded next choice?" },
  {
    key: "small_action",
    label: "What small action could give me more information than this story has right now?",
  },
  {
    key: "identity",
    label: "Which identity is this next choice reinforcing? (optional)",
  },
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

const LivingPatternPresence = () => {
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { hasFullTempleAccess, isAdmin, loading: memberLoading } = useMemberState();

  const [step, setStep] = useState<Step>(1);
  const [label, setLabel] = useState("");
  const [register, setRegister] = useState<TextMap>({});
  const [recognise, setRecognise] = useState<TextMap>({});
  const [recalibrate, setRecalibrate] = useState<TextMap>({});
  const [openInquiry, setOpenInquiry] = useState<string[]>(["meaning"]);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState<MomentPayload | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(!!routeId);

  const [wantExperiment, setWantExperiment] = useState(false);
  const [guideKey, setGuideKey] = useState<string | null>(null);
  const [ownText, setOwnText] = useState("");
  const [tryText, setTryText] = useState("");
  const [creating, setCreating] = useState(false);
  const selectedGuide = guideByKey(guideKey);

  const accessResolved = !authLoading && !memberLoading && !!user;
  const { patterns } = useOwnPatterns(accessResolved && hasFullTempleAccess);
  const states = useOwnStates(accessResolved && hasFullTempleAccess);

  const [tagQuery, setTagQuery] = useState("");
  const [tagResults, setTagResults] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  // Opening an existing Moment of her own.
  useEffect(() => {
    if (!routeId || !accessResolved || !hasFullTempleAccess) return;
    let cancelled = false;
    (async () => {
      try {
        const payload = await getMoment(routeId);
        if (cancelled) return;
        setSaved(payload);
        setLabel(payload.moment.label ?? "");
        setRegister(asMap(payload.movements.register?.content));
        setRecognise(asMap(payload.movements.recognise?.content));
        setRecalibrate(asMap(payload.movements.recalibrate?.content));
      } catch (e) {
        if (!cancelled) setSaveError(e instanceof Error ? e.message : "Could not open that Moment.");
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [routeId, accessResolved, hasFullTempleAccess]);

  // Optional Temple support tag: her own search, her own choice.
  useEffect(() => {
    const q = tagQuery.trim();
    if (q.length < 2) {
      setTagResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("content_resources")
        .select("id, title")
        .eq("status", "published")
        .ilike("title", `%${q}%`)
        .limit(6);
      if (!cancelled) setTagResults(data ?? []);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [tagQuery]);

  const canSave = useMemo(
    () =>
      [register, recognise, recalibrate].some((m) =>
        Object.values(m).some((v) => v.trim().length > 0),
      ) || label.trim().length > 0,
    [register, recognise, recalibrate, label],
  );

  const setField = (
    set: (fn: (prev: TextMap) => TextMap) => void,
    key: string,
    value: string,
  ) => set((prev) => ({ ...prev, [key]: value }));

  const handleSave = async (alsoExperiment: boolean) => {
    setSaving(true);
    setSaveError(null);
    try {
      if (saved) {
        const updated = await updateMoment(saved.moment.id, saved.moment.content_revision, {
          label: label.trim() || null,
          register: trimmed(register),
          recognise: trimmed(recognise),
          recalibrate: trimmed(recalibrate),
        });
        setSaved(updated);
        toast.success("Your Moment has been updated.");
      } else {
        const created = await createMoment({
          label: label.trim() || null,
          register: trimmed(register),
          recognise: trimmed(recognise),
          recalibrate: trimmed(recalibrate),
        });
        const confirmed = await getMoment(created.moment.id);
        setSaved(confirmed);
        toast.success("Your Moment of Meaning is saved to your private record.");
      }
      setWantExperiment(alsoExperiment);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Something went wrong while saving.");
    } finally {
      setSaving(false);
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
        momentId: saved.moment.id,
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

  const handleLink = async (kind: "state" | "pattern", targetId: string) => {
    if (!saved) return;
    try {
      await linkMoment(saved.moment.id, kind, targetId);
      toast.success("Linked, because you said so — nothing is assumed.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create that link.");
    }
  };

  const handleTag = async (resourceId: string) => {
    if (!saved) return;
    try {
      await tagMomentResource(saved.moment.id, resourceId);
      setTagQuery("");
      toast.success("Support tag added to your private record.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add that tag.");
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
          <h1 className="font-serif text-3xl text-foreground mb-4">Your Living Pattern is private</h1>
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
        <p className="text-[0.7rem] tracking-[0.2em] uppercase text-primary">Moments of Meaning</p>
        <h1 className="font-serif text-3xl sm:text-4xl text-foreground mt-1">Presence</h1>
        <p className="mt-3 text-muted-foreground max-w-2xl leading-relaxed">
          Something stood out. This is a private place to meet it before a familiar story quietly
          makes the choice for you. Delight, relief, beauty, courage, surprise and evidence that
          something is working belong here as much as difficulty does. Nothing is required, and
          nothing is shared.
        </p>

        <nav aria-label="Presence movement" className="mt-8 flex flex-wrap gap-2">
          {(["Register", "Recognise", "Recalibrate"] as const).map((l, i) => {
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

        <div className="mt-6 rounded-xl border border-border/60 bg-card p-5 sm:p-6 space-y-6">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="moment-label">A few words to remember this by (optional)</Label>
                <Input
                  id="moment-label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="However you would name this moment."
                />
              </div>
              {REGISTER_FIELDS.map((f) => (
                <div key={f.key} className="space-y-2">
                  <Label htmlFor={`reg-${f.key}`}>{f.label}</Label>
                  <Textarea
                    id={`reg-${f.key}`}
                    rows={f.rows}
                    value={register[f.key] ?? ""}
                    onChange={(e) => setField(setRegister, f.key, e.target.value)}
                    placeholder="As much or as little as you like."
                  />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Every field here is optional. Nothing needs to be disclosed, and nothing needs to
                have gone wrong.
              </p>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-muted-foreground">
                Answer only the questions you want. There is nothing to get right here — you are simply
                separating what happened from what you are making it mean.
              </p>
              {RECOGNISE_FIELDS.map((f) => (
                <div key={f.key} className="space-y-2">
                  <Label htmlFor={`recog-${f.key}`}>{f.label}</Label>
                  <Textarea
                    id={`recog-${f.key}`}
                    rows={2}
                    value={recognise[f.key] ?? ""}
                    onChange={(e) => setField(setRecognise, f.key, e.target.value)}
                  />
                </div>
              ))}
            </>
          )}

          {step === 3 && (
            <>
              {RECALIBRATE_FIELDS.map((f) => (
                <div key={f.key} className="space-y-2">
                  <Label htmlFor={`rec-${f.key}`}>{f.label}</Label>
                  <Textarea
                    id={`rec-${f.key}`}
                    rows={2}
                    value={recalibrate[f.key] ?? ""}
                    onChange={(e) => setField(setRecalibrate, f.key, e.target.value)}
                  />
                </div>
              ))}
            </>
          )}

          <div className="flex flex-wrap gap-2 border-t border-border/50 pt-5">
            <Button onClick={() => handleSave(false)} disabled={saving || !canSave}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              {saved ? "Update this Moment" : "Save this Moment"}
            </Button>
            <Button variant="outline" onClick={() => handleSave(true)} disabled={saving || !canSave}>
              Make this a small experiment
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Both are equally complete. Saving a Moment needs no experiment, and an experiment can be
            stopped, changed, or returned to with “not enough information yet”.
          </p>
          {saveError && (
            <p role="alert" className="text-sm text-destructive">
              {saveError}
            </p>
          )}
        </div>

        {saved && wantExperiment && (
          <div className="mt-6 rounded-xl border border-border/60 bg-card p-5 sm:p-6 space-y-4">
            <h2 className="font-serif text-2xl text-foreground">Field Notes for your experiment</h2>
            <p className="text-sm text-muted-foreground">
              Try → Notice → Return. Choose a guide if one is useful, or write your own. None of these
              is better than another, and none is advice.
            </p>
            <div className="flex flex-wrap gap-2">
              {PRESENCE_GUIDES.map((g) => (
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
                  <Button variant="ghost" onClick={() => setWantExperiment(false)} disabled={creating}>
                    Not now
                  </Button>
                </div>
              </>
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

            {patterns.length > 0 && (
              <div className="space-y-2">
                <Label>Link to a Pattern of Choosing</Label>
                <div className="flex flex-wrap gap-2">
                  {patterns.slice(0, 8).map((p) => (
                    <Button
                      key={p.id}
                      size="sm"
                      variant="outline"
                      onClick={() => handleLink("pattern", p.id)}
                    >
                      {p.label || "Pattern of Choosing"}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="tag-search">Tag Temple support you turned to (optional)</Label>
              <Input
                id="tag-search"
                value={tagQuery}
                onChange={(e) => setTagQuery(e.target.value)}
                placeholder="Search by title"
              />
              {tagResults.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tagResults.map((r) => (
                    <Button key={r.id} size="sm" variant="outline" onClick={() => handleTag(r.id)}>
                      {r.title}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              <Link to="/living-pattern/moments" className="underline hover:text-foreground">
                My Moments
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

export default LivingPatternPresence;
