import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { useEM } from "@/hooks/useEmotionalMastery";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid,
} from "recharts";

const SECTIONS = [
  { key: "somatic", label: "Somatic Map" },
  { key: "nowthen", label: "Now / Then" },
  { key: "regulation", label: "Regulation" },
  { key: "translation", label: "Translation Wheel" },
  { key: "capacity", label: "Capacity" },
  { key: "recovery", label: "Recovery Time" },
  { key: "weekly", label: "Weekly Reflection" },
] as const;

const BODY_AREAS: Record<string, string[]> = {
  Head: ["racing thoughts", "pressure", "fogginess", "dizziness"],
  Throat: ["lump in throat", "tightness", "inability to speak"],
  Chest: ["heaviness", "pressure", "constriction", "aching"],
  Belly: ["butterflies", "nausea", "knots", "buzzing"],
  Jaw: ["clenching", "grinding", "tension"],
  Shoulders: ["burden", "weight", "tension"],
};

const REGULATION_TOOLS = {
  under: [
    { key: "movement", label: "Movement" },
    { key: "shaking", label: "Shaking" },
    { key: "walking", label: "Walking" },
    { key: "energising-breath", label: "Energising breathwork" },
  ],
  over: [
    { key: "long-exhale", label: "Long exhale breathing" },
    { key: "grounding", label: "Grounding audio" },
    { key: "body-scan", label: "Body scan" },
    { key: "hand-on-chest", label: "Hand on chest" },
  ],
} as const;

const EMOTION_NEEDS: Record<string, string[]> = {
  Anger: ["boundary", "justice", "protection", "honesty"],
  Sadness: ["expression", "support", "grieving", "connection"],
  Fear: ["safety", "certainty", "reassurance", "grounding"],
  Shame: ["acceptance", "self-compassion", "belonging"],
  Guilt: ["repair", "responsibility", "forgiveness"],
  Overwhelm: ["space", "simplification", "rest"],
  Loneliness: ["connection", "presence", "witness"],
  Resentment: ["boundary", "expression", "fairness"],
  Jealousy: ["self-worth", "honesty", "reassurance"],
};

const NEED_ACTIONS: Record<string, string[]> = {
  reassurance: [
    "Ask for reassurance directly",
    "Journal fears before acting",
    "Reality check assumptions",
    "Regulate first, then communicate",
  ],
  boundary: ["Name the limit out loud", "Use a rehearsed script", "Step away to regulate first"],
  safety: ["Lengthen the exhale", "Place hand on chest", "Name 5 things you can see"],
  connection: ["Reach out to one safe person", "Share what you're feeling", "Sit beside someone"],
  expression: ["Write it out unfiltered", "Speak it aloud", "Move it through the body"],
  rest: ["Pause one obligation", "Lie down for 10 minutes", "Cancel non-essential plans"],
};

