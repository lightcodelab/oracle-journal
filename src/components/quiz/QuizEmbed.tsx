import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Quiz, QuizResult, QuizQuestion, QuizOption } from "@/lib/quizTypes";
import { CLAIRS, clairFromText } from "@/lib/intuitionClairs";

type QQ = QuizQuestion & { options: QuizOption[] };
type Stage = "cover" | "question" | "result";

/** Inline, in-lesson version of a Quiz Builder quiz. Results are saved to the signed-in member. */
export default function QuizEmbed({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QQ[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [stage, setStage] = useState<Stage>("cover");
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [previous, setPrevious] = useState<QuizResult | null>(null);

  useEffect(() => {
    (async () => {
      const { data: q } = await supabase.from("quizzes").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
      if (!q) { setLoading(false); return; }
      const [{ data: qs }, { data: rs }] = await Promise.all([
        supabase.from("quiz_questions").select("*").eq("quiz_id", q.id).order("position"),
        supabase.from("quiz_results").select("*").eq("quiz_id", q.id).order("position"),
      ]);
      const ids = (qs || []).map((x) => x.id);
      let opts: QuizOption[] = [];
      if (ids.length) {
        const { data: os } = await supabase.from("quiz_options").select("*").in("question_id", ids).order("position");
        opts = (os || []) as QuizOption[];
      }
      const allResults = (rs || []) as QuizResult[];
      setQuiz(q as Quiz);
      setQuestions(((qs || []) as QuizQuestion[]).map((qq) => ({ ...qq, options: opts.filter((o) => o.question_id === qq.id) })));
      setResults(allResults);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prev } = await supabase
          .from("quiz_responses").select("result_id").eq("quiz_id", q.id).eq("user_id", user.id)
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (prev?.result_id) setPrevious(allResults.find((r) => r.id === prev.result_id) ?? null);
      }
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!quiz) return null;

  const total = questions.length;
  const current = questions[idx];

  const submit = async (final: Record<string, string>) => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("quiz-submit", { body: { quiz_id: quiz.id, answers: final } });
      if (error) throw error;
      const r = (data as { result: QuizResult | null })?.result ?? null;
      setResult(r);
      if (r) setPrevious(r);
      setStage("result");
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const answer = (optionId: string) => {
    const next = { ...answers, [current.id]: optionId };
    setAnswers(next);
    if (idx + 1 < total) setIdx(idx + 1);
    else void submit(next);
  };

  const restart = () => { setAnswers({}); setIdx(0); setResult(null); setStage("question"); };
  const resultClair = CLAIRS.find((c) => c.key === clairFromText(result?.title));

  return (
    <section aria-label={quiz.title} className="my-8 rounded-xl border border-primary/30 bg-card p-6 md:p-8">
      {stage === "cover" && (
        <div className="space-y-5 text-center">
          {quiz.cover_image_url && <img src={quiz.cover_image_url} alt="" className="mx-auto max-h-64 w-full rounded-lg object-cover" />}
          <h2 className="font-serif text-2xl text-primary md:text-3xl">{quiz.title}</h2>
          {quiz.subtitle && <p className="text-muted-foreground">{quiz.subtitle}</p>}
          {previous && (
            <p className="text-sm text-foreground/80">Your last result: <span className="text-primary">{previous.title}</span></p>
          )}
          <Button size="lg" onClick={() => setStage("question")} disabled={total === 0}>
            {previous ? "Take the quiz again" : quiz.button_label || "Begin the quiz"}
          </Button>
        </div>
      )}

      {stage === "question" && current && (
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Question {idx + 1} of {total}</span>
              <span>{Math.round((idx / total) * 100)}%</span>
            </div>
            <Progress value={(idx / total) * 100} />
          </div>
          <h3 className="font-serif text-xl md:text-2xl">{current.text}</h3>
          {current.help_text && <p className="text-sm text-muted-foreground">{current.help_text}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {current.options.map((o) => (
              <button
                key={o.id}
                type="button"
                disabled={submitting}
                onClick={() => answer(o.id)}
                className="rounded-lg border border-border bg-background p-4 text-left transition hover:border-primary hover:bg-primary/5 disabled:opacity-60"
              >
                {o.image_url && <img src={o.image_url} alt="" className="mb-3 h-28 w-full rounded object-cover" />}
                <span className="font-medium">{o.text}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between">
            {idx > 0 ? <Button variant="ghost" size="sm" onClick={() => setIdx(idx - 1)}>← Back</Button> : <span />}
            {submitting && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
          </div>
        </div>
      )}

      {stage === "result" && (
        <div className="space-y-5 text-center">
          {result ? (
            <>
              {result.image_url && <img src={result.image_url} alt="" className="mx-auto max-h-64 w-full rounded-lg object-cover" />}
              <h3 className="font-serif text-2xl text-primary md:text-3xl">{result.title}</h3>
              {result.description && <p className="whitespace-pre-wrap text-left text-foreground/90">{result.description}</p>}
              <p className="text-sm text-muted-foreground">Your result is saved — you'll see it in your Signs &amp; Signals dashboard on My Tracking.</p>
              <div className="flex flex-wrap justify-center gap-3">
                {resultClair && (
                  <Button asChild><Link to={`/tools/${resultClair.trackerSlug}/new`}>Log a {resultClair.sense} sign</Link></Button>
                )}
                <Button variant="outline" onClick={restart}><RotateCcw className="mr-2 h-4 w-4" />Retake</Button>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">Something went wrong working out your result. Please try again.</p>
          )}
        </div>
      )}
    </section>
  );
}
