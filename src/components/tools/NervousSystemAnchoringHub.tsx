import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  ANCHOR_BODY_AREAS, ANCHOR_SENSATIONS, WEEKLY_TRIGGERS, getMondayISO,
  useAnchoringSessions, useSaveAnchoringSession,
  useAnchorMaps, useSaveAnchorMap,
  useStabilityCheckins, useSaveStabilityCheckin,
  useWeeklyAnchoring, useSaveWeeklyAnchoring,
} from "@/hooks/useNervousAnchoring";

const SECTIONS = [
  { key: "timer",     label: "1. Daily Anchoring Timer" },
  { key: "map",       label: "2. Body Anchor Mapping" },
  { key: "stability", label: "3. Baseline Stability Tracker" },
  { key: "weekly",    label: "4. Weekly Anchoring Log" },
] as const;
type SectionKey = typeof SECTIONS[number]["key"];

const Pill = ({ active, onClick, children }: any) => (
  <Badge
    variant={active ? "default" : "outline"}
    onClick={onClick}
    className={`cursor-pointer py-1.5 px-3 ${active ? "" : "hover:bg-primary/10"}`}
  >
    {children}
  </Badge>
);

export const NervousSystemAnchoringHub = () => {
  const [section, setSection] = useState<SectionKey>("timer");

  const goNext = () => {
    const idx = SECTIONS.findIndex((s) => s.key === section);
    if (idx < SECTIONS.length - 1) setSection(SECTIONS[idx + 1].key);
  };
  const goPrev = () => {
    const idx = SECTIONS.findIndex((s) => s.key === section);
    if (idx > 0) setSection(SECTIONS[idx - 1].key);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <Pill key={s.key} active={section === s.key} onClick={() => setSection(s.key)}>
            {s.label}
          </Pill>
        ))}
      </div>

      <div className="min-h-[300px]">
        {section === "timer" && <TimerSection />}
        {section === "map" && <AnchorMapSection />}
        {section === "stability" && <StabilitySection />}
        {section === "weekly" && <WeeklySection />}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button variant="ghost" onClick={goPrev} disabled={SECTIONS[0].key === section}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        <p className="text-xs text-muted-foreground italic hidden sm:block">
          Stability is built one return at a time.
        </p>
        <Button onClick={goNext} disabled={SECTIONS[SECTIONS.length - 1].key === section}>
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// 1. Daily Anchoring Timer
// ════════════════════════════════════════════════════════════════════════════
const STAGES = [
  { key: "orient", label: "Orient",       weight: 0.20, prompt: "What can you see?\nWhat can you hear?\nWhat can you feel touching your body right now?" },
  { key: "breathe", label: "Breathe",     weight: 0.30, prompt: "Slow your breath.\nLet your exhale become longer than your inhale." },
  { key: "anchor", label: "Anchor Point", weight: 0.30, prompt: "Place your hand on the most stable place in your body.\nBreathe into that point." },
  { key: "truth",  label: "Truth",        weight: 0.20, prompt: "What is actually true right now?" },
] as const;

