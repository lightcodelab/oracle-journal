import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Home, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMemberState } from "@/hooks/useMemberState";
import NavActions from "@/components/NavActions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  createLivingState,
  getLivingState,
  linkStateToPattern,
  updateLivingState,
  useOwnPatterns,
  type LivingStateRecord,
} from "@/hooks/useLivingStates";
import { createExperiment } from "@/hooks/useLivingExperiments";
import {
  CHANGE_COURSE_NOTE,
  EXPERIMENT_GUIDES,
  guideByKey,
} from "@/components/temple/living/experimentGuides";
import { FormHelp, GuideScriptPanel, MovementNote } from "@/components/temple/living/FormHelp";
import {
  GLOBAL_MOVEMENT_HELPER,
  PAUSE_HELP,
} from "@/components/temple/living/orientationContent";

/**
 * States of Being — Pause (LP-C).
 *
 * Register → Receive → Reorient. Private to its owner; every read and write
 * goes through the LP-B owner-scoped RPCs. No Arrival reference, route, or data
 * path exists here.
 */

const FEELING_OPTIONS = [
  "Tender",
  "Tired",
  "Activated",
  "Heavy",
  "Numb",
  "Steady",
  "Quietly well",
  "Rested",
  "Content",
  "Connected",
  "Grateful",
  "Playful",
  "Alive",
  "Expansive",
  "Clear",
];

const CAPACITY_OPTIONS = [
  "Very little today",
  "Some, carefully",
  "Ordinary",
  "More than usual",
];

type Step = 1 | 2 | 3;

