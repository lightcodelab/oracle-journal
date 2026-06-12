import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Copy, Star, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  RELATIONSHIP_CATEGORIES,
  useAuditEntries, useSaveAuditEntry,
  useRehearsalScripts, useSaveRehearsal,
  useScriptLibrary, useAddLibraryScript, useToggleFavourite, useDeleteLibraryScript,
  useReflections, useSaveReflection,
  BoundaryAuditEntry, RehearsalScript, LibraryScript,
} from "@/hooks/useBoundaryAudit";

const BODY_SIGNALS = [
  "Tight chest","Shallow breath","Jaw clenching","Stomach drop","Nausea",
  "Heaviness","Heat","Numbness","Urge to leave","Urge to please","Throat closing",
  "Shoulders tense","Heart racing","Frozen/still","Other",
];

const ABANDONMENT_PATTERNS = [
  "Said yes when I meant no","Stayed silent","Overexplained",
  "Took responsibility for their emotions","Ignored my capacity",
  "Let someone cross a limit","Softened my truth",
  "Offered emotional labour I did not have","Replied too quickly",
  "Avoided conflict","Rescued/fixed","Other",
];

const SOMATIC_MAP: { area: string; signals: string[] }[] = [
  { area: "Chest", signals: ["tight","heavy","open","fluttery","compressed"] },
  { area: "Throat", signals: ["closed","blocked","hot","unable to speak","pressure"] },
  { area: "Belly", signals: ["drop","nausea","knot","clench","heaviness"] },
  { area: "Breath", signals: ["shallow","held","fast","restricted","deep/clear"] },
  { area: "Nervous System", signals: ["freeze","fawn","fight","flight","numbness","collapse"] },
];

const RECOVERY_OPTIONS: { value: string; label: string }[] = [
  { value: "under_5m", label: "under 5 minutes" },
  { value: "5_15m",   label: "5–15 minutes" },
  { value: "15_60m",  label: "15–60 minutes" },
  { value: "1_4h",    label: "1–4 hours" },
  { value: "all_day", label: "all day" },
  { value: "longer",  label: "longer" },
];