const TimerSection = () => {
  const { toast } = useToast();
  const save = useSaveAnchoringSession();
  const { data: sessions = [] } = useAnchoringSessions();

  const [duration, setDuration] = useState<2 | 3 | 5>(3);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [done, setDone] = useState(false);
  const [reflection, setReflection] = useState("");
  const intervalRef = useRef<number | null>(null);

  const totalSeconds = duration * 60;

  useEffect(() => {
    if (!running) return;
    intervalRef.current = window.setInterval(() => {
      setElapsed((e) => {
        if (e + 1 >= totalSeconds) {
          if (intervalRef.current) window.clearInterval(intervalRef.current);
          setRunning(false);
          setDone(true);
          return totalSeconds;
        }
        return e + 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [running, totalSeconds]);

  // Determine current stage
  const stageInfo = useMemo(() => {
    let acc = 0;
    for (const s of STAGES) {
      const stageSeconds = totalSeconds * s.weight;
      if (elapsed < acc + stageSeconds || s === STAGES[STAGES.length - 1]) {
        return { stage: s, stageElapsed: elapsed - acc, stageSeconds };
      }
      acc += stageSeconds;
    }
    return { stage: STAGES[0], stageElapsed: 0, stageSeconds: totalSeconds };
  }, [elapsed, totalSeconds]);

  const reset = () => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    setRunning(false);
    setElapsed(0);
    setDone(false);
    setReflection("");
  };

  const handleSaveSession = async () => {
    try {
      await save.mutateAsync({ duration_minutes: duration, completed: true, reflection: reflection.trim() || null });
      toast({ title: "Session saved", description: "Your anchoring practice is recorded." });
      reset();
    } catch (e: any) {
      toast({ title: "Could not save", description: e.message, variant: "destructive" });
    }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // Stats
  const stats = useMemo(() => {
    const completed = sessions.filter((s) => s.completed);
    const minutes = completed.reduce((sum, s) => sum + s.duration_minutes, 0);
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    weekStart.setHours(0, 0, 0, 0);
    const minutesThisWeek = completed
      .filter((s) => new Date(s.created_at) >= weekStart)
      .reduce((sum, s) => sum + s.duration_minutes, 0);

    // streak: consecutive days from today backward with at least one session
    const dayKeys = new Set(
      completed.map((s) => new Date(s.created_at).toISOString().slice(0, 10))
    );
    let streak = 0;
    const d = new Date();
    while (dayKeys.has(d.toISOString().slice(0, 10))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    // longest streak
    const sortedDates = Array.from(dayKeys).sort();
    let longest = 0, run = 0, prev: Date | null = null;
    for (const k of sortedDates) {
      const cur = new Date(k);
      if (prev && (cur.getTime() - prev.getTime()) === 86400000) run++;
      else run = 1;
      if (run > longest) longest = run;
      prev = cur;
    }
    return { total: completed.length, minutes, minutesThisWeek, streak, longest };
  }, [sessions]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="font-serif text-2xl">Daily Anchoring Timer</h2>
        <p className="text-sm italic text-muted-foreground">
          A 2–5 minute guided practice through the four stages of Anchoring.
        </p>
      </header>

      {!running && !done && (
        <Card><CardContent className="pt-6 space-y-4">
          <Label className="font-serif text-lg">Choose duration</Label>
          <div className="flex gap-2">
            {[2, 3, 5].map((d) => (
              <Button
                key={d}
                variant={duration === d ? "default" : "outline"}
                onClick={() => setDuration(d as 2 | 3 | 5)}
              >
                {d} minutes
              </Button>
            ))}
          </div>
          <div className="pt-2">
            <Button size="lg" onClick={() => setRunning(true)}>
              <Play className="h-4 w-4 mr-2" /> Begin
            </Button>
          </div>
        </CardContent></Card>
      )}

      {(running || (elapsed > 0 && !done)) && (
        <Card><CardContent className="pt-8 pb-8 space-y-6 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Stage {STAGES.findIndex((s) => s.key === stageInfo.stage.key) + 1} of 4
          </p>
          <h3 className="font-serif text-3xl">{stageInfo.stage.label}</h3>
          <p className="whitespace-pre-line text-base text-foreground/80 max-w-md mx-auto">
            {stageInfo.stage.prompt}
          </p>

          {stageInfo.stage.key === "breathe" && (
            <div className="flex justify-center py-2">
              <div
                className="rounded-full bg-primary/20 border border-primary/40"
                style={{
                  width: 120, height: 120,
                  animation: "breathe 6s ease-in-out infinite",
                }}
              />
              <style>{`@keyframes breathe { 0%,100%{transform:scale(0.7);} 40%{transform:scale(1.1);} 60%{transform:scale(1.1);} }`}</style>
            </div>
          )}

          <div className="text-5xl font-mono">{fmt(totalSeconds - elapsed)}</div>

          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" onClick={() => setRunning((r) => !r)}>
              {running ? <><Pause className="h-4 w-4 mr-1" /> Pause</> : <><Play className="h-4 w-4 mr-1" /> Resume</>}
            </Button>
            <Button variant="ghost" onClick={reset}>
              <RotateCcw className="h-4 w-4 mr-1" /> Reset
            </Button>
          </div>
        </CardContent></Card>
      )}

      {done && (
        <Card><CardContent className="pt-6 space-y-4">
          <Label className="font-serif text-lg">What feels different now?</Label>
          <Textarea
            rows={4}
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="Optional — notice what shifted in your body, breath, or attention."
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={reset}>Discard</Button>
            <Button onClick={handleSaveSession} disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save Session"}
            </Button>
          </div>
        </CardContent></Card>
      )}

      {/* Progress tracking */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Sessions" value={stats.total} />
        <StatTile label="Current streak" value={`${stats.streak}d`} />
        <StatTile label="Longest streak" value={`${stats.longest}d`} />
        <StatTile label="Minutes this week" value={stats.minutesThisWeek} />
      </div>
    </div>
  );
};

const StatTile = ({ label, value }: { label: string; value: any }) => (
  <Card><CardContent className="pt-5 pb-5 text-center">
    <p className="text-2xl font-serif">{value}</p>
    <p className="text-xs text-muted-foreground mt-1">{label}</p>
  </CardContent></Card>
);

// ════════════════════════════════════════════════════════════════════════════
// 2. Body Anchor Mapping
// ════════════════════════════════════════════════════════════════════════════
const AnchorMapSection = () => {
  const { toast } = useToast();
  const save = useSaveAnchorMap();
  const { data: maps = [] } = useAnchorMaps();
  const latest = maps[0];

  const [selected, setSelected] = useState<string[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [sensations, setSensations] = useState<Record<string, string[]>>({});

  const toggleArea = (a: string) => {
    setSelected((arr) => {
      if (arr.includes(a)) {
        const next = arr.filter((x) => x !== a);
        const r = { ...ratings }; delete r[a]; setRatings(r);
        const s = { ...sensations }; delete s[a]; setSensations(s);
        return next;
      }
      setRatings((r) => ({ ...r, [a]: 5 }));
      setSensations((s) => ({ ...s, [a]: [] }));
      return [...arr, a];
    });
  };

  const toggleSensation = (area: string, s: string) => {
    setSensations((cur) => {
      const list = cur[area] || [];
      return { ...cur, [area]: list.includes(s) ? list.filter((x) => x !== s) : [...list, s] };
    });
  };

  const sortedByRating = useMemo(
    () => Object.entries(ratings).sort((a, b) => b[1] - a[1]),
    [ratings],
  );
  const primary = sortedByRating[0]?.[0];
  const secondary = sortedByRating.slice(1, 3).map((x) => x[0]);

  const handleSave = async () => {
    if (!selected.length) {
      toast({ title: "Select at least one body area", variant: "destructive" });
      return;
    }
    try {
      await save.mutateAsync({
        primary_anchor: primary || null,
        secondary_anchors: secondary,
        ratings,
        sensations,
      });
      toast({ title: "Anchor map saved", description: "Your nervous system profile is updated." });
      setSelected([]); setRatings({}); setSensations({});
    } catch (e: any) {
      toast({ title: "Could not save", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="font-serif text-2xl">Body Anchor Mapping</h2>
        <p className="text-sm italic text-muted-foreground">
          When you feel calm, grounded, or present, where do you feel it most strongly?
        </p>
      </header>

      {latest && (
        <Card className="bg-card/60"><CardContent className="pt-5 space-y-1">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Your current profile</p>
          <p className="text-sm">
            Primary anchor:{" "}
            <span className="font-medium">{latest.primary_anchor || "—"}</span>
          </p>
          {latest.secondary_anchors?.length > 0 && (
            <p className="text-sm">Secondary: <span className="font-medium">{latest.secondary_anchors.join(", ")}</span></p>
          )}
        </CardContent></Card>
      )}

      <Card><CardContent className="pt-6 space-y-3">
        <Label className="font-serif text-lg">Select your anchor areas</Label>
        <div className="flex flex-wrap gap-2">
          {ANCHOR_BODY_AREAS.map((a) => (
            <Pill key={a} active={selected.includes(a)} onClick={() => toggleArea(a)}>{a}</Pill>
          ))}
        </div>
      </CardContent></Card>

      {selected.map((area) => (
        <Card key={area}><CardContent className="pt-6 space-y-4">
          <Label className="font-serif text-lg">{area}</Label>
          <div>
            <p className="text-sm text-muted-foreground mb-2">How stabilising does this area feel?</p>
            <Slider
              value={[ratings[area] ?? 5]}
              min={1} max={10} step={1}
              onValueChange={(v) => setRatings((r) => ({ ...r, [area]: v[0] }))}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>1</span>
              <span className="text-foreground font-medium">{ratings[area] ?? 5}/10</span>
              <span>10</span>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">Sensation type</p>
            <div className="flex flex-wrap gap-2">
              {ANCHOR_SENSATIONS.map((s) => (
                <Pill
                  key={s}
                  active={(sensations[area] || []).includes(s)}
                  onClick={() => toggleSensation(area, s)}
                >
                  {s}
                </Pill>
              ))}
            </div>
          </div>
        </CardContent></Card>
      ))}

      {selected.length > 0 && (
        <>
          <Card className="bg-primary/5"><CardContent className="pt-5 space-y-2">
            <p className="text-sm">
              Your strongest anchor point is{" "}
              <span className="font-medium">{primary}</span>.
            </p>
            {secondary.length > 0 && (
              <p className="text-sm">
                Secondary anchors: <span className="font-medium">{secondary.join(" and ")}</span>.
              </p>
            )}
          </CardContent></Card>
          <div className="flex justify-end">
            <Button size="lg" onClick={handleSave} disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save Anchor Map"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// 3. Baseline Stability Tracker
// ════════════════════════════════════════════════════════════════════════════
const StabilitySection = () => {
  const { toast } = useToast();
  const save = useSaveStabilityCheckin();
  const { data: checkins = [] } = useStabilityCheckins();

  const [body, setBody] = useState(5);
  const [reg, setReg] = useState(5);
  const [truth, setTruth] = useState(5);
  const [cap, setCap] = useState(5);

  const score = useMemo(() => (body + reg + truth + cap) / 4, [body, reg, truth, cap]);

  const handleSave = async () => {
    try {
      await save.mutateAsync({
        body_connection: body,
        regulation: reg,
        truth_connection: truth,
        capacity: cap,
        score: Number(score.toFixed(2)),
      });
      toast({ title: "Check-in saved", description: `Stability: ${score.toFixed(1)} / 10` });
      setBody(5); setReg(5); setTruth(5); setCap(5);
    } catch (e: any) {
      toast({ title: "Could not save", description: e.message, variant: "destructive" });
    }
  };

  // Trends
  const trend30 = useMemo(() => {
    const cutoff = Date.now() - 30 * 86400000;
    return checkins
      .filter((c) => new Date(c.entry_date).getTime() >= cutoff)
      .slice().reverse()
      .map((c) => ({ date: c.entry_date.slice(5), score: Number(c.score) }));
  }, [checkins]);

  const current = checkins[0]?.score;

  // Insights
  const insight = useMemo(() => {
    if (checkins.length < 3) return null;
    const avgs = {
      bodyConnection: avg(checkins.map((c) => c.body_connection)),
      regulation: avg(checkins.map((c) => c.regulation)),
      truthConnection: avg(checkins.map((c) => c.truth_connection)),
      capacity: avg(checkins.map((c) => c.capacity)),
    };
    const top = Object.entries(avgs).sort((a, b) => b[1] - a[1])[0];
    const labels: Record<string, string> = {
      bodyConnection: "Body Connection",
      regulation: "Regulation",
      truthConnection: "Truth Connection",
      capacity: "Capacity",
    };
    return `Your strongest area is ${labels[top[0]]} (avg ${top[1].toFixed(1)} / 10).`;
  }, [checkins]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="font-serif text-2xl">Baseline Stability Tracker</h2>
        <p className="text-sm italic text-muted-foreground">
          Not mood. Not emotion. How anchored your nervous system feels today.
        </p>
      </header>

      <Card><CardContent className="pt-6 space-y-6">
        <RatingRow label="Present — How connected do you feel to your body today?" value={body} onChange={setBody} />
        <RatingRow label="Regulation — How easily can you return to calm after activation?" value={reg} onChange={setReg} />
        <RatingRow label="Truth — How connected do you feel to what is true for you right now?" value={truth} onChange={setTruth} />
        <RatingRow label="Capacity — How much emotional capacity do you have today?" value={cap} onChange={setCap} />

        <div className="border-t border-border pt-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Baseline stability</p>
            <p className="text-3xl font-serif">{score.toFixed(1)} / 10</p>
          </div>
          <Button size="lg" onClick={handleSave} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save Check-in"}
          </Button>
        </div>
      </CardContent></Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatTile label="Current stability" value={current ? `${Number(current).toFixed(1)} / 10` : "—"} />
        <StatTile label="Check-ins" value={checkins.length} />
        <StatTile label="30-day avg" value={trend30.length ? (avg(trend30.map((t) => t.score))).toFixed(1) : "—"} />
      </div>

      {trend30.length > 1 && (
        <Card><CardContent className="pt-6">
          <p className="text-sm font-medium mb-2">30 day trend</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend30}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis domain={[0, 10]} fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent></Card>
      )}

      {insight && (
        <Card className="bg-primary/5"><CardContent className="pt-5">
          <p className="text-sm italic">{insight}</p>
        </CardContent></Card>
      )}
    </div>
  );
};

const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / Math.max(arr.length, 1);

const RatingRow = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
  <div className="space-y-2">
    <Label className="text-sm font-normal">{label}</Label>
    <Slider value={[value]} min={1} max={10} step={1} onValueChange={(v) => onChange(v[0])} />
    <div className="flex justify-between text-xs text-muted-foreground">
      <span>1</span>
      <span className="text-foreground font-medium">{value}</span>
      <span>10</span>
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════════════════════
// 4. Weekly Anchoring Log
// ════════════════════════════════════════════════════════════════════════════
const BEST_TOOLS = [
  { value: "orient", label: "Orient" },
  { value: "breath", label: "Breath" },
  { value: "anchor_point", label: "Anchor Point" },
  { value: "truth", label: "Truth" },
] as const;

const WeeklySection = () => {
  const { toast } = useToast();
  const save = useSaveWeeklyAnchoring();
  const { data: weeks = [] } = useWeeklyAnchoring();

  const [triggers, setTriggers] = useState<string[]>([]);
  const [bodyResponse, setBodyResponse] = useState("");
  const [bestTool, setBestTool] = useState<string>("");
  const [truth, setTruth] = useState("");
  const [returnStrategy, setReturnStrategy] = useState("");
  const [nextFocus, setNextFocus] = useState("");

  const toggle = (v: string) =>
    setTriggers((arr) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]));

  const reset = () => {
    setTriggers([]); setBodyResponse(""); setBestTool(""); setTruth(""); setReturnStrategy(""); setNextFocus("");
  };

  const handleSave = async () => {
    try {
      await save.mutateAsync({
        week_start: getMondayISO(),
        triggers,
        body_response: bodyResponse || null,
        best_tool: (bestTool || null) as any,
        truth: truth || null,
        return_strategy: returnStrategy || null,
        next_week_focus: nextFocus || null,
      });
      toast({ title: "Weekly log saved", description: "Your reflection is held." });
      reset();
    } catch (e: any) {
      toast({ title: "Could not save", description: e.message, variant: "destructive" });
    }
  };

  // Summary from latest entry
  const latest = weeks[0];
  const summary = useMemo(() => {
    if (!latest) return null;
    const t = latest.triggers || [];
    const triggerText = t.length
      ? `${t.slice(0, 2).join(" and ")} ${t.length > 2 ? "were among your biggest destabilisers" : (t.length === 1 ? "was your biggest destabiliser" : "were your biggest destabilisers")}`
      : "no specific triggers were named";
    const toolLabel = BEST_TOOLS.find((b) => b.value === latest.best_tool)?.label;
    return [
      `This week, ${triggerText}.`,
      toolLabel ? `Your most effective anchoring tool was ${toolLabel}.` : null,
      latest.truth ? `The truth you returned to: "${latest.truth}"` : null,
      latest.next_week_focus ? `Next week: ${latest.next_week_focus}` : null,
    ].filter(Boolean).join(" ");
  }, [latest]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="font-serif text-2xl">Weekly Anchoring Log</h2>
        <p className="text-sm italic text-muted-foreground">
          What pulled you out of yourself this week — and what helped you return?
        </p>
      </header>

      <Card><CardContent className="pt-6 space-y-3">
        <Label className="font-serif text-lg">What pulled you out of yourself this week?</Label>
        <div className="flex flex-wrap gap-2">
          {WEEKLY_TRIGGERS.map((t) => (
            <Pill key={t} active={triggers.includes(t)} onClick={() => toggle(t)}>{t}</Pill>
          ))}
        </div>
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-3">
        <Label className="font-serif text-lg">What happened in your body?</Label>
        <Textarea rows={3} value={bodyResponse} onChange={(e) => setBodyResponse(e.target.value)}
          placeholder="Sensations, signals, places of tension or contraction…" />
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-3">
        <Label className="font-serif text-lg">Which Anchoring step helped most?</Label>
        <div className="flex flex-wrap gap-2">
          {BEST_TOOLS.map((b) => (
            <Pill key={b.value} active={bestTool === b.value} onClick={() => setBestTool(b.value)}>{b.label}</Pill>
          ))}
        </div>
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-3">
        <Label className="font-serif text-lg">What truth did you reconnect to?</Label>
        <Textarea rows={2} value={truth} onChange={(e) => setTruth(e.target.value)}
          placeholder='e.g. "I am overwhelmed, not unsafe."' />
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-3">
        <Label className="font-serif text-lg">What helped you return to yourself?</Label>
        <Textarea rows={2} value={returnStrategy} onChange={(e) => setReturnStrategy(e.target.value)} />
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-3">
        <Label className="font-serif text-lg">What do you want to practice next week?</Label>
        <Textarea rows={2} value={nextFocus} onChange={(e) => setNextFocus(e.target.value)} />
      </CardContent></Card>

      <div className="flex justify-end">
        <Button size="lg" onClick={handleSave} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save Weekly Log"}
        </Button>
      </div>

      {summary && (
        <Card className="bg-primary/5"><CardContent className="pt-5 space-y-1">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Last week's summary</p>
          <p className="text-sm italic">{summary}</p>
        </CardContent></Card>
      )}
    </div>
  );
};