function Chips({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(o)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              on
                ? "border-primary bg-primary/15 text-foreground"
                : "border-border/70 bg-card/60 text-muted-foreground hover:border-primary/50"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

const LivingPatternPause = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { hasFullTempleAccess, isAdmin, loading: memberLoading } = useMemberState();

  const [step, setStep] = useState<Step>(1);
  const [feelingWords, setFeelingWords] = useState<string[]>([]);
  const [feelingNote, setFeelingNote] = useState("");
  const [bodyNote, setBodyNote] = useState("");
  const [capacityLevel, setCapacityLevel] = useState<string[]>([]);
  const [capacityNote, setCapacityNote] = useState("");
  const [desiredNote, setDesiredNote] = useState("");
  const [receiveNote, setReceiveNote] = useState("");
  const [supportNote, setSupportNote] = useState("");
  const [reorientNote, setReorientNote] = useState("");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<LivingStateRecord | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [linkedPatternId, setLinkedPatternId] = useState<string | null>(null);

  // LP-C.1 — optional Field Notes experiment. Never compulsory, never superior.
  const [wantExperiment, setWantExperiment] = useState(false);
  const [guideKey, setGuideKey] = useState<string | null>(null);
  const [ownText, setOwnText] = useState("");
  const [tryText, setTryText] = useState("");
  const [safeText, setSafeText] = useState("");
  const [creating, setCreating] = useState(false);
  const selectedGuide = guideByKey(guideKey);

  const accessResolved = !authLoading && !memberLoading && !!user;
  const { patterns } = useOwnPatterns(accessResolved && hasFullTempleAccess);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  const canSave = useMemo(
    () =>
      feelingWords.length > 0 ||
      [feelingNote, bodyNote, capacityNote, desiredNote, receiveNote, supportNote, reorientNote]
        .some((v) => v.trim().length > 0),
    [feelingWords, feelingNote, bodyNote, capacityNote, desiredNote, receiveNote, supportNote, reorientNote],
  );

  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const handleSave = async (alsoExperiment: boolean) => {
    setSaving(true);
    setSaveError(null);
    try {
      const record = await createLivingState({
        feeling: { words: feelingWords, note: feelingNote.trim() },
        body: { note: bodyNote.trim() },
        capacity: { level: capacityLevel[0] ?? null, note: capacityNote.trim() },
        desired_state: { note: desiredNote.trim() },
        receive: { acknowledgement: receiveNote.trim(), support: supportNote.trim() },
        reorient: { next_direction: reorientNote.trim() },
      });
      // Owner-only read-back confirms the record exists and belongs to her.
      const confirmed = await getLivingState(record.id);
      setSaved(confirmed);
      setWantExperiment(alsoExperiment);
      toast.success("Your State of Being is saved to your private record.");
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
        stateId: saved.id,
        guideKey,
        ownExperiment: guideKey === "own" ? ownText : null,
        tryBody: tryText,
        trySafeEnough: safeText,
      });
      navigate(`/living-pattern/experiments/${experiment.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not begin that experiment.");
    } finally {
      setCreating(false);
    }
  };

  const handleAmend = async () => {
    if (!saved) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateLivingState(saved.id, saved.content_revision, {
        reorient: { next_direction: reorientNote.trim() },
      });
      setSaved(updated);
      toast.success("Your record has been updated.");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not update this record.");
    } finally {
      setSaving(false);
    }
  };

  const handleLink = async (patternId: string) => {
    if (!saved) return;
    try {
      await linkStateToPattern(saved.id, patternId);
      setLinkedPatternId(patternId);
      toast.success("Linked to your Pattern of Choosing.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create that link.");
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
          to="/temple"
          className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="font-medium truncate">Back to Home</span>
        </Link>
        <NavActions />
      </header>

      <main className="max-w-3xl mx-auto px-4 pb-16">
        <p className="text-[0.7rem] tracking-[0.2em] uppercase text-primary">States of Being</p>
        <h1 className="font-serif text-3xl sm:text-4xl text-foreground mt-1">Pause</h1>
        <p className="mt-3 text-muted-foreground max-w-2xl leading-relaxed">
          A private note of how you are, right now. Difficult, neutral, restful,
          joyful, connected, or quietly well — all of it belongs here. Nothing is
          a problem to be solved, and nothing is shared.
        </p>

        {!saved && (
          <>
            <nav aria-label="Pause movement" className="mt-8 flex flex-wrap gap-2">
              {(["Register", "Receive", "Reorient"] as const).map((label, i) => {
                const n = (i + 1) as Step;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setStep(n)}
                    aria-current={step === n ? "step" : undefined}
                    className={`rounded-md border px-3 py-1.5 text-sm ${
                      step === n
                        ? "border-primary bg-primary/15 text-foreground"
                        : "border-border/70 text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </nav>
            <MovementNote>{GLOBAL_MOVEMENT_HELPER}</MovementNote>

            <div className="mt-6 rounded-xl border border-border/60 bg-card p-5 sm:p-6 space-y-6">
              {step === 1 && (
                <>
                  <div className="space-y-2">
                    <Label>What is here in you? Choose any that fit.</Label>
                    <Chips
                      options={FEELING_OPTIONS}
                      selected={feelingWords}
                      onToggle={(v) => toggle(feelingWords, setFeelingWords, v)}
                    />
                    <FormHelp help={PAUSE_HELP.register} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="feeling-note">In your own words (optional)</Label>
                    <Textarea
                      id="feeling-note"
                      rows={3}
                      value={feelingNote}
                      onChange={(e) => setFeelingNote(e.target.value)}
                      placeholder="However you would describe this state."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="body-note">Your body, if useful (optional)</Label>
                    <Textarea
                      id="body-note"
                      rows={2}
                      value={bodyNote}
                      onChange={(e) => setBodyNote(e.target.value)}
                      placeholder="Where you notice this, or how your body feels."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Capacity today, if useful (optional)</Label>
                    <Chips
                      options={CAPACITY_OPTIONS}
                      selected={capacityLevel}
                      onToggle={(v) => setCapacityLevel(capacityLevel[0] === v ? [] : [v])}
                    />
                    <Textarea
                      rows={2}
                      value={capacityNote}
                      onChange={(e) => setCapacityNote(e.target.value)}
                      placeholder="Anything shaping your capacity right now."
                      aria-label="Capacity note"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="desired-note">
                      Is there a state you are longing to move toward? (optional)
                    </Label>
                    <Textarea
                      id="desired-note"
                      rows={2}
                      value={desiredNote}
                      onChange={(e) => setDesiredNote(e.target.value)}
                      placeholder="Not a goal — just what you would like to feel more of."
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={() => setStep(2)}>Continue to Receive</Button>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="receive-note">
                      Can you let this state be here, without treating it as something to defeat?
                    </Label>
                    <Textarea
                      id="receive-note"
                      rows={3}
                      value={receiveNote}
                      onChange={(e) => setReceiveNote(e.target.value)}
                      placeholder="What it is like to simply acknowledge this."
                    />
                    <FormHelp help={PAUSE_HELP.receive} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="support-note">
                      What care, space, or support would meet you here? (optional)
                    </Label>
                    <Textarea
                      id="support-note"
                      rows={3}
                      value={supportNote}
                      onChange={(e) => setSupportNote(e.target.value)}
                      placeholder="Rest, water, air, quiet, a person, a boundary, more time."
                    />
                  </div>
                  <div className="flex flex-wrap justify-between gap-2">
                    <Button variant="ghost" onClick={() => setStep(1)}>
                      Back
                    </Button>
                    <Button onClick={() => setStep(3)}>Continue to Reorient</Button>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="reorient-note">
                      What is the smallest grounded next direction you can take?
                    </Label>
                    <Textarea
                      id="reorient-note"
                      rows={3}
                      value={reorientNote}
                      onChange={(e) => setReorientNote(e.target.value)}
                      placeholder="Small is enough. It can be one breath, or one honest sentence."
                    />
                  </div>
                  {saveError && (
                    <p role="alert" className="text-sm text-destructive">
                      {saveError}
                    </p>
                  )}
                  <div className="border-t border-border/60 pt-5 space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Two equally good ways to finish. Neither is more complete than the other.
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button onClick={() => handleSave(false)} disabled={saving || !canSave}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                        Save this State
                      </Button>
                      <Button onClick={() => handleSave(true)} disabled={saving || !canSave}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                        Make this a small experiment
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" onClick={() => setStep(2)}>
                      Back
                    </Button>
                  </div>
                  {!canSave && (
                    <p className="text-xs text-muted-foreground">
                      Add a word or a note anywhere in this Pause and it can be saved.
                    </p>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {saved && (
          <div className="mt-8 rounded-xl border border-border/60 bg-card p-5 sm:p-6 space-y-6">
            <div className="flex items-start gap-2">
              <Check className="mt-0.5 h-5 w-5 text-primary shrink-0" aria-hidden />
              <div>
                <h2 className="font-serif text-xl text-foreground">Saved to your private record</h2>
                <p className="text-sm text-muted-foreground">
                  Recorded{" "}
                  {new Date(saved.occurred_at).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                  . Only you can see it.
                </p>
              </div>
            </div>

            <div className="space-y-4 border-t border-border/60 pt-5">
              {!wantExperiment ? (
                <>
                  <p className="text-sm text-foreground">
                    This State is complete on its own. If you would like, you can also make it a small
                    experiment — equally optional, and never better.
                  </p>
                  <Button variant="outline" onClick={() => setWantExperiment(true)}>
                    Make this a small experiment
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-foreground">
                    Choose a Guide, if one is useful. Nothing here is advice, and none is recommended
                    over another.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {EXPERIMENT_GUIDES.map((g) => (
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
                      <div className="space-y-2">
                        <Label htmlFor="safe-note">
                          What would make this safe enough to try? (optional)
                        </Label>
                        <Textarea
                          id="safe-note"
                          rows={2}
                          value={safeText}
                          onChange={(e) => setSafeText(e.target.value)}
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
                </>
              )}
              <p className="text-xs text-muted-foreground">
                <Link to="/living-pattern/experiments" className="underline hover:text-foreground">
                  My experiments
                </Link>{" "}
                — return to any of them whenever you have more information.
              </p>
            </div>



            <div className="space-y-2">
              <Label htmlFor="amend-note">Your next direction</Label>
              <Textarea
                id="amend-note"
                rows={3}
                value={reorientNote}
                onChange={(e) => setReorientNote(e.target.value)}
              />
              <Button variant="outline" onClick={handleAmend} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                Update this record
              </Button>
              {saveError && (
                <p role="alert" className="text-sm text-destructive">
                  {saveError}
                </p>
              )}
            </div>

            {patterns.length > 0 && (
              <div className="space-y-2 border-t border-border/60 pt-5">
                <p className="text-sm text-foreground">
                  Would it be useful to link this next direction to a Pattern of Choosing you are
                  strengthening? Entirely optional.
                </p>
                <div className="flex flex-wrap gap-2">
                  {patterns.map((p) => (
                    <Button
                      key={p.id}
                      size="sm"
                      variant={linkedPatternId === p.id ? "default" : "outline"}
                      onClick={() => handleLink(p.id)}
                      disabled={linkedPatternId === p.id}
                    >
                      {linkedPatternId === p.id ? "Linked: " : ""}
                      {p.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 border-t border-border/60 pt-5">
              <Button asChild variant="ghost">
                <Link to="/temple">Back to Home</Link>
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default LivingPatternPause;
