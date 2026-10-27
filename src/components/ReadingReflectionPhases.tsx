import { Textarea } from "@/components/ui/textarea";
import { EvidenceCollector } from "@/components/EvidenceCollector";
import { REGULATION_QUESTION } from "@/lib/revelationsJournal";
import { PROTECTION_PREDICTION_QUESTION, REVELATIONS_EVIDENCE_QUESTIONS } from "@/lib/evidenceFramework";

interface Props {
  idPrefix: string;
  values: Record<string, string | undefined>;
  onChange: (key: string, value: string) => void;
}

export function ReadingReflectionPhases({ idPrefix, values, onChange }: Props) {
  return <div className="space-y-10 text-left leading-relaxed">
    <section className="border-t border-border pt-8 space-y-4">
      <h2 className="font-serif text-2xl text-primary">PHASE 1: REVEAL</h2>
      <p>Sit quietly with these cards for a moment before you do anything else. Not to decide if it's true or to analyse where it came from...just to notice: Where in your body do you feel something when you read this? Stay there for 30 seconds, that's enough.</p>
      <label htmlFor={`${idPrefix}-pattern_location`} className="block font-serif">Name how this has shown up for you.</label>
      <Textarea id={`${idPrefix}-pattern_location`} rows={4} value={values.pattern_location || ""} onChange={e => onChange("pattern_location", e.target.value)} />
    </section>
    <section className="border-t border-border pt-8 space-y-4">
      <h2 className="font-serif text-2xl text-primary">PHASE 2: REGULATE</h2>
      <p>You've named something now and your nervous system may be responding. This is normal and you are okay.</p>
      <p>Before you begin investigating, let your body settle first.</p>
      <p>When your nervous system is activated, it does exactly what it was built to do: it reaches for the old evidence — everything it has already learned about what happens to you, what is safe, what is coming — and uses it to predict what happens next. That is protection, not a flaw. But it means that if we try to change anything while we're still activated, we are building on top of the very pattern we're trying to change. The new way won't hold, no matter how much you want it to, because your body is still standing on the old ground.</p>
      <p>A settled body is what makes something new possible. When your nervous system feels calm and safe, it stops reaching for the old story and can actually take in new evidence — a different response, a different feeling, a different ending. That is why we settle before we investigate. It isn't a pause in the work; it is what allows the work to stick.</p>
      <p>Here's your first Regulation practice from The Door of Devotion.</p>
      <p className="text-sm italic text-muted-foreground">The audio practice is coming soon.</p>
      <label htmlFor={`${idPrefix}-regulation_experience`} className="block font-serif">{REGULATION_QUESTION.label}</label>
      <Textarea id={`${idPrefix}-regulation_experience`} rows={5} value={values.regulation_experience || ""} onChange={e => onChange("regulation_experience", e.target.value)} />
    </section>
    <section className="border-t border-border pt-8 space-y-5">
      <h2 className="font-serif text-2xl text-primary">PHASE 3: INVESTIGATE</h2>
      <EvidenceCollector title="The Evidence Locker" description="A private place to gather what you notice — old evidence, new evidence, and one choice you can make today — so change can begin from something real." showGrounding={false} showIntroduction={false} idPrefix={`${idPrefix}-evidence`} values={values} onChange={onChange} extraQuestions={[PROTECTION_PREDICTION_QUESTION]} questions={REVELATIONS_EVIDENCE_QUESTIONS} />
    </section>
    <section className="border-t border-border pt-8 space-y-4">
      <h2 className="font-serif text-2xl text-primary">What if this doesn't feel like it was for me?</h2>
      <p>It might not be, and that is information to collect. You don't have to make the reading fit or agree with it.</p>
      <p>If you want to, sit with what came up — feelings, thoughts, memories or sensations. You can note what feels true, what doesn't, and what you're still unsure about in your Evidence Locker. All of that noticing counts.</p>
    </section>
  </div>;
}