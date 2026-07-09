import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMembership } from '@/hooks/useMembership';
import type { Quiz, QuizResult, QuizQuestion, QuizOption } from '@/lib/quizTypes';

type QQ = QuizQuestion & { options: QuizOption[] };
type Stage = 'cover' | 'question' | 'lead' | 'result';

const QuizPlayer = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { subscriptionStatus, loading: memLoading } = useMembership();
  const isActive = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QQ[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);

  const [stage, setStage] = useState<Stage>('cover');
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);

  useEffect(() => {
    (async () => {
      if (!slug) return;
      const { data: q } = await supabase.from('quizzes').select('*').eq('slug', slug).eq('status', 'published').maybeSingle();
      if (!q) { setNotFound(true); setLoading(false); return; }
      const [{ data: qs }, { data: rs }] = await Promise.all([
        supabase.from('quiz_questions').select('*').eq('quiz_id', q.id).order('position'),
        supabase.from('quiz_results').select('*').eq('quiz_id', q.id).order('position'),
      ]);
      const questionIds = (qs || []).map((x) => x.id);
      let opts: QuizOption[] = [];
      if (questionIds.length) {
        const { data: os } = await supabase.from('quiz_options').select('*').in('question_id', questionIds).order('position');
        opts = os || [];
      }
      setQuiz(q as Quiz);
      setQuestions(((qs || []) as QuizQuestion[]).map((qq) => ({ ...qq, options: opts.filter((o) => o.question_id === qq.id) })));
      setResults((rs || []) as QuizResult[]);
      setLoading(false);
      // Log view
      supabase.from('quiz_events').insert({ quiz_id: q.id, event_type: 'view' });
    })();
  }, [slug]);

  // SEO title
  useEffect(() => {
    if (!quiz) return;
    document.title = quiz.seo_title || quiz.title;
  }, [quiz]);

  // Members-only gate
  useEffect(() => {
    if (!quiz || authLoading || memLoading) return;
    if (quiz.access === 'members') {
      if (!user) navigate('/auth');
      else if (!isActive) navigate('/');
    }
  }, [quiz, user, isActive, authLoading, memLoading, navigate]);

  const total = questions.length;
  const currentQ = questions[idx];

  const brandStyle = useMemo(() => quiz ? {
    '--brand-primary': quiz.primary_color,
    '--brand-accent': quiz.accent_color,
  } as React.CSSProperties : {}, [quiz]);

  if (loading || authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (notFound || !quiz) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Quiz not found.</div>;

  const start = () => {
    supabase.from('quiz_events').insert({ quiz_id: quiz.id, event_type: 'start' });
    setStage('question');
  };

  const answer = (optionId: string) => {
    const next = { ...answers, [currentQ.id]: optionId };
    setAnswers(next);
    if (idx + 1 < total) setIdx(idx + 1);
    else if (quiz.require_email) setStage('lead');
    else submit(next, '', '');
  };

  const submit = async (finalAnswers: Record<string, string>, submittedName: string, submittedEmail: string) => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('quiz-submit', {
        body: { quiz_id: quiz.id, answers: finalAnswers, name: submittedName, email: submittedEmail },
      });
      if (error) throw error;
      const r = (data as { result: QuizResult | null })?.result;
      setResult(r ?? null);
      setStage('result');
      if (r?.redirect_url) {
        setTimeout(() => { window.location.href = r.redirect_url!; }, 800);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const primary = quiz.primary_color;

  return (
    <div className="min-h-screen bg-background flex items-start justify-center py-8 px-4" style={brandStyle}>
      <div className="w-full max-w-2xl">
        {stage === 'cover' && (
          <div className="text-center space-y-6">
            {quiz.cover_image_url && (
              <img src={quiz.cover_image_url} alt={quiz.title} className="w-full max-h-80 object-cover rounded-2xl" />
            )}
            <div className="space-y-3">
              <h1 className="text-4xl font-serif" style={{ color: primary }}>{quiz.title}</h1>
              {quiz.subtitle && <p className="text-lg text-muted-foreground">{quiz.subtitle}</p>}
              {quiz.description && <p className="text-base whitespace-pre-wrap">{quiz.description}</p>}
            </div>
            <Button size="lg" style={{ backgroundColor: primary, color: '#fff' }} onClick={start} disabled={total === 0}>
              {quiz.button_label}
            </Button>
          </div>
        )}

        {stage === 'question' && currentQ && (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Question {idx + 1} of {total}</span>
                <span>{Math.round(((idx) / total) * 100)}%</span>
              </div>
              <Progress value={(idx / total) * 100} />
            </div>
            {currentQ.image_url && <img src={currentQ.image_url} alt="" className="w-full max-h-64 object-cover rounded-xl" />}
            <h2 className="text-2xl font-serif">{currentQ.text}</h2>
            {currentQ.help_text && <p className="text-sm text-muted-foreground">{currentQ.help_text}</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              {currentQ.options.map((o) => (
                <button
                  key={o.id}
                  onClick={() => answer(o.id)}
                  className="p-4 rounded-xl border-2 text-left hover:shadow-md transition-all hover:scale-[1.01]"
                  style={{ borderColor: `${primary}40` }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = primary}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = `${primary}40`}
                >
                  {o.image_url && <img src={o.image_url} alt="" className="w-full h-32 object-cover rounded mb-3" />}
                  <div className="font-medium">{o.text}</div>
                </button>
              ))}
            </div>
            {idx > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setIdx(idx - 1)}>← Back</Button>
            )}
          </div>
        )}

        {stage === 'lead' && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-serif" style={{ color: primary }}>Almost there…</h2>
              <p className="text-muted-foreground">Enter your details to see your result.</p>
            </div>
            <div className="space-y-4">
              {quiz.collect_name && (
                <div>
                  <Label>Your name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                </div>
              )}
              <div>
                <Label>Email *</Label>
                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              {quiz.consent_text && <p className="text-xs text-muted-foreground">{quiz.consent_text}</p>}
              <Button
                className="w-full"
                size="lg"
                style={{ backgroundColor: primary, color: '#fff' }}
                disabled={submitting || !email}
                onClick={() => submit(answers, name, email)}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                See my result
              </Button>
            </div>
          </div>
        )}

        {stage === 'result' && result && (
          <div className="text-center space-y-6">
            {result.image_url && <img src={result.image_url} alt={result.title} className="w-full max-h-80 object-cover rounded-2xl" />}
            <h1 className="text-4xl font-serif" style={{ color: primary }}>{result.title}</h1>
            {result.description && <p className="text-lg whitespace-pre-wrap">{result.description}</p>}
            {result.cta_label && result.cta_url && (
              <a href={result.cta_url} target="_blank" rel="noreferrer">
                <Button size="lg" style={{ backgroundColor: primary, color: '#fff' }}>{result.cta_label}</Button>
              </a>
            )}
          </div>
        )}
        {stage === 'result' && !result && (
          <p className="text-center text-muted-foreground">Something went wrong computing your result.</p>
        )}
      </div>
    </div>
  );
};

export default QuizPlayer;