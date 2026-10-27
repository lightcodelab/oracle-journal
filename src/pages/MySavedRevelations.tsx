import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProfileDropdown from "@/components/ProfileDropdown";
import { cardImageSrc } from "@/lib/cardImage";
import { revelationAnswers, REVELATIONS_PHASE_FIELDS } from "@/lib/revelationsJournal";
import type { Tables } from "@/integrations/supabase/types";

export default function MySavedRevelations() {
  const { user, loading: authLoading } = useAuth();
  const [record, setRecord] = useState<Tables<"revelations_readings"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    document.title = "My Saved Revelations | THE TEMPLE of Sustainment";
  }, []);

  useEffect(() => {
    if (authLoading) return;
    setRecord(null);
    setError(false);
    if (!user) { setLoading(false); return; }
    let active = true;
    setLoading(true);
    void supabase.from("revelations_readings").select("*").eq("user_id", user.id).maybeSingle().then(({ data, error: readError }) => {
      if (!active) return;
      setRecord(data); setError(Boolean(readError)); setLoading(false);
    });
    return () => { active = false; };
  }, [user?.id, authLoading]);

  const answers = revelationAnswers(record?.journal_answers);
  return <div className="min-h-screen bg-background text-foreground">
    <header className="mx-auto flex max-w-5xl items-center justify-between gap-4 border-b border-border px-5 py-5">
      <Link to="/revelations" className="font-serif text-primary">REVELATIONS</Link>
      {user && <ProfileDropdown revelationsOnly />}
    </header>
    <div className="mx-auto max-w-3xl px-5 py-10 space-y-8">
      <h1 className="font-serif text-3xl text-primary">My Saved Revelations</h1>
      {loading || authLoading ? <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Opening saved Revelations" /> : !user ? <Button asChild><Link to="/auth?redirect=/revelations/saved">Sign in</Link></Button> : error ? <p role="alert" className="text-destructive">Your saved Revelation could not be opened. Please refresh to try again.</p> : !record?.generated_reading ? <div className="space-y-4">
        <p className="text-muted-foreground">{record ? "Your card is waiting. Finish revealing your reading to see it here." : "You haven't saved a Revelation yet."}</p>
        <Button asChild><Link to="/revelations">Return to Revelations</Link></Button>
      </div> : <>
        <p className="text-sm text-muted-foreground">{new Date(record.created_at).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}</p>
        <Tabs defaultValue="reading" className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-4">
            <TabsTrigger value="reading" className="px-1 py-3">Reading</TabsTrigger>
            <TabsTrigger value="reveal" className="px-1 py-3">Phase 1</TabsTrigger>
            <TabsTrigger value="regulate" className="px-1 py-3">Phase 2</TabsTrigger>
            <TabsTrigger value="investigate" className="px-1 py-3">Phase 3</TabsTrigger>
          </TabsList>
          <TabsContent value="reading" className="pt-6 space-y-6">
            {cardImageSrc(record.image_file_name) && <img src={cardImageSrc(record.image_file_name)} alt={record.card_title} className="mx-auto w-64 max-w-full aspect-[7/10] rounded-lg object-cover" />}
            <h2 className="text-center font-serif text-2xl text-primary">{record.card_title}</h2>
            {record.guiding_question && <p className="whitespace-pre-line italic text-muted-foreground">{record.guiding_question}</p>}
            <p className="whitespace-pre-line font-serif text-lg leading-relaxed">{record.generated_reading}</p>
          </TabsContent>
          {Object.entries(REVELATIONS_PHASE_FIELDS).map(([phase, fields], index) => <TabsContent key={phase} value={phase} className="pt-6 space-y-6">
            <h2 className="font-serif text-2xl text-primary">PHASE {index + 1}: {phase === "reveal" ? "REVEAL" : phase === "regulate" ? "REGULATE" : "INVESTIGATE"}</h2>
            {fields.map(field => <section key={field.key} className="space-y-3 border-b border-border pb-6">
              <h3 className="font-serif text-lg">{field.label}</h3>
              <p className="whitespace-pre-line break-words leading-relaxed text-muted-foreground">{answers[field.key]?.trim() ? answers[field.key] : "No answer saved yet."}</p>
            </section>)}
          </TabsContent>)}
        </Tabs>
        <Button asChild variant="outline"><Link to="/revelations">Return to my reading and add evidence</Link></Button>
      </>}
    </div>
  </div>;
}