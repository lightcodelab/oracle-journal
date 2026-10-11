import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import NavActions from '@/components/NavActions';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';

const QUESTIONS = [
  { key: 'used_or_explored', label: 'What did you use or explore?' },
  { key: 'experience', label: 'What was your experience?' },
  { key: 'helpful', label: 'What was helpful?' },
  { key: 'unclear_or_missing', label: 'Was anything unclear or missing?' },
  { key: 'more_useful', label: 'Is there anything that would have made it more useful?' },
] as const;

type Key = (typeof QUESTIONS)[number]['key'];
type Answers = Record<Key, string>;
const EMPTY: Answers = { used_or_explored: '', experience: '', helpful: '', unclear_or_missing: '', more_useful: '' };

interface Row extends Partial<Answers> { id: string; user_id: string; created_at: string }

const ShareExperience = () => {
  const { user } = useAuth();
  const [answers, setAnswers] = useState<Answers>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});

  const loadAll = async () => {
    const { data } = await supabase.from('experience_feedback').select('*').order('created_at', { ascending: false });
    const list = (data ?? []) as Row[];
    setRows(list);
    const ids = Array.from(new Set(list.map((r) => r.user_id)));
    if (ids.length) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', ids);
      setNames(Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name || p.email || 'Member'])));
    }
  };

  useEffect(() => {
    if (!user) return;
    supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle()
      .then(({ data }) => { if (data) { setIsAdmin(true); loadAll(); } });
  }, [user]);

  const submit = async () => {
    if (!user) return;
    if (!Object.values(answers).some((v) => v.trim())) {
      toast({ title: 'Please answer at least one question' });
      return;
    }
    setSubmitting(true);
    const payload = Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, v.trim() || null]));
    const { error } = await supabase.from('experience_feedback').insert({ ...payload, user_id: user.id });
    setSubmitting(false);
    if (error) {
      toast({ title: 'Could not send', description: error.message, variant: 'destructive' });
      return;
    }
    setAnswers(EMPTY);
    toast({ title: 'Thank you for sharing your experience' });
    if (isAdmin) loadAll();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Please sign in to share your experience.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <PageBreadcrumb items={[{ label: 'Share Your Experience' }]} />
        <NavActions />
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h2 className="text-2xl font-serif text-foreground">Share Your Experience</h2>
          <p className="text-foreground mt-3">Your experience helps the Temple grow.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Tell us what you used, what you noticed, what helped, or anything that could have made the experience clearer or more useful.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-5">
            {QUESTIONS.map((q) => (
              <div key={q.key} className="space-y-2">
                <Label htmlFor={q.key}>{q.label}</Label>
                <Textarea
                  id={q.key}
                  rows={3}
                  maxLength={4000}
                  value={answers[q.key]}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.key]: e.target.value }))}
                />
              </div>
            ))}
            <Button onClick={submit} disabled={submitting} className="w-full">
              {submitting ? 'Sending…' : 'Share My Experience'}
            </Button>
          </CardContent>
        </Card>

        {isAdmin && (
          <div className="space-y-3">
            <h3 className="text-xl font-serif">Shared experiences ({rows.length})</h3>
            <p className="text-xs text-muted-foreground">Only admins can see this list.</p>
            {rows.map((r) => (
              <Card key={r.id}>
                <CardContent className="pt-5 space-y-3 text-sm">
                  <p className="text-muted-foreground">
                    {names[r.user_id] ?? 'Member'} · {new Date(r.created_at).toLocaleDateString()}
                  </p>
                  {QUESTIONS.filter((q) => r[q.key]).map((q) => (
                    <div key={q.key}>
                      <p className="font-medium text-foreground">{q.label}</p>
                      <p className="text-muted-foreground whitespace-pre-wrap">{r[q.key]}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShareExperience;