export const EmotionalMasteryAuditHub = () => {
  const [step, setStep] = useState(0);
  const section = SECTIONS[step].key;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {SECTIONS.map((s, i) => (
            <Badge
              key={s.key}
              variant={i === step ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setStep(i)}
            >
              {i + 1}. {s.label}
            </Badge>
          ))}
        </div>
      </div>

      {section === "somatic" && <SomaticMap />}
      {section === "nowthen" && <NowThen />}
      {section === "regulation" && <Regulation />}
      {section === "translation" && <TranslationWheel />}
      {section === "capacity" && <Capacity />}
      {section === "recovery" && <Recovery />}
      {section === "weekly" && <Weekly />}

      <div className="flex justify-between pt-4 border-t border-border">
        <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Previous
        </Button>
        <span className="text-sm text-muted-foreground self-center">Step {step + 1} of {SECTIONS.length}</span>
        <Button variant="ghost" disabled={step === SECTIONS.length - 1} onClick={() => setStep((s) => s + 1)}>
          Next <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

/* ---------------- SOMATIC MAP ---------------- */
function SomaticMap() {
  const { somatic, saveSomatic } = useEM();
  const { toast } = useToast();
  const [selections, setSelections] = useState<{ area: string; sensation: string }[]>([]);
  const [notes, setNotes] = useState("");

  const toggle = (area: string, sensation: string) => {
    setSelections((prev) => {
      const exists = prev.find((s) => s.area === area && s.sensation === sensation);
      return exists
        ? prev.filter((s) => !(s.area === area && s.sensation === sensation))
        : [...prev, { area, sensation }];
    });
  };

  const areaFreq = useMemo(() => {
    const counts: Record<string, number> = {};
    (somatic.data || []).forEach((e: any) => {
      (e.selections || []).forEach((s: any) => {
        counts[s.area] = (counts[s.area] || 0) + 1;
      });
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(counts)
      .map(([area, n]) => ({ area, pct: Math.round((n / total) * 100), n }))
      .sort((a, b) => b.n - a.n);
  }, [somatic.data]);

  const save = async () => {
    if (!selections.length) return;
    await saveSomatic.mutateAsync({ selections, notes });
    setSelections([]); setNotes("");
    toast({ title: "Held", description: "Your body knew. It's recorded." });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif">Emotional Somatic Map</CardTitle>
        <p className="text-sm text-muted-foreground italic">Locate the sensation before naming the emotion.</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          {Object.entries(BODY_AREAS).map(([area, sensations]) => (
            <div key={area} className="space-y-2">
              <h4 className="font-medium">{area}</h4>
              <div className="flex flex-wrap gap-2">
                {sensations.map((s) => {
                  const on = selections.some((sel) => sel.area === area && sel.sensation === s);
                  return (
                    <Badge
                      key={s}
                      variant={on ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggle(area, s)}
                    >
                      {s}
                    </Badge>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What did your body know?" />
        </div>
        <Button onClick={save} disabled={!selections.length || saveSomatic.isPending}>
          {saveSomatic.isPending ? "Saving…" : "Save somatic reading"}
        </Button>

        {areaFreq.length > 0 && (
          <div className="pt-4">
            <h4 className="font-medium mb-2">Most Activated Areas</h4>
            <div className="space-y-1">
              {areaFreq.map((a) => (
                <div key={a.area} className="flex justify-between text-sm">
                  <span>{a.area}</span><span className="text-muted-foreground">{a.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- NOW/THEN ---------------- */
function NowThen() {
  const { saveNowThen, nowThen } = useEM();
  const { toast } = useToast();
  const [trigger, setTrigger] = useState("");
  const [intensity, setIntensity] = useState(5);
  const [proportionate, setProportionate] = useState("yes");
  const [story, setStory] = useState("");
  const [feltBefore, setFeltBefore] = useState("today only");

  const computeResult = () => {
    let score = 0;
    if (proportionate === "no") score += 2;
    else if (proportionate === "unsure") score += 1;
    if (feltBefore === "since childhood") score += 3;
    else if (feltBefore === "frequently") score += 2;
    else if (feltBefore === "occasionally") score += 1;
    if (intensity >= 8) score += 1;
    if (score >= 4) return "then";
    if (score >= 2) return "mixed";
    return "now";
  };

  const save = async () => {
    if (!trigger.trim()) return;
    const result = computeResult();
    await saveNowThen.mutateAsync({
      trigger_text: trigger, intensity, proportionate, story, felt_before: feltBefore, result,
    });
    toast({
      title: result === "now" ? "Mostly NOW" : result === "mixed" ? "Mixed" : "Mostly THEN",
      description:
        result === "now"
          ? "Likely a present-day emotion. Regulate and respond."
          : result === "mixed"
          ? "Present emotion plus older material. Regulate before responding."
          : "Older wounds are activating. Focus on regulation before interpretation.",
    });
    setTrigger(""); setStory(""); setIntensity(5); setProportionate("yes"); setFeltBefore("today only");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif">Now / Then Differentiation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>What triggered you?</Label>
          <Textarea value={trigger} onChange={(e) => setTrigger(e.target.value)} placeholder="My partner took 4 hours to reply." />
        </div>
        <div className="space-y-2">
          <Label>How intense does this feel? ({intensity})</Label>
          <Slider value={[intensity]} min={1} max={10} step={1} onValueChange={([v]) => setIntensity(v)} />
        </div>
        <div className="space-y-2">
          <Label>Does the intensity feel proportionate?</Label>
          <RadioGroup value={proportionate} onValueChange={setProportionate} className="flex gap-4">
            {["yes", "unsure", "no"].map((v) => (
              <div key={v} className="flex items-center gap-2">
                <RadioGroupItem value={v} id={`prop-${v}`} /><Label htmlFor={`prop-${v}`}>{v}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
        <div className="space-y-2">
          <Label>What story appeared?</Label>
          <Input value={story} onChange={(e) => setStory(e.target.value)} placeholder="I'm not important / they'll leave / nobody cares" />
        </div>
        <div className="space-y-2">
          <Label>Have you felt this before?</Label>
          <RadioGroup value={feltBefore} onValueChange={setFeltBefore} className="flex gap-4 flex-wrap">
            {["today only", "occasionally", "frequently", "since childhood"].map((v) => (
              <div key={v} className="flex items-center gap-2">
                <RadioGroupItem value={v} id={`fb-${v}`} /><Label htmlFor={`fb-${v}`}>{v}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
        <Button onClick={save} disabled={!trigger.trim() || saveNowThen.isPending}>
          {saveNowThen.isPending ? "Saving…" : "See the pattern"}
        </Button>

        {(nowThen.data || []).length > 0 && (
          <div className="pt-4 space-y-2">
            <h4 className="font-medium">Recent</h4>
            {(nowThen.data || []).slice(0, 5).map((e: any) => (
              <div key={e.id} className="text-sm border-b border-border pb-2">
                <span className="font-medium uppercase mr-2 text-xs">{e.result}</span>
                <span>{e.trigger_text}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- REGULATION ---------------- */
function Regulation() {
  const { saveRegulation, regulation } = useEM();
  const { toast } = useToast();
  const [state, setState] = useState<"under" | "over">("over");
  const [tool, setTool] = useState<{ key: string; label: string } | null>(null);
  const [score, setScore] = useState(5);

  const save = async () => {
    if (!tool) return;
    await saveRegulation.mutateAsync({
      state, tool_key: tool.key, tool_label: tool.label, regulated_score: score,
    });
    setTool(null); setScore(5);
    toast({ title: "Logged", description: "Your nervous system is learning." });
  };

  const usage = useMemo(() => {
    const counts: Record<string, { label: string; n: number }> = {};
    (regulation.data || []).forEach((r: any) => {
      counts[r.tool_key] = { label: r.tool_label, n: (counts[r.tool_key]?.n || 0) + 1 };
    });
    return Object.entries(counts).map(([k, v]) => ({ name: v.label, count: v.n })).sort((a, b) => b.count - a.count);
  }, [regulation.data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif">Regulation Library</CardTitle>
        <p className="text-sm text-muted-foreground italic">Not education. Intervention.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <RadioGroup value={state} onValueChange={(v) => { setState(v as any); setTool(null); }} className="flex gap-4">
          <div className="flex items-center gap-2"><RadioGroupItem value="under" id="st-under" /><Label htmlFor="st-under">Under-activated (numb, frozen)</Label></div>
          <div className="flex items-center gap-2"><RadioGroupItem value="over" id="st-over" /><Label htmlFor="st-over">Over-activated (anxious, angry)</Label></div>
        </RadioGroup>

        <div className="grid sm:grid-cols-2 gap-2">
          {REGULATION_TOOLS[state].map((t) => (
            <Button
              key={t.key}
              variant={tool?.key === t.key ? "default" : "outline"}
              className="justify-start"
              onClick={() => setTool(t)}
            >
              {t.label}
            </Button>
          ))}
        </div>

        {tool && (
          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-sm">Practising <strong>{tool.label}</strong>. When you've finished, rate how regulated you feel.</p>
            <Label>How regulated do you feel now? ({score})</Label>
            <Slider value={[score]} min={1} max={10} step={1} onValueChange={([v]) => setScore(v)} />
            <Button onClick={save} disabled={saveRegulation.isPending}>
              {saveRegulation.isPending ? "Saving…" : "Log practice"}
            </Button>
          </div>
        )}

        {usage.length > 0 && (
          <div className="pt-4">
            <h4 className="font-medium mb-2">Most used tools</h4>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={usage}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- TRANSLATION WHEEL ---------------- */
function TranslationWheel() {
  const { saveTranslation, translation } = useEM();
  const { toast } = useToast();
  const [emotion, setEmotion] = useState<string | null>(null);
  const [need, setNeed] = useState<string | null>(null);
  const [action, setAction] = useState("");

  const needs = emotion ? EMOTION_NEEDS[emotion] || [] : [];
  const actions = need ? NEED_ACTIONS[need] || ["Name the need out loud", "Take one small honest step", "Regulate before acting"] : [];

  const save = async () => {
    if (!emotion || !need) return;
    await saveTranslation.mutateAsync({ emotion, need, chosen_action: action });
    toast({ title: "Held", description: "Emotion → need → action." });
    setEmotion(null); setNeed(null); setAction("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif">Emotional Translation Wheel</CardTitle>
        <p className="text-sm text-muted-foreground italic">Emotion → Need → Action.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>1. Choose emotion</Label>
          <div className="flex flex-wrap gap-2">
            {Object.keys(EMOTION_NEEDS).map((e) => (
              <Badge key={e} variant={emotion === e ? "default" : "outline"} className="cursor-pointer" onClick={() => { setEmotion(e); setNeed(null); }}>
                {e}
              </Badge>
            ))}
          </div>
        </div>

        {emotion && (
          <div className="space-y-2">
            <Label>2. What does it need?</Label>
            <div className="flex flex-wrap gap-2">
              {needs.map((n) => (
                <Badge key={n} variant={need === n ? "default" : "outline"} className="cursor-pointer" onClick={() => setNeed(n)}>
                  {n}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {need && (
          <div className="space-y-2">
            <Label>3. Suggested actions</Label>
            <ul className="list-disc list-inside text-sm space-y-1">
              {actions.map((a) => <li key={a}>{a}</li>)}
            </ul>
            <Label className="pt-2 block">What action will you take?</Label>
            <Textarea value={action} onChange={(e) => setAction(e.target.value)} placeholder="Name your next step." />
            <Button onClick={save} disabled={saveTranslation.isPending}>
              {saveTranslation.isPending ? "Saving…" : "Save translation"}
            </Button>
          </div>
        )}

        {(translation.data || []).length > 0 && (
          <div className="pt-4 space-y-2">
            <h4 className="font-medium">Recent translations</h4>
            {(translation.data || []).slice(0, 5).map((t: any) => (
              <div key={t.id} className="text-sm border-b border-border pb-2">
                <span className="font-medium">{t.emotion}</span> → <span className="italic">{t.need}</span>
                {t.chosen_action && <div className="text-muted-foreground">→ {t.chosen_action}</div>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- CAPACITY ---------------- */
function Capacity() {
  const { saveCapacity, capacity } = useEM();
  const { toast } = useToast();
  const [intensity, setIntensity] = useState(5);
  const [duration, setDuration] = useState("less than 10 mins");
  const [presence, setPresence] = useState(5);
  const [regulated, setRegulated] = useState("yes");

  const save = async () => {
    await saveCapacity.mutateAsync({
      intensity, activation_duration: duration, presence_score: presence,
      regulated_before_reacting: regulated === "yes",
    });
    toast({ title: "Checked in", description: "Capacity is grown, not given." });
  };

  const series = useMemo(
    () => (capacity.data || []).slice(0, 30).reverse().map((c: any, i: number) => ({
      i: i + 1, presence: c.presence_score, intensity: c.intensity,
    })),
    [capacity.data],
  );

  const score = useMemo(() => {
    const arr = capacity.data || [];
    if (!arr.length) return null;
    const presenceAvg = arr.reduce((s: number, c: any) => s + c.presence_score, 0) / arr.length;
    const regulatedPct = arr.filter((c: any) => c.regulated_before_reacting).length / arr.length;
    return Math.round((presenceAvg / 10) * 60 + regulatedPct * 40);
  }, [capacity.data]);

  return (
    <Card>
      <CardHeader><CardTitle className="font-serif">Emotional Capacity Tracker</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>Emotional intensity ({intensity})</Label>
          <Slider value={[intensity]} min={1} max={10} step={1} onValueChange={([v]) => setIntensity(v)} />
        </div>
        <div className="space-y-2">
          <Label>How long did activation last?</Label>
          <RadioGroup value={duration} onValueChange={setDuration} className="flex gap-3 flex-wrap">
            {["less than 10 mins", "10–30 mins", "30–60 mins", "several hours", "all day"].map((d) => (
              <div key={d} className="flex items-center gap-2"><RadioGroupItem value={d} id={`dur-${d}`} /><Label htmlFor={`dur-${d}`}>{d}</Label></div>
            ))}
          </RadioGroup>
        </div>
        <div className="space-y-2">
          <Label>Were you able to stay present? ({presence})</Label>
          <Slider value={[presence]} min={1} max={10} step={1} onValueChange={([v]) => setPresence(v)} />
        </div>
        <div className="space-y-2">
          <Label>Did you regulate before reacting?</Label>
          <RadioGroup value={regulated} onValueChange={setRegulated} className="flex gap-4">
            <div className="flex items-center gap-2"><RadioGroupItem value="yes" id="reg-yes" /><Label htmlFor="reg-yes">Yes</Label></div>
            <div className="flex items-center gap-2"><RadioGroupItem value="no" id="reg-no" /><Label htmlFor="reg-no">No</Label></div>
          </RadioGroup>
        </div>
        <Button onClick={save} disabled={saveCapacity.isPending}>
          {saveCapacity.isPending ? "Saving…" : "Save check-in"}
        </Button>

        {score !== null && (
          <div className="pt-4">
            <p className="text-sm text-muted-foreground">Emotional Capacity Score</p>
            <p className="text-3xl font-serif">{score}<span className="text-base text-muted-foreground">/100</span></p>
          </div>
        )}

        {series.length > 1 && (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="i" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 10]} />
                <Tooltip />
                <Line type="monotone" dataKey="presence" stroke="hsl(var(--primary))" />
                <Line type="monotone" dataKey="intensity" stroke="hsl(var(--muted-foreground))" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- RECOVERY TIME ---------------- */
function Recovery() {
  const { saveRecovery, updateRecovery, recovery } = useEM();
  const { toast } = useToast();
  const [trigger, setTrigger] = useState("");

  const log = async () => {
    if (!trigger.trim()) return;
    await saveRecovery.mutateAsync({ trigger_text: trigger });
    setTrigger("");
    toast({ title: "Activation logged", description: "Mark baseline when you're regulated again." });
  };

  const markBaseline = async (entry: any) => {
    const baseline = new Date();
    const mins = Math.round((baseline.getTime() - new Date(entry.activation_at).getTime()) / 60000);
    await updateRecovery.mutateAsync({ id: entry.id, baseline_at: baseline.toISOString(), recovery_minutes: mins });
    toast({ title: "Welcome home", description: `Recovery: ${mins} mins.` });
  };

  const trend = useMemo(() => {
    const done = (recovery.data || []).filter((r: any) => r.recovery_minutes != null);
    return done.slice(0, 20).reverse().map((r: any, i: number) => ({ i: i + 1, minutes: r.recovery_minutes }));
  }, [recovery.data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif">Recovery Time</CardTitle>
        <p className="text-sm text-muted-foreground italic">Mastery isn't never being triggered — it's recovering faster.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>What triggered you?</Label>
          <Input value={trigger} onChange={(e) => setTrigger(e.target.value)} placeholder="Criticism from boss" />
          <Button onClick={log} disabled={!trigger.trim() || saveRecovery.isPending}>
            {saveRecovery.isPending ? "Logging…" : "Log activation"}
          </Button>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">Open activations</h4>
          {(recovery.data || []).filter((r: any) => !r.baseline_at).map((r: any) => (
            <div key={r.id} className="flex items-center justify-between border-b border-border pb-2">
              <div className="text-sm">
                <div>{r.trigger_text}</div>
                <div className="text-xs text-muted-foreground">{new Date(r.activation_at).toLocaleString()}</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => markBaseline(r)}>I've returned to baseline</Button>
            </div>
          ))}
          {!(recovery.data || []).some((r: any) => !r.baseline_at) && (
            <p className="text-sm text-muted-foreground italic">No open activations.</p>
          )}
        </div>

        {trend.length > 1 && (
          <div className="pt-2">
            <h4 className="font-medium mb-2">Recovery time trend (mins)</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="i" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="minutes" stroke="hsl(var(--primary))" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- WEEKLY ---------------- */
function Weekly() {
  const { saveWeekly, weekly } = useEM();
  const { toast } = useToast();
  const [f, setF] = useState({
    emotion_most: "", emotion_avoided: "", trigger_taught: "",
    regulated_before_reacting: "", reacted_before_regulating: "",
    need_discovered: "", proud_of: "",
  });
  const upd = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    await saveWeekly.mutateAsync(f);
    setF({ emotion_most: "", emotion_avoided: "", trigger_taught: "", regulated_before_reacting: "", reacted_before_regulating: "", need_discovered: "", proud_of: "" });
    toast({ title: "Held", description: "This week is integrated." });
  };

  const Q = ({ k, label }: { k: keyof typeof f; label: string }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Textarea value={f[k]} onChange={(e) => upd(k, e.target.value)} />
    </div>
  );

  return (
    <Card>
      <CardHeader><CardTitle className="font-serif">Weekly Mastery Reflection</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <Q k="emotion_most" label="What emotion visited most often this week?" />
        <Q k="emotion_avoided" label="What emotion did you avoid most?" />
        <Q k="trigger_taught" label="What emotional trigger taught you the most?" />
        <Q k="regulated_before_reacting" label="Where did you regulate before reacting?" />
        <Q k="reacted_before_regulating" label="Where did you react before regulating?" />
        <Q k="need_discovered" label="What need did you discover underneath an emotion?" />
        <Q k="proud_of" label="What are you proud of this week?" />
        <Button onClick={save} disabled={saveWeekly.isPending}>
          {saveWeekly.isPending ? "Saving…" : "Save reflection"}
        </Button>

        {(weekly.data || []).length > 0 && (
          <div className="pt-4 space-y-2">
            <h4 className="font-medium">Past reflections</h4>
            {(weekly.data || []).slice(0, 5).map((w: any) => (
              <div key={w.id} className="text-sm border-b border-border pb-2">
                <div className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</div>
                {w.emotion_most && <div><strong>Most:</strong> {w.emotion_most}</div>}
                {w.proud_of && <div><strong>Proud:</strong> {w.proud_of}</div>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}