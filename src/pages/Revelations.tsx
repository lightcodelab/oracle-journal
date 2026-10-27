import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFreeAccess } from "@/hooks/useFreeAccess";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EvidenceCollector } from "@/components/EvidenceCollector";
import { ShuffleAnimation } from "@/components/ShuffleAnimation";
import { DoorHeader } from "@/components/temple/DoorHeader";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import revelationsBanner from "@/assets/revelations-banner.png.asset.json";
const REVELATIONS_QUESTIONS = [
  "What am I most afraid people will discover if this doesn't work?",
  "What have I been telling myself is a strategy that might actually be a way of staying safe?",
  "What part of my business am I avoiding looking at directly, and what story am I telling myself about why?",
  "What would I have to admit about myself if the way I've been doing this simply isn't working?",
  "What do I know is true about why this isn't working that I haven't said out loud to anyone yet?",
  "Where am I waiting to feel ready, certain, or good enough before I fully commit to this?",
  "What would the version of me who suceeds wildly at this have to be willing to be seen doing or saying? And what would this say about me?",
];
import { cardImageSrc } from "@/lib/cardImage";
import { loadCardImages } from "@/lib/loadCardImages";
import { GUIDING_QUESTION_MAX } from "@/lib/evidenceFramework";
import { getStoredAffiliateRef } from "@/lib/affiliateTracking";
import cardBack from "@/assets/card-back-v2.png";
import type { Tables, Json } from "@/integrations/supabase/types";

type Revelation = Tables<"revelations_readings">;
type Answers = Record<string, string | undefined>;
const answersFrom = (value: Json): Answers => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => typeof entry === "string")) as Answers;
};
const SectionTitle = ({ children }: { children: string }) => <h2 className="font-serif text-2xl text-primary">{children}</h2>;

