import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2, AlertTriangle, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { SPREAD_TYPES } from "@/components/SpreadSelection";
import {
  RHYTHMS, RitualAddItem, RitualRhythm, RitualStep, appendRitualStep, itemTypeLabel, ritualsDb, useRitual, useRitualVisits,
} from "@/lib/rituals";
import { stepKey, useStepCatalog } from "@/lib/ritualCatalog";
import { RitualsShell } from "./MyRituals";
import RitualVisitHistory from "@/components/rituals/RitualVisitHistory";

const RitualDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useRitual(id);
  const { data: visits = [] } = useRitualVisits(id);
  const steps = data?.steps ?? [];
  const { data: catalog = {} } = useStepCatalog(steps);
  const openVisit = visits.find((v) => v.status === "in_progress");

  const [name, setName] = useState("");
  const [intention, setIntention] = useState("");
  const [rhythm, setRhythm] = useState<RitualRhythm>("daily");
  const [savingMeta, setSavingMeta] = useState(false);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (data?.ritual) {
      setName(data.ritual.name);
      setIntention(data.ritual.intention ?? "");
      setRhythm(data.ritual.rhythm);
    }
  }, [data?.ritual?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = () => qc.invalidateQueries({ queryKey: ["ritual", id] });

  const fail = (e: any) => toast({ title: "Couldn't save", description: e?.message ?? "Please try again.", variant: "destructive" });

  const saveMeta = async () => {
    if (!name.trim()) return;
    setSavingMeta(true);
    const { error } = await ritualsDb.from("rituals").update({ name: name.trim(), intention: intention.trim() || null, rhythm, updated_at: new Date().toISOString() }).eq("id", id);
    setSavingMeta(false);
    if (error) return fail(error);
    qc.invalidateQueries({ queryKey: ["rituals"] });
    refresh();
    toast({ title: "Ritual saved" });
  };

  const move = async (index: number, dir: -1 | 1) => {
    const other = steps[index + dir];
    if (!other || busy) return;
    setBusy(true);
    // Renumber the whole list so positions stay unique and ordered.
    const order = [...steps];
    [order[index], order[index + dir]] = [order[index + dir], order[index]];
    const results = await Promise.all(order.map((s, i) => ritualsDb.from("ritual_steps").update({ position: i }).eq("id", s.id)));
    setBusy(false);
    const err = results.find((r: any) => r.error)?.error;
    if (err) fail(err);
    refresh();
  };

  const remove = async (step: RitualStep) => {
    setBusy(true);
    const { error } = await ritualsDb.from("ritual_steps").delete().eq("id", step.id);
    setBusy(false);
    if (error) return fail(error);
    refresh();
  };

  const updateStep = async (step: RitualStep, patch: Partial<RitualStep>) => {
    const { error } = await ritualsDb.from("ritual_steps").update(patch).eq("id", step.id);
    if (error) return fail(error);
    refresh();
  };

  if (isLoading) return <RitualsShell crumbs={[{ label: "My Rituals", href: "/rituals" }]}><p className="pt-10 text-muted-foreground">Loading…</p></RitualsShell>;
  if (!data?.ritual) return <RitualsShell crumbs={[{ label: "My Rituals", href: "/rituals" }]}><p className="pt-10 text-muted-foreground">This ritual couldn't be found.</p></RitualsShell>;

  return (
    <RitualsShell crumbs={[{ label: "My Rituals", href: "/rituals" }, { label: data.ritual.name }]}>
      <div className="pt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-serif text-4xl text-foreground">{data.ritual.name}</h1>
            <Button size="lg" disabled={steps.length === 0} onClick={() => navigate(`/rituals/${id}/visit`)}>
              <Play className="h-4 w-4 mr-2" /> {openVisit ? "Resume visit" : "Begin visit"}
            </Button>
          </div>
          {steps.length === 0 && <p className="text-sm text-muted-foreground">Add at least one step to begin a visit.</p>}

          <section aria-labelledby="steps-heading">
            <h2 id="steps-heading" className="font-serif text-2xl text-foreground mb-3">Steps</h2>
            <ol className="space-y-3">
              {steps.map((s, i) => {
                const info = catalog[stepKey(s)];
                const unavailable = info ? !info.available : s.kind !== "spread" && Object.keys(catalog).length > 0;
                return (
                  <li key={s.id} className="bg-card border border-border rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="font-serif text-xl text-primary w-6 shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0 space-y-2">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {itemTypeLabel(s.kind)} · {info?.name ?? (s.kind === "spread" ? SPREAD_TYPES.find((x) => x.id === s.spread_type)?.name : "…")}
                        </p>
                        {unavailable && (
                          <p className="flex items-center gap-1.5 text-sm text-destructive">
                            <AlertTriangle className="h-4 w-4" aria-hidden /> This item is no longer available. Remove this step or add a replacement.
                          </p>
                        )}
                        <Input aria-label={`Label for step ${i + 1}`} defaultValue={s.label ?? ""} maxLength={120}
                          onBlur={(e) => e.target.value !== (s.label ?? "") && updateStep(s, { label: e.target.value || null })} />
                        <Textarea aria-label={`Journal prompt for step ${i + 1}`} placeholder="Journal invitation (optional)" rows={2}
                          defaultValue={s.journal_prompt ?? ""}
                          onBlur={(e) => e.target.value !== (s.journal_prompt ?? "") && updateStep(s, { journal_prompt: e.target.value || null })} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button size="icon" variant="ghost" aria-label={`Move step ${i + 1} up`} disabled={i === 0 || busy} onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" aria-label={`Move step ${i + 1} down`} disabled={i === steps.length - 1 || busy} onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" aria-label={`Remove step ${i + 1}`} disabled={busy} onClick={() => remove(s)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
            <div className="mt-4">
              {adding ? (
                <AddStepPicker ritualId={id!} onDone={() => { setAdding(false); refresh(); }} />
              ) : (
                <div className="flex flex-wrap gap-2 items-center">
                  <Button variant="outline" onClick={() => setAdding(true)}><Plus className="h-4 w-4 mr-1" /> Add a step</Button>
                  <span className="text-sm text-muted-foreground">
                    or use the + on any <Link className="underline" to="/remembrance">deck</Link>, <Link className="underline" to="/remembrance/spreads">spread</Link> or <Link className="underline" to="/devotion">resource</Link>.
                  </span>
                </div>
              )}
            </div>
          </section>

          <section aria-labelledby="history-heading">
            <h2 id="history-heading" className="font-serif text-2xl text-foreground mb-3">Visits</h2>
            <RitualVisitHistory visits={visits} />
          </section>
        </div>

        <aside className="bg-card border border-border rounded-lg p-5 space-y-4 h-fit">
          <h2 className="font-serif text-xl text-foreground">Ritual details</h2>
          <div className="space-y-1.5">
            <Label htmlFor="r-name">Name</Label>
            <Input id="r-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-int">Intention (optional)</Label>
            <Textarea id="r-int" value={intention} onChange={(e) => setIntention(e.target.value)} rows={3} />
          </div>
          <div className="flex gap-1.5" role="radiogroup" aria-label="Rhythm">
            {RHYTHMS.map((g) => (
              <Button key={g.value} size="sm" role="radio" aria-checked={rhythm === g.value} variant={rhythm === g.value ? "default" : "outline"} onClick={() => setRhythm(g.value)}>{g.label}</Button>
            ))}
          </div>
          <Button onClick={saveMeta} disabled={!name.trim() || savingMeta}>
            {savingMeta && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save details
          </Button>
        </aside>
      </div>
    </RitualsShell>
  );
};

function AddStepPicker({ ritualId, onDone }: { ritualId: string; onDone: () => void }) {
  const { toast } = useToast();
  const [kind, setKind] = useState<"deck" | "spread" | "resource">("deck");
  const [choice, setChoice] = useState("");
  const [saving, setSaving] = useState(false);
  const { data: options } = useQuery({
    queryKey: ["ritual-step-options"],
    queryFn: async () => {
      const [d, c, h] = await Promise.all([
        supabase.from("decks").select("id,name,is_starter,is_published").order("display_order"),
        supabase.from("content_resources").select("id,title,is_course,status").eq("status", "published").eq("is_course", false).order("title"),
        supabase.from("healing_resources").select("id,title,status").eq("status", "published").order("title"),
      ]);
      return {
        decks: ((d.data ?? []) as any[]).filter((x) => !x.is_starter && x.is_published !== false),
        resources: [
          ...((c.data ?? []) as any[]).map((x) => ({ value: `content:${x.id}`, label: x.title })),
          ...((h.data ?? []) as any[]).map((x) => ({ value: `healing:${x.id}`, label: x.title })),
        ].sort((a, b) => a.label.localeCompare(b.label)),
      };
    },
  });

  const list =
    kind === "deck" ? (options?.decks ?? []).map((d: any) => ({ value: d.id, label: d.name }))
    : kind === "spread" ? SPREAD_TYPES.map((s) => ({ value: s.id, label: s.name }))
    : options?.resources ?? [];

  const add = async () => {
    const opt = list.find((o) => o.value === choice);
    if (!opt) return;
    let item: RitualAddItem;
    if (kind === "deck") item = { kind, deckId: opt.value, name: opt.label };
    else if (kind === "spread") item = { kind, spreadType: opt.value, name: opt.label };
    else {
      const [source, rid] = opt.value.split(":");
      item = { kind, source: source as "content" | "healing", resourceId: rid, name: opt.label };
    }
    setSaving(true);
    try {
      await appendRitualStep(ritualId, item, null, crypto.randomUUID());
      onDone();
    } catch (e: any) {
      toast({ title: "Couldn't add step", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Step type">
        {(["deck", "spread", "resource"] as const).map((k) => (
          <Button key={k} size="sm" role="radio" aria-checked={kind === k} variant={kind === k ? "default" : "outline"} onClick={() => { setKind(k); setChoice(""); }}>
            {itemTypeLabel(k)}
          </Button>
        ))}
      </div>
      <select aria-label="Choose item" value={choice} onChange={(e) => setChoice(e.target.value)}
        className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
        <option value="">Choose…</option>
        {list.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <div className="flex gap-2">
        <Button onClick={add} disabled={!choice || saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Add step</Button>
        <Button variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </div>
  );
}

export default RitualDetail;
