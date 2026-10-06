import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, ArrowUpRight, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { RitualVisit, RitualVisitStep, itemTypeLabel, ritualsDb, spreadName } from "@/lib/rituals";
import { stepKey, useStepCatalog } from "@/lib/ritualCatalog";
import { setActiveRitualVisit } from "@/components/rituals/RitualReturnPill";
import { RitualsShell } from "./MyRituals";

type SaveState = "idle" | "saving" | "saved" | "error";

/** Debounced autosave for a single text field; keeps the text on failure. */
function useAutosave(save: (v: string) => Promise<{ error: any }>, initial: string) {
  const [value, setValue] = useState(initial);
  const [state, setState] = useState<SaveState>("idle");
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setState("saving");
    const t = setTimeout(async () => {
      const { error } = await save(value);
      setState(error ? "error" : "saved");
    }, 800);
    return () => clearTimeout(t);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const retry = async () => { setState("saving"); const { error } = await save(value); setState(error ? "error" : "saved"); };
  return { value, setValue, state, retry };
}

function SaveHint({ state, retry }: { state: SaveState; retry: () => void }) {
  if (state === "saving") return <span className="text-xs text-muted-foreground">Saving…</span>;
  if (state === "saved") return <span className="text-xs text-muted-foreground">Saved</span>;
  if (state === "error") return <span className="text-xs text-destructive">Not saved — <button className="underline" onClick={retry}>try again</button></span>;
  return null;
}

const RitualVisitPage = () => {
  const { id: ritualId, visitId: visitParam } = useParams<{ id?: string; visitId?: string }>();
  const [visitId, setVisitId] = useState<string | null>(visitParam ?? null);
  const [startError, setStartError] = useState<string | null>(null);

  // Begin or resume: the server returns the one unfinished visit for this ritual.
  useEffect(() => {
    if (visitParam || !ritualId) return;
    (async () => {
      const { data, error } = await ritualsDb.rpc("start_or_resume_ritual_visit", { _ritual_id: ritualId });
      if (error) setStartError(error.message);
      else setVisitId(data as string);
    })();
  }, [ritualId, visitParam]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["ritual-visit", visitId],
    enabled: !!visitId,
    queryFn: async () => {
      const [v, s] = await Promise.all([
        ritualsDb.from("ritual_visits").select("*").eq("id", visitId).maybeSingle(),
        ritualsDb.from("ritual_visit_steps").select("*").eq("visit_id", visitId).order("position"),
      ]);
      if (v.error) throw v.error;
      if (s.error) throw s.error;
      return { visit: v.data as RitualVisit | null, steps: (s.data ?? []) as RitualVisitStep[] };
    },
  });

  // Refresh links (e.g. a reading drawn in another page) when returning to this tab.
  useEffect(() => {
    const onFocus = () => refetch();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refetch]);

  const crumbs = [{ label: "My Rituals", href: "/rituals" }];
  if (startError) return <RitualsShell crumbs={crumbs}><p role="alert" className="pt-10 text-destructive">{startError}</p></RitualsShell>;
  if (!visitId || isLoading) return <RitualsShell crumbs={crumbs}><p className="pt-10 text-muted-foreground">Opening your ritual…</p></RitualsShell>;
  if (!data?.visit) return <RitualsShell crumbs={crumbs}><p className="pt-10 text-muted-foreground">This visit couldn't be found.</p></RitualsShell>;

  return <VisitBody visit={data.visit} steps={data.steps} />;
};