export default function Revelations() {
  const { user, loading: authLoading } = useAuth();
  const access = useFreeAccess();
  const [record, setRecord] = useState<Revelation | null>(null);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [focusChoice, setFocusChoice] = useState("none");
  const [drawing, setDrawing] = useState(false);
  const [imagesReady, setImagesReady] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [saveStatus, setSaveStatus] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const dirty = useRef(false);
  const latestAnswers = useRef<Answers>({});
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const generationLock = useRef(false);

  useEffect(() => {
    document.title = "Revelations | THE TEMPLE of Sustainment";
    const description = "A single Sacred Rewrite card, a personal Revelation, and a private Evidence Locker to return to.";
    for (const [name, content] of [["description", description], ["og:title", document.title], ["og:description", description], ["og:type", "website"], ["twitter:card", "summary"]]) {
      const attribute = name.startsWith("og:") ? "property" : "name";
      let meta = document.head.querySelector(`meta[${attribute}="${name}"]`);
      if (!meta) { meta = document.createElement("meta"); meta.setAttribute(attribute, name); document.head.appendChild(meta); }
      meta.setAttribute("content", content);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    let active = true;
    setLoading(true);
    void supabase.from("revelations_readings").select("*").eq("user_id", user.id).maybeSingle().then(({ data, error: readError }) => {
      if (!active) return;
      if (readError) setError("Your reading could not be opened. Please refresh to try again.");
      if (data) {
        setRecord(data); setQuestion(data.guiding_question); setAnswers(answersFrom(data.journal_answers));
        latestAnswers.current = answersFrom(data.journal_answers);
        setRevealed(Boolean(data.generated_reading));
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [user?.id, authLoading]);

  useEffect(() => {
    if (!record) return;
    let active = true;
    setImagesReady(false);
    const face = cardImageSrc(record.image_file_name);
    if (!face) { setError("Your card artwork is unavailable. Please try again later."); return; }
    void loadCardImages([face, cardBack]).then(() => { if (active) setImagesReady(true); }).catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [record?.id]);

  const saveAnswers = async () => {
    if (!record || !dirty.current) return;
    const id = record.id;
    setSaveStatus("Saving…");
    saveQueue.current = saveQueue.current.catch(() => undefined).then(async () => {
      const snapshot = { ...latestAnswers.current };
      const { error: saveError } = await supabase.from("revelations_readings").update({ journal_answers: snapshot }).eq("id", id);
      setSaveStatus(saveError ? "Your notes haven't saved. Please try again." : "Saved privately");
    });
    await saveQueue.current;
  };
  useEffect(() => {
    if (!dirty.current || !record) return;
    const timer = setTimeout(() => { void saveAnswers(); }, 600);
    return () => clearTimeout(timer);
  }, [answers, record?.id]);
  const changeAnswer = (key: string, value: string) => {
    dirty.current = true;
    latestAnswers.current = { ...latestAnswers.current, [key]: value };
    setAnswers(latestAnswers.current);
  };

  const draw = async (withQuestion: boolean) => {
    if (drawing || record) return;
    setDrawing(true); setError(null);
    const { data, error: drawError } = await supabase.rpc("draw_revelation", { _guiding_question: withQuestion ? question.trim() : "" });
    if (drawError || !data) setError(drawError?.message || "Your card could not be drawn. Please try again.");
    else setRecord(data as unknown as Revelation);
    setDrawing(false);
  };

  const generate = async () => {
    if (!record || record.generated_reading || generationLock.current) return;
    generationLock.current = true;
    setRevealed(true); setGenerating(true); setError(null);
    try {
      const { data, error: generationError } = await supabase.functions.invoke("revelations-reading", { body: { readingId: record.id } });
      if (generationError) {
        let message = generationError.message;
        const context = "context" in generationError ? generationError.context : null;
        if (context instanceof Response) {
          const payload = await context.clone().json().catch(() => null);
          if (typeof payload?.error === "string") message = payload.error;
        }
        throw new Error(message);
      }
      if (!data?.reading) throw new Error("Your reading returned no content. Please try again.");
      setRecord(prev => prev ? { ...prev, generated_reading: data.reading, generated_reading_model: data.model } : prev);
      void access.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Your reading could not be written."); }
    finally { generationLock.current = false; setGenerating(false); }
  };

  const checkout = async () => {
    if (checkingOut) return;
    setCheckingOut(true); setError(null);
    try {
      const ref = getStoredAffiliateRef();
      const { data, error: checkoutError } = await supabase.functions.invoke("stripe-checkout", {
        body: { cadence: "monthly", affiliateCode: ref?.code ?? null, affiliateLinkCode: ref?.linkCode ?? null, commissionModel: ref?.commissionModel ?? null },
      });
      if (checkoutError || !data?.url) throw new Error("We couldn't open the payment page. Please try again.");
      window.location.assign(data.url);
    } catch (e) { setError(e instanceof Error ? e.message : "Checkout unavailable."); setCheckingOut(false); }
  };

  return <div className="min-h-screen bg-background text-foreground">
    <header className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-5 border-b border-border">
      <Link to="/" className="font-serif text-primary">THE TEMPLE of Sustainment</Link>
      <Link to={user ? "/profile" : "/auth?redirect=/revelations"} className="text-sm text-muted-foreground underline">{user ? "My Profile" : "Sign in"}</Link>
    </header>
    <main className="mx-auto max-w-6xl px-5 pb-8 pt-0">
      <DoorHeader image={revelationsBanner.url} imageKey="revelations-header" title="REVELATIONS" srOnlyTitle flushTop />
      <div className="mx-auto max-w-3xl">
      <section className="mb-10 mt-12 space-y-5 text-center">
        <h2 className="font-serif text-3xl text-primary">Welcome. There is room for you here.</h2>
        <p className="mx-auto max-w-2xl leading-relaxed text-muted-foreground">REVELATIONS is a quiet meeting with one card from The Sacred Rewrite deck, and with what may be moving beneath the work you are bringing into the world.</p>
        {record?.guiding_question && <>
          <div className="mx-auto w-full max-w-2xl border-t border-border" />
          <p className="mx-auto max-w-2xl italic leading-relaxed text-muted-foreground">{record.guiding_question}</p>
        </>}
      </section>
      {!record && !access.freeReadingUsed && <>
        <ol className="mb-10 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8 list-decimal pl-6 font-serif text-lg leading-relaxed marker:text-primary">
          <li className="pl-2">Sit quietly for a moment. Bring to mind whatever is sitting heaviest in your business right now.</li>
          <li className="pl-2">Let one of the questions below find you. You don't need to answer it. Just hold it.</li>
          <li className="pl-2">Draw your card. Let it show you what is ready to be named.</li>
        </ol>
        <section aria-label="Choose your guiding focus" className="-mx-5 bg-muted/40 px-5 pt-10 pb-8 sm:mx-0 sm:px-8 sm:pt-12">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-5 sm:gap-10">
          <div className="sm:col-span-2">
            <p id="revelations-focus-introduction" className="text-muted-foreground leading-relaxed">Before you draw your card, you might like to bring one of these questions into your reading.{"\u00a0"}<br /><br /><br />You don't need to arrive with a question, but if it helps to focus the reading, here are some places other women have found it useful to begin.{"\u00a0"}<br /><br /><br />Click what pulls at you, or bring whatever is sitting heaviest on your heart right now.</p>
          </div>
          <div className="sm:col-span-3">
        <RadioGroup aria-label="Guiding focus for your reading" aria-describedby="revelations-focus-introduction" value={focusChoice} onValueChange={value => { setFocusChoice(value); setQuestion(value === "none" || value === "own" ? "" : value); }} className="gap-5">
          {REVELATIONS_QUESTIONS.map((prompt, index) => <label key={prompt} htmlFor={`revelations-focus-${index}`} className="flex cursor-pointer items-start gap-4 text-muted-foreground leading-relaxed has-[[data-state=checked]]:text-foreground">
            <RadioGroupItem id={`revelations-focus-${index}`} value={prompt} className="mt-1 shrink-0" />
            <span className="italic">{prompt}</span>
          </label>)}
          <label htmlFor="revelations-focus-own" className="flex cursor-pointer items-start gap-4 text-muted-foreground leading-relaxed"><RadioGroupItem id="revelations-focus-own" value="own" className="mt-1 shrink-0" /><span>I have my own question I want to use.</span></label>
          {focusChoice === "own" && <Textarea id="revelations-question" aria-label="Your own guiding question" value={question} onChange={e => setQuestion(e.target.value)} maxLength={GUIDING_QUESTION_MAX} rows={3} placeholder="Write your own question or focus prompt here" />}
          <label htmlFor="revelations-focus-none" className="flex cursor-pointer items-start gap-4 text-muted-foreground leading-relaxed"><RadioGroupItem id="revelations-focus-none" value="none" className="mt-1 shrink-0" /><span>Let the card find me without a question.</span></label>
        </RadioGroup>
          </div>
        </div>
        </section>
        <p className="my-10 text-center font-serif text-xl leading-relaxed">You've done the work. Something is still running beneath it. This is where it gets named.</p>
      </>}
      {(loading || authLoading || access.loading) ? <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" aria-label="Opening your reading" /> : !user ? <div className="text-center space-y-6">
        <p className="text-muted-foreground">Sign in to receive your card and return to your Evidence Locker.</p>
        <Button asChild><Link to="/auth?redirect=/revelations">Sign in</Link></Button>
        <p><Link to="/free-reading" className="text-primary underline">Create your free account</Link></p>
      </div> : !record ? access.freeReadingUsed ? <div className="text-center space-y-6">
        <p>Your introductory reading has already been used. Your saved reading remains yours.</p>
        <Button asChild variant="outline"><Link to="/readings">Return to My Readings</Link></Button>
        <Button onClick={checkout} disabled={checkingOut}>Join us in The Temple</Button>
      </div> : <div className="mb-10 text-center">
        <Button size="lg" onClick={() => void draw(true)} disabled={drawing}><Sparkles className="mr-2 h-4 w-4" />{drawing ? "Preparing your card…" : "Shuffle & Draw My Card"}</Button>
      </div> : <>
        {!imagesReady ? <p className="text-center text-muted-foreground">Preparing your card artwork…</p> : !revealed ? <ShuffleAnimation cardBackImage={cardBack} onReveal={() => void generate()} /> : <div className="flex justify-center mb-10"><img src={cardImageSrc(record.image_file_name)} alt={record.card_title} className="w-64 sm:w-72 aspect-[7/10] rounded-lg object-cover" /></div>}
        {revealed && <div className="space-y-10 leading-relaxed">
          <section className="space-y-5">
            <SectionTitle>YOUR READING</SectionTitle>
            {generating ? <p className="flex items-center gap-2 text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" />Your Revelation is being written…</p> : record.generated_reading ? <p className="whitespace-pre-line font-serif text-lg leading-relaxed">{record.generated_reading}</p> : <Button onClick={() => void generate()}>Try writing my reading again</Button>}
          </section>
          {record.generated_reading && <>
            <section className="space-y-4">
              <SectionTitle>REVEAL</SectionTitle>
              <p>Sit quietly with this card for a moment before you do anything else. Not to decide if it's true or to analyse where it came from...just to notice: Where in your body do you feel something when you read this? Stay there for 30 seconds, that's enough.</p>
              <label htmlFor="revelations-sit" className="block font-serif">Name how this has shown up for you.</label>
              <Textarea id="revelations-sit" rows={4} value={answers.pattern_location || ""} onChange={e => changeAnswer("pattern_location", e.target.value)} />
            </section>
            <section className="space-y-4">
              <SectionTitle>REGULATE</SectionTitle>
              <p>You've named something now and your nervous system may be responding. This is normal and you are okay.</p>
              <p>Before you begin investigating, let your body settle first. This is how we work inside The Temple:</p>
              <ul className="list-disc pl-6 space-y-1"><li>we Reveal</li><li>we Regulate</li><li>we Investigate</li></ul>
              <p>Here's your first Regulation practice from The Door of Devotion.</p>
              <p className="text-sm italic text-muted-foreground">The audio practice is coming soon.</p>
            </section>
            <section className="border-t border-border pt-8 space-y-5">
              <SectionTitle>INVESTIGATE</SectionTitle>
              <EvidenceCollector title="The Evidence Locker" showGrounding={false} showIntroduction={false} idPrefix="revelations-evidence" values={answers} onChange={changeAnswer} />
              <div className="flex flex-wrap items-center gap-3"><span className="text-xs text-muted-foreground" role="status">{saveStatus || "Your reading is saved. Return to Revelations to add new evidence."}</span><Button variant="link" onClick={() => void saveAnswers()}>Save my evidence</Button></div>
            </section>
            <section className="border-t border-border pt-8 space-y-4">
              <h2 className="font-serif text-2xl text-primary">What if this doesn't feel like it for me?</h2>
              <p>It might not be, and that is information to collect. However, sometimes shame wants to stay hidden, and its first move is to make the mirror feel like it belongs to someone else.</p>
              <p>If you read this card and quickly said "this isn't for me!", I would like you to sit with this feeling for a moment and then ask yourself "I know this isn't for me, but if it was for me, how could it be showing up for me in my life?"</p>
              <p>Notice what comes to you; in feelings, thoughts, stories, memories, sensations, smells, movies in your mind, anything that drops in. That noticing is your first case file entry in the Evidence Locker either way. Congratulations.</p>
            </section>
            <section className="rounded-lg border border-primary/40 bg-card p-8 sm:p-10 space-y-6 shadow-[0_0_60px_-15px_hsl(var(--primary)/0.25)]">
              <p className="text-xs uppercase tracking-[0.25em] text-primary">Continue the investigation</p>
              <h2 className="font-serif text-3xl sm:text-4xl text-primary">You've seen what one card can name. Imagine what the full investigation opens.</h2>
              <p>You've just experienced The Temple's three phase Evidence Collector System "Revelation, Regulation, Investigation". Inside The Temple, you become the Sherlock Holmes of your inner world, revealing and investigating old evidence so you can build something new and bring your Big Work to the world in a way that fills you with excitement and passion, not dread.</p>
              <ul className="space-y-3">
                <li className="flex gap-3"><span className="text-primary">✦</span><span>The full ceremonial experience for every card in The Sacred Rewrite</span></li>
                <li className="flex gap-3"><span className="text-primary">✦</span><span>The rituals, the deeper inquiry, and a guided audio journey for each card</span></li>
                <li className="flex gap-3"><span className="text-primary">✦</span><span>The full Evidence Locker to file everything that surfaces</span></li>
                <li className="flex gap-3"><span className="text-primary">✦</span><span>All four Doors — Remembrance, Devotion, Becoming and Communion</span></li>
              </ul>
              <div className="pt-2 space-y-3">
                {access.hasFullAccess ? <Button asChild size="lg" className="w-full sm:w-auto text-base px-10 py-6"><Link to="/temple">Enter The Temple</Link></Button> : <Button size="lg" className="w-full sm:w-auto text-base px-10 py-6" onClick={() => void checkout()} disabled={checkingOut}>{checkingOut && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Join us in The Temple</Button>}
                {!access.hasFullAccess && <p className="text-sm text-muted-foreground">Founding member offer — $35 AUD per month. One membership, full Temple access.</p>}
              </div>
            </section>
          </>}
        </div>}
      </>}
      {error && <p role="alert" className="mt-6 text-destructive">{error}</p>}
      </div>
    </main>
  </div>;
}