const SECTIONS = [
  { key: "journal",     label: "1. Boundary Audit Journal" },
  { key: "signals",     label: "2. Somatic Signal Map" },
  { key: "rehearsal",   label: "3. Rehearsal Builder" },
  { key: "library",     label: "4. \u201CNext Time\u201D Script Library" },
  { key: "reflections", label: "5. Integrity Reflections" },
  { key: "patterns",    label: "6. Pattern Tracker" },
  { key: "dashboard",   label: "7. Progress Dashboard" },
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

export const BoundaryIntegrityAuditHub = () => {
  const [section, setSection] = useState<SectionKey>("journal");
  // Carry the latest "next time" sentence into Rehearsal
  const [carryScript, setCarryScript] = useState<{ text: string; category?: string; auditEntryId?: string } | null>(null);

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
      {/* Section nav */}
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <Pill key={s.key} active={section === s.key} onClick={() => setSection(s.key)}>
            {s.label}
          </Pill>
        ))}
      </div>

      <div className="min-h-[300px]">
        {section === "journal" && (
          <JournalSection
            onSendToRehearsal={(s) => { setCarryScript(s); setSection("rehearsal"); }}
          />
        )}
        {section === "signals" && <SignalMapSection />}
        {section === "rehearsal" && <RehearsalSection carry={carryScript} onClear={() => setCarryScript(null)} />}
        {section === "library" && <LibrarySection />}
        {section === "reflections" && <ReflectionsSection />}
        {section === "patterns" && <PatternsSection />}
        {section === "dashboard" && <DashboardSection />}
      </div>

      {/* Prev / Next */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button variant="ghost" onClick={goPrev} disabled={SECTIONS[0].key === section}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        <p className="text-xs text-muted-foreground italic hidden sm:block">
          Take a breath. Move through these in your own time.
        </p>
        <Button onClick={goNext} disabled={SECTIONS[SECTIONS.length - 1].key === section}>
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// 1. Boundary Audit Journal
// ════════════════════════════════════════════════════════════════════════════
const JournalSection = ({
  onSendToRehearsal,
}: {
  onSendToRehearsal: (s: { text: string; category?: string; auditEntryId?: string }) => void;
}) => {
  const { toast } = useToast();
  const save = useSaveAuditEntry();
  const [situation, setSituation] = useState("");
  const [truthStatus, setTruthStatus] = useState<string>("");
  const [truthText, setTruthText] = useState("");
  const [bodySignals, setBodySignals] = useState<string[]>([]);
  const [bodyFirst, setBodyFirst] = useState("");
  const [patterns, setPatterns] = useState<string[]>([]);
  const [abandonmentText, setAbandonmentText] = useState("");
  const [neededBoundary, setNeededBoundary] = useState("");
  const [nextTime, setNextTime] = useState("");
  const [category, setCategory] = useState<string>("");
  const [rating, setRating] = useState<number>(2);

  const toggle = (arr: string[], v: string, set: (a: string[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const reset = () => {
    setSituation(""); setTruthStatus(""); setTruthText(""); setBodySignals([]);
    setBodyFirst(""); setPatterns([]); setAbandonmentText(""); setNeededBoundary("");
    setNextTime(""); setCategory(""); setRating(2);
  };

  const handleSave = async () => {
    try {
      await save.mutateAsync({
        situation, truth_status: truthStatus as any, truth_text: truthText,
        body_signals: bodySignals, body_first_response: bodyFirst,
        abandonment_patterns: patterns, abandonment_text: abandonmentText,
        needed_boundary: neededBoundary, next_time_script: nextTime,
        relationship_category: category || null, integrity_rating: rating,
      });
      toast({ title: "Saved", description: "Your boundary audit is held." });
      reset();
    } catch (e: any) {
      toast({ title: "Could not save", description: e.message, variant: "destructive" });
    }
  };

  const handleSendToRehearsal = async () => {
    if (!nextTime.trim()) {
      toast({ title: "Write a next-time sentence first", variant: "destructive" });
      return;
    }
    try {
      const saved = await save.mutateAsync({
        situation, truth_status: truthStatus as any, truth_text: truthText,
        body_signals: bodySignals, body_first_response: bodyFirst,
        abandonment_patterns: patterns, abandonment_text: abandonmentText,
        needed_boundary: neededBoundary, next_time_script: nextTime,
        relationship_category: category || null, integrity_rating: rating,
      });
      onSendToRehearsal({ text: nextTime, category, auditEntryId: saved.id });
      reset();
    } catch (e: any) {
      toast({ title: "Could not send", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="font-serif text-2xl">Boundary Audit Journal</h2>
        <p className="text-sm italic text-muted-foreground">Where did you leave yourself? Begin gently.</p>
      </header>

      <Card><CardContent className="pt-6 space-y-4">
        <Label className="font-serif text-lg">Situation</Label>
        <Textarea rows={2} value={situation} onChange={(e) => setSituation(e.target.value)}
          placeholder="What happened? Where? With whom?" />
        <div>
          <Label className="font-serif text-lg">Relationship</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="mt-2"><SelectValue placeholder="Choose…" /></SelectTrigger>
            <SelectContent>
              {RELATIONSHIP_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardContent></Card>

      {/* Step 1 */}
      <Card><CardContent className="pt-6 space-y-3">
        <Label className="font-serif text-lg">Step 1 — What was your truth?</Label>
        <p className="text-sm italic text-muted-foreground">In this moment, was your body a yes, a no, or unsure?</p>
        <RadioGroup value={truthStatus} onValueChange={setTruthStatus} className="flex flex-wrap gap-4">
          {[["yes","Yes"],["no","No"],["unsure","Unsure"],["need_more_info","I need more information"]].map(([v,l]) => (
            <div key={v} className="flex items-center gap-2">
              <RadioGroupItem value={v} id={`truth-${v}`} />
              <Label htmlFor={`truth-${v}`} className="font-normal">{l}</Label>
            </div>
          ))}
        </RadioGroup>
        <Textarea rows={2} value={truthText} onChange={(e) => setTruthText(e.target.value)}
          placeholder="What did you actually want, need, or know?" />
      </CardContent></Card>

      {/* Step 2 */}
      <Card><CardContent className="pt-6 space-y-3">
        <Label className="font-serif text-lg">Step 2 — How did your body signal this truth?</Label>
        <div className="flex flex-wrap gap-2">
          {BODY_SIGNALS.map((s) => (
            <Pill key={s} active={bodySignals.includes(s)} onClick={() => toggle(bodySignals, s, setBodySignals)}>
              {s}
            </Pill>
          ))}
        </div>
        <Textarea rows={2} value={bodyFirst} onChange={(e) => setBodyFirst(e.target.value)}
          placeholder="What did your body do first?" />
      </CardContent></Card>

      {/* Step 3 */}
      <Card><CardContent className="pt-6 space-y-3">
        <Label className="font-serif text-lg">Step 3 — How did self-abandonment show up?</Label>
        <div className="flex flex-wrap gap-2">
          {ABANDONMENT_PATTERNS.map((p) => (
            <Pill key={p} active={patterns.includes(p)} onClick={() => toggle(patterns, p, setPatterns)}>{p}</Pill>
          ))}
        </div>
        <Textarea rows={2} value={abandonmentText} onChange={(e) => setAbandonmentText(e.target.value)}
          placeholder="What did you do that moved you away from your truth?" />
      </CardContent></Card>

      {/* Step 4 */}
      <Card><CardContent className="pt-6 space-y-3">
        <Label className="font-serif text-lg">Step 4 — What boundary was needed?</Label>
        <p className="text-sm italic text-muted-foreground">
          E.g. "I need more time before deciding." · "I can't take this on today." · "That tone doesn't feel good to me."
        </p>
        <Textarea rows={3} value={neededBoundary} onChange={(e) => setNeededBoundary(e.target.value)}
          placeholder="If you honoured your truth, what boundary would you have spoken or enacted?" />
      </CardContent></Card>

      {/* Step 5 */}
      <Card><CardContent className="pt-6 space-y-3">
        <Label className="font-serif text-lg">Step 5 — What will you do next time?</Label>
        <Textarea rows={3} value={nextTime} onChange={(e) => setNextTime(e.target.value)}
          placeholder="Write the exact sentence you will use next time." />
        <Button variant="outline" size="sm" onClick={handleSendToRehearsal} disabled={save.isPending}>
          Send to Rehearsal Builder →
        </Button>
      </CardContent></Card>

      {/* Rating */}
      <Card><CardContent className="pt-6 space-y-3">
        <Label className="font-serif text-lg">Boundary integrity (0–4)</Label>
        <Slider value={[rating]} min={0} max={4} step={1} onValueChange={(v) => setRating(v[0])} />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>collapsed</span><span className="text-foreground font-medium">{rating}</span><span>fully held</span>
        </div>
      </CardContent></Card>

      <div className="flex justify-end">
        <Button size="lg" onClick={handleSave} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save Boundary Audit"}
        </Button>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// 2. Somatic Signal Map
// ════════════════════════════════════════════════════════════════════════════
const SignalMapSection = () => {
  const [selected, setSelected] = useState<string[]>([]);
  const { toast } = useToast();
  const toggle = (s: string) =>
    setSelected((arr) => (arr.includes(s) ? arr.filter((x) => x !== s) : [...arr, s]));

  const copy = () => {
    if (!selected.length) return;
    navigator.clipboard.writeText(selected.join(", "));
    toast({ title: "Copied", description: "Paste these into your Boundary Audit Journal." });
  };

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h2 className="font-serif text-2xl">Somatic Boundary Signal Map</h2>
        <p className="text-sm italic text-muted-foreground">
          What did your body know? Tap the sensations you noticed.
        </p>
      </header>
      {SOMATIC_MAP.map((g) => (
        <Card key={g.area}><CardContent className="pt-6 space-y-3">
          <Label className="font-serif text-lg">{g.area}</Label>
          <div className="flex flex-wrap gap-2">
            {g.signals.map((s) => {
              const tag = `${g.area}: ${s}`;
              return (
                <Pill key={s} active={selected.includes(tag)} onClick={() => toggle(tag)}>{s}</Pill>
              );
            })}
          </div>
        </CardContent></Card>
      ))}
      {selected.length > 0 && (
        <Card className="bg-card/60"><CardContent className="pt-6 space-y-3">
          <p className="text-sm font-medium">Selected signals</p>
          <p className="text-sm text-muted-foreground italic">{selected.join(" · ")}</p>
          <Button variant="outline" size="sm" onClick={copy}>
            <Copy className="h-4 w-4 mr-1" /> Copy to journal
          </Button>
        </CardContent></Card>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// 3. Rehearsal Builder
// ════════════════════════════════════════════════════════════════════════════
const RehearsalSection = ({
  carry,
  onClear,
}: {
  carry: { text: string; category?: string; auditEntryId?: string } | null;
  onClear: () => void;
}) => {
  const { toast } = useToast();
  const save = useSaveRehearsal();
  const addToLib = useAddLibraryScript();
  const { data: scripts = [] } = useRehearsalScripts();

  const [original, setOriginal] = useState(carry?.text ?? "");
  const [shorter, setShorter] = useState("");
  const [noApology, setNoApology] = useState("");
  const [noOver, setNoOver] = useState("");
  const [finalText, setFinalText] = useState("");
  const [category, setCategory] = useState<string>(carry?.category ?? "");

  // Apply carry whenever it changes
  useState(() => {
    if (carry) { setOriginal(carry.text); setCategory(carry.category ?? ""); }
    return null;
  });

  const reset = () => {
    setOriginal(""); setShorter(""); setNoApology(""); setNoOver(""); setFinalText(""); setCategory("");
    onClear();
  };

  const handleSave = async (alsoLibrary = false) => {
    if (!finalText.trim()) {
      toast({ title: "Write your final sentence first", variant: "destructive" });
      return;
    }
    try {
      await save.mutateAsync({
        audit_entry_id: carry?.auditEntryId ?? null,
        original_text: original, shorter_text: shorter, no_apology_text: noApology,
        no_overexplain_text: noOver, final_text: finalText,
        relationship_category: category || null, added_to_library: alsoLibrary,
      });
      if (alsoLibrary && category) {
        await addToLib.mutateAsync({ category, text: finalText });
      }
      toast({ title: "Script saved", description: alsoLibrary ? "Added to your library." : "Held in your rehearsals." });
      reset();
    } catch (e: any) {
      toast({ title: "Could not save", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h2 className="font-serif text-2xl">Rehearsal Builder</h2>
        <p className="text-sm italic text-muted-foreground">Practise the exact sentence — clean, calm, direct.</p>
      </header>

      <Card><CardContent className="pt-6 space-y-4">
        <div>
          <Label className="font-serif text-lg">Original sentence</Label>
          <Textarea rows={2} className="mt-2" value={original} onChange={(e) => setOriginal(e.target.value)} />
        </div>
        <div>
          <Label className="font-serif text-lg">Can this be shorter?</Label>
          <Textarea rows={2} className="mt-2" value={shorter} onChange={(e) => setShorter(e.target.value)} />
        </div>
        <div>
          <Label className="font-serif text-lg">Can this be said without apology?</Label>
          <Textarea rows={2} className="mt-2" value={noApology} onChange={(e) => setNoApology(e.target.value)} />
        </div>
        <div>
          <Label className="font-serif text-lg">Can this be said without overexplaining?</Label>
          <Textarea rows={2} className="mt-2" value={noOver} onChange={(e) => setNoOver(e.target.value)} />
        </div>
        <div>
          <Label className="font-serif text-lg">Final boundary sentence</Label>
          <Textarea rows={2} className="mt-2" value={finalText} onChange={(e) => setFinalText(e.target.value)} />
        </div>
        <div>
          <Label className="font-serif text-lg">For which relationship?</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="mt-2"><SelectValue placeholder="Choose category…" /></SelectTrigger>
            <SelectContent>
              {RELATIONSHIP_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2 justify-end pt-2">
          <Button variant="ghost" onClick={reset}>Practise Again</Button>
          <Button variant="outline" onClick={() => handleSave(false)} disabled={save.isPending}>Save Script</Button>
          <Button onClick={() => handleSave(true)} disabled={save.isPending || !category}>
            Add to Script Library
          </Button>
        </div>
      </CardContent></Card>

      {scripts.length > 0 && (
        <Card><CardHeader><CardTitle className="font-serif">Recent rehearsals</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {scripts.slice(0, 5).map((s: RehearsalScript) => (
              <div key={s.id} className="text-sm border-b border-border pb-2 last:border-0">
                <p className="text-foreground">{s.final_text}</p>
                <p className="text-xs text-muted-foreground">
                  {s.relationship_category ?? "—"} · {new Date(s.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// 4. Script Library
// ════════════════════════════════════════════════════════════════════════════
const LibrarySection = () => {
  const { data: scripts = [] } = useScriptLibrary();
  const fav = useToggleFavourite();
  const del = useDeleteLibraryScript();
  const add = useAddLibraryScript();
  const { toast } = useToast();
  const [filter, setFilter] = useState<string>("All");
  const [newCategory, setNewCategory] = useState<string>("Family");
  const [newText, setNewText] = useState("");

  const filtered = useMemo(
    () => scripts.filter((s) => filter === "All" || s.category === filter),
    [scripts, filter],
  );

  const grouped = useMemo(() => {
    const m: Record<string, LibraryScript[]> = {};
    filtered.forEach((s) => { (m[s.category] = m[s.category] || []).push(s); });
    return m;
  }, [filtered]);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied" });
  };

  const handleAdd = async () => {
    if (!newText.trim()) return;
    await add.mutateAsync({ category: newCategory, text: newText });
    setNewText("");
    toast({ title: "Added to your library" });
  };

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h2 className="font-serif text-2xl">"Next Time" Script Library</h2>
        <p className="text-sm italic text-muted-foreground">Short, true sentences you can return to.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {["All", ...RELATIONSHIP_CATEGORIES].map((c) => (
          <Pill key={c} active={filter === c} onClick={() => setFilter(c)}>{c}</Pill>
        ))}
      </div>

      <Card><CardContent className="pt-6 space-y-3">
        <Label className="font-serif text-lg">Add your own script</Label>
        <Select value={newCategory} onValueChange={setNewCategory}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {RELATIONSHIP_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input value={newText} onChange={(e) => setNewText(e.target.value)} placeholder="Type your sentence…" />
        <Button size="sm" onClick={handleAdd} disabled={!newText.trim() || add.isPending}>Add to library</Button>
      </CardContent></Card>

      {Object.entries(grouped).map(([cat, list]) => (
        <Card key={cat}>
          <CardHeader><CardTitle className="font-serif">{cat}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {list.map((s) => (
              <div key={s.id} className="flex items-start gap-2 border-b border-border pb-2 last:border-0">
                <p className="flex-1 text-sm">{s.text}</p>
                <Button variant="ghost" size="icon" onClick={() => fav.mutate(s)}>
                  <Star className={`h-4 w-4 ${s.is_favourite ? "fill-primary text-primary" : ""}`} />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => copy(s.text)}>
                  <Copy className="h-4 w-4" />
                </Button>
                {!s.is_seed && (
                  <Button variant="ghost" size="icon" onClick={() => del.mutate(s.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// 5. Integrity Reflections (daily check-in)
// ════════════════════════════════════════════════════════════════════════════
const ReflectionsSection = () => {
  const { toast } = useToast();
  const save = useSaveReflection();
  const [status, setStatus] = useState<string>("");
  const [held, setHeld] = useState("");
  const [wobbled, setWobbled] = useState("");
  const [practise, setPractise] = useState("");
  const [resentment, setResentment] = useState(2);
  const [communication, setCommunication] = useState(2);
  const [exhaustion, setExhaustion] = useState(2);
  const [recovery, setRecovery] = useState<string>("");
  const [outcome, setOutcome] = useState<string>("");

  const handleSave = async () => {
    try {
      await save.mutateAsync({
        status: status as any, held_text: held, wobbled_text: wobbled, practise_text: practise,
        resentment, communication, exhaustion,
        recovery_time: (recovery || null) as any,
        boundary_outcome: (outcome || null) as any,
      });
      toast({ title: "Saved", description: "Your reflection is held." });
      setStatus(""); setHeld(""); setWobbled(""); setPractise("");
      setResentment(2); setCommunication(2); setExhaustion(2);
      setRecovery(""); setOutcome("");
    } catch (e: any) {
      toast({ title: "Could not save", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h2 className="font-serif text-2xl">Integrity Reflections</h2>
        <p className="text-sm italic text-muted-foreground">A 10-second check-in. Was I true to myself today?</p>
      </header>

      <Card><CardContent className="pt-6 space-y-3">
        <Label className="font-serif text-lg">Was I true to myself today?</Label>
        <RadioGroup value={status} onValueChange={setStatus} className="flex flex-wrap gap-4">
          {[["yes","Yes"],["mostly","Mostly"],["partly","Partly"],["no","No"],["unsure","I'm not sure"]].map(([v,l]) => (
            <div key={v} className="flex items-center gap-2">
              <RadioGroupItem value={v} id={`s-${v}`} />
              <Label htmlFor={`s-${v}`} className="font-normal">{l}</Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-3">
        <Label className="font-serif text-lg">Where did I hold?</Label>
        <Textarea rows={2} value={held} onChange={(e) => setHeld(e.target.value)} />
      </CardContent></Card>
      <Card><CardContent className="pt-6 space-y-3">
        <Label className="font-serif text-lg">Where did I wobble?</Label>
        <Textarea rows={2} value={wobbled} onChange={(e) => setWobbled(e.target.value)} />
      </CardContent></Card>
      <Card><CardContent className="pt-6 space-y-3">
        <Label className="font-serif text-lg">What do I want to practise tomorrow?</Label>
        <Textarea rows={2} value={practise} onChange={(e) => setPractise(e.target.value)} />
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-4">
        <RatingSlider label="Resentment (0 very resentful · 4 clear and settled)" value={resentment} onChange={setResentment} />
        <RatingSlider label="Clarity of communication (0 unclear/silent · 4 clean and direct)" value={communication} onChange={setCommunication} />
        <RatingSlider label="Emotional exhaustion (0 depleted · 4 energised/stable)" value={exhaustion} onChange={setExhaustion} />
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-3">
        <Label className="font-serif text-lg">Recovery time after a wobble</Label>
        <Select value={recovery} onValueChange={setRecovery}>
          <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
          <SelectContent>
            {RECOVERY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Label className="font-serif text-lg pt-2">Today my boundary…</Label>
        <RadioGroup value={outcome} onValueChange={setOutcome} className="flex flex-wrap gap-4">
          {["held","wobbled","collapsed","repaired"].map((v) => (
            <div key={v} className="flex items-center gap-2">
              <RadioGroupItem value={v} id={`o-${v}`} />
              <Label htmlFor={`o-${v}`} className="font-normal capitalize">{v}</Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent></Card>

      <div className="flex justify-end">
        <Button size="lg" onClick={handleSave} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save Reflection"}
        </Button>
      </div>
    </div>
  );
};

const RatingSlider = ({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) => (
  <div className="space-y-2">
    <Label className="text-sm">{label}</Label>
    <Slider value={[value]} min={0} max={4} step={1} onValueChange={(v) => onChange(v[0])} />
    <div className="flex justify-between text-xs text-muted-foreground">
      <span>0</span><span className="text-foreground font-medium">{value}</span><span>4</span>
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════════════════════
// 6. Pattern Tracker
// ════════════════════════════════════════════════════════════════════════════
const PatternsSection = () => {
  const { data: entries = [] } = useAuditEntries();

  const stats = useMemo(() => {
    if (!entries.length) return null;
    const countFreq = (key: keyof BoundaryAuditEntry) => {
      const counts: Record<string, number> = {};
      entries.forEach((e: any) => {
        const arr = Array.isArray(e[key]) ? e[key] : (e[key] ? [e[key]] : []);
        (arr as string[]).forEach((v) => { counts[v] = (counts[v] || 0) + 1; });
      });
      return Object.entries(counts).sort((a, b) => b[1] - a[1]);
    };
    const ratings = entries.map((e) => e.integrity_rating).filter((r): r is number => r != null);
    const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    return {
      topSignal: countFreq("body_signals")[0],
      topPattern: countFreq("abandonment_patterns")[0],
      topRelationship: countFreq("relationship_category")[0],
      avgRating: avg,
      total: entries.length,
    };
  }, [entries]);

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h2 className="font-serif text-2xl">Pattern Tracker</h2>
        <p className="text-sm italic text-muted-foreground">What does your body keep saying?</p>
      </header>
      {!stats ? (
        <p className="text-sm italic text-muted-foreground">
          No entries yet. Begin in the Boundary Audit Journal.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          <Card><CardContent className="pt-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Entries</p>
            <p className="text-2xl font-serif">{stats.total}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Avg integrity</p>
            <p className="text-2xl font-serif">{stats.avgRating?.toFixed(2) ?? "—"}</p>
          </CardContent></Card>
          {stats.topSignal && (
            <Card><CardContent className="pt-6">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Most common body signal</p>
              <p className="text-lg">{stats.topSignal[0]} <span className="text-muted-foreground text-sm">({stats.topSignal[1]})</span></p>
            </CardContent></Card>
          )}
          {stats.topPattern && (
            <Card><CardContent className="pt-6">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Most repeated pattern</p>
              <p className="text-lg">{stats.topPattern[0]} <span className="text-muted-foreground text-sm">({stats.topPattern[1]})</span></p>
            </CardContent></Card>
          )}
          {stats.topRelationship && (
            <Card className="sm:col-span-2"><CardContent className="pt-6">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Most often with</p>
              <p className="text-lg">{stats.topRelationship[0]} <span className="text-muted-foreground text-sm">({stats.topRelationship[1]})</span></p>
            </CardContent></Card>
          )}
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// 7. Progress Dashboard
// ════════════════════════════════════════════════════════════════════════════
const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--muted-foreground))", "#a07b3a", "#7a5b25", "#cdb98a", "#5b4422", "#3e2d14"];

const DashboardSection = () => {
  const { data: reflections = [] } = useReflections();
  const { data: entries = [] } = useAuditEntries();

  const since = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d;
  }, []);

  const reflSorted = useMemo(
    () => [...reflections].filter((r) => new Date(r.created_at) >= since).reverse(),
    [reflections, since],
  );
  const lineData = reflSorted.map((r) => ({
    date: new Date(r.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    resentment: r.resentment ?? null,
    exhaustion: r.exhaustion ?? null,
    communication: r.communication ?? null,
  }));

  // Patterns bar chart
  const patternCounts: Record<string, number> = {};
  entries.forEach((e) => (e.abandonment_patterns || []).forEach((p) => { patternCounts[p] = (patternCounts[p] || 0) + 1; }));
  const patternBars = Object.entries(patternCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6);

  // Relationship pie
  const relCounts: Record<string, number> = {};
  entries.forEach((e) => { if (e.relationship_category) relCounts[e.relationship_category] = (relCounts[e.relationship_category] || 0) + 1; });
  const relPie = Object.entries(relCounts).map(([name, value]) => ({ name, value }));

  // Integrity score trend (from audit entries)
  const ratingsData = [...entries]
    .filter((e) => e.integrity_rating != null && new Date(e.created_at) >= since)
    .reverse()
    .map((e) => ({
      date: new Date(e.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      rating: e.integrity_rating,
    }));

  // Weekly outcome counts
  const outcomeCounts = { held: 0, wobbled: 0, collapsed: 0, repaired: 0 };
  reflections.forEach((r) => { if (r.boundary_outcome) (outcomeCounts as any)[r.boundary_outcome]++; });

  const hasAny = reflections.length || entries.length;

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h2 className="font-serif text-2xl">Progress Dashboard</h2>
        <p className="text-sm italic text-muted-foreground">30 days of returning to yourself.</p>
      </header>

      {!hasAny ? (
        <p className="text-sm italic text-muted-foreground">
          As you save reflections and audits, your patterns will appear here.
        </p>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(["held","wobbled","collapsed","repaired"] as const).map((k) => (
              <Card key={k}><CardContent className="pt-6">
                <p className="text-xs uppercase tracking-wider text-muted-foreground capitalize">{k}</p>
                <p className="text-2xl font-serif">{outcomeCounts[k]}</p>
              </CardContent></Card>
            ))}
          </div>

          {lineData.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="font-serif">Resentment · Exhaustion · Clarity</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer>
                    <LineChart data={lineData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                      <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <YAxis domain={[0, 4]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="resentment" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="exhaustion" stroke="#a07b3a" strokeWidth={2} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="communication" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {ratingsData.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="font-serif">Boundary integrity score</CardTitle></CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer>
                    <LineChart data={ratingsData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                      <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <YAxis domain={[0, 4]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                      <Line type="monotone" dataKey="rating" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid lg:grid-cols-2 gap-4">
            {patternBars.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="font-serif">Most common self-abandonment</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer>
                      <BarChart data={patternBars} layout="vertical" margin={{ left: 80 }}>
                        <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                        <YAxis dataKey="name" type="category" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} width={120} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                        <Bar dataKey="count" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
            {relPie.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="font-serif">Relationship contexts</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={relPie} dataKey="value" nameKey="name" outerRadius={80} label>
                          {relPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
};