function VisitBody({ visit, steps }: { visit: RitualVisit; steps: RitualVisitStep[] }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: catalog = {} } = useStepCatalog(steps);
  const [saving, setSaving] = useState(false);
  const open = visit.status === "in_progress";

  const reflection = useAutosave(
    (v) => ritualsDb.from("ritual_visits").update({ closing_reflection: v || null }).eq("id", visit.id),
    visit.closing_reflection ?? "",
  );

  const saveVisit = async () => {
    setSaving(true);
    const { error } = await ritualsDb.from("ritual_visits").update({ status: "saved", closing_reflection: reflection.value || null }).eq("id", visit.id);
    setSaving(false);
    if (error) return toast({ title: "Couldn't save your visit", description: "Your writing is kept here. Please try again.", variant: "destructive" });
    setActiveRitualVisit(null);
    qc.invalidateQueries({ queryKey: ["ritual-visits"] });
    toast({ title: "Visit saved" });
    navigate(`/rituals/${visit.ritual_id}`);
  };

  const hrefFor = (s: RitualVisitStep): string | null => {
    if (s.kind === "deck") {
      if (s.drawn_card_id) return `/remembrance?deck=${s.deck_id}&card=${s.drawn_card_id}`;
      return open ? `/remembrance?deck=${s.deck_id}&ritualStep=${s.id}` : null;
    }
    if (s.kind === "spread") {
      if (s.saved_reading_id) return `/readings?reading=${s.saved_reading_id}`;
      return open ? `/remembrance/spreads?spread=${s.spread_type}&ritualStep=${s.id}` : null;
    }
    return catalog[stepKey(s)]?.href ?? null;
  };

  const actionLabel = (s: RitualVisitStep) =>
    s.kind === "deck" ? (s.drawn_card_id ? "Open your card" : "Draw a card")
    : s.kind === "spread" ? (s.saved_reading_id ? "Open your reading" : "Draw the spread")
    : "Open resource";

  return (
    <RitualsShell crumbs={[{ label: "My Rituals", href: "/rituals" }, { label: visit.ritual_name, href: `/rituals/${visit.ritual_id}` }, { label: open ? "Visit" : format(new Date(visit.saved_at ?? visit.started_at), "d MMM yyyy") }]}>
      <header className="pt-6 pb-8">
        <p className="text-sm text-muted-foreground">
          {open ? `Started ${format(new Date(visit.started_at), "d MMMM yyyy")}` : `Saved ${format(new Date(visit.saved_at ?? visit.started_at), "d MMMM yyyy")}`}
        </p>
        <h1 className="font-serif text-4xl text-foreground">{visit.ritual_name}</h1>
        {visit.ritual_intention && <p className="mt-2 text-muted-foreground italic">{visit.ritual_intention}</p>}
        {open && <p className="mt-3 text-sm text-muted-foreground">Move through the steps in your own way. Skip anything, write only if you wish, and save when you're ready.</p>}
      </header>

      <ol className="space-y-4">
        {steps.map((s, i) => (
          <StepCard key={s.id} step={s} index={i} open={open}
            title={s.label || catalog[stepKey(s)]?.name || (s.kind === "spread" ? spreadName(s.spread_type) : itemTypeLabel(s.kind))}
            unavailable={s.kind === "resource" && !!catalog && Object.keys(catalog).length > 0 && !catalog[stepKey(s)]?.available}
            href={hrefFor(s)} actionLabel={actionLabel(s)}
            onOpen={() => setActiveRitualVisit({ ritualId: visit.ritual_id, ritualName: visit.ritual_name })}
          />
        ))}
      </ol>

      <section className="mt-10 bg-card border border-border rounded-lg p-5 space-y-2" aria-labelledby="closing-heading">
        <div className="flex items-center justify-between">
          <h2 id="closing-heading" className="font-serif text-xl text-foreground">Closing reflection (optional)</h2>
          <SaveHint state={reflection.state} retry={reflection.retry} />
        </div>
        <Textarea aria-labelledby="closing-heading" rows={5} value={reflection.value} onChange={(e) => reflection.setValue(e.target.value)} placeholder="What did you notice?" />
      </section>

      {open && (
        <div className="mt-6 flex flex-wrap gap-3">
          <Button size="lg" onClick={saveVisit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />} Save visit
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to={`/rituals/${visit.ritual_id}`}>Leave and resume later</Link>
          </Button>
        </div>
      )}
    </RitualsShell>
  );
}

function StepCard({ step, index, open, title, unavailable, href, actionLabel, onOpen }: {
  step: RitualVisitStep; index: number; open: boolean; title: string; unavailable: boolean;
  href: string | null; actionLabel: string; onOpen: () => void;
}) {
  const [done, setDone] = useState(step.marked_done);
  const note = useAutosave(
    (v) => ritualsDb.from("ritual_visit_steps").update({ note: v || null }).eq("id", step.id),
    step.note ?? "",
  );
  const toggle = async (v: boolean) => {
    setDone(v);
    const { error } = await ritualsDb.from("ritual_visit_steps").update({ marked_done: v }).eq("id", step.id);
    if (error) setDone(!v);
  };

  return (
    <li className="bg-card border border-border rounded-lg p-5 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="font-serif text-xl text-primary w-6">{index + 1}</span>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{itemTypeLabel(step.kind)}</p>
            <h3 className="font-serif text-lg text-foreground">{title}</h3>
          </div>
        </div>
        {href && !unavailable && (
          <Button asChild size="sm" variant="outline">
            <Link to={href} onClick={onOpen}>{actionLabel} <ArrowUpRight className="h-4 w-4 ml-1" /></Link>
          </Button>
        )}
      </div>
      {unavailable && (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden /> This item is no longer available. Your notes are kept; you can choose a replacement on the ritual page.
        </p>
      )}
      {step.journal_prompt && <p className="text-sm italic text-foreground/80">{step.journal_prompt}</p>}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label htmlFor={`note-${step.id}`} className="text-sm text-muted-foreground">Notes (optional)</label>
          <SaveHint state={note.state} retry={note.retry} />
        </div>
        <Textarea id={`note-${step.id}`} rows={3} value={note.value} onChange={(e) => note.setValue(e.target.value)} />
      </div>
      {open && (
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer w-fit min-h-11">
          <Checkbox checked={done} onCheckedChange={(v) => toggle(!!v)} /> I've spent time with this step
        </label>
      )}
    </li>
  );
}

export default RitualVisitPage;
