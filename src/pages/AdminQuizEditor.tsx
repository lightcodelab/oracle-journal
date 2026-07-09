import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, GripVertical, Loader2, Upload, ExternalLink, ChevronUp, ChevronDown } from 'lucide-react';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import ProfileDropdown from '@/components/ProfileDropdown';
import { useToast } from '@/hooks/use-toast';
import type { Quiz, QuizResult, QuizQuestion, QuizOption } from '@/lib/quizTypes';
import { compressImage } from '@/lib/imageCompression';

type QQ = QuizQuestion & { options: QuizOption[] };

const uploadImage = async (file: File): Promise<string | null> => {
  const compressed = await compressImage(file);
  const name = `quiz/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
  const { error } = await supabase.storage.from('content-images').upload(name, compressed, { contentType: 'image/webp' });
  if (error) return null;
  const { data } = supabase.storage.from('content-images').getPublicUrl(name);
  return data.publicUrl;
};

const ImageUploader = ({ url, onChange }: { url: string | null; onChange: (u: string | null) => void }) => {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-2">
      {url && <img src={url} alt="" className="w-16 h-16 object-cover rounded" />}
      <label className="cursor-pointer">
        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          const u = await uploadImage(f);
          setBusy(false);
          if (u) onChange(u);
        }} />
        <span className="inline-flex items-center gap-1 px-3 py-1.5 border rounded text-sm hover:bg-muted">
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} {url ? 'Replace' : 'Upload image'}
        </span>
      </label>
      {url && <Button size="sm" variant="ghost" onClick={() => onChange(null)}><Trash2 className="w-3 h-3" /></Button>}
    </div>
  );
};

const AdminQuizEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [questions, setQuestions] = useState<QQ[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: q }, { data: rs }, { data: qs }] = await Promise.all([
      supabase.from('quizzes').select('*').eq('id', id).maybeSingle(),
      supabase.from('quiz_results').select('*').eq('quiz_id', id).order('position'),
      supabase.from('quiz_questions').select('*').eq('quiz_id', id).order('position'),
    ]);
    if (!q) { toast({ title: 'Quiz not found', variant: 'destructive' }); navigate('/admin/quizzes'); return; }
    const questionIds = (qs || []).map((x) => x.id);
    let opts: QuizOption[] = [];
    if (questionIds.length) {
      const { data: os } = await supabase.from('quiz_options').select('*').in('question_id', questionIds).order('position');
      opts = os || [];
    }
    setQuiz(q as Quiz);
    setResults((rs || []) as QuizResult[]);
    setQuestions(((qs || []) as QuizQuestion[]).map((qq) => ({
      ...qq,
      options: opts.filter((o) => o.question_id === qq.id),
    })));
    setLoading(false);
  }, [id, navigate, toast]);

  useEffect(() => { load(); }, [load]);

  const saveQuiz = async (patch: Partial<Quiz>) => {
    if (!quiz) return;
    setQuiz({ ...quiz, ...patch });
  };

  const persistQuiz = async () => {
    if (!quiz) return;
    setSaving(true);
    const { error } = await supabase.from('quizzes').update({
      title: quiz.title, subtitle: quiz.subtitle, description: quiz.description,
      cover_image_url: quiz.cover_image_url, primary_color: quiz.primary_color,
      accent_color: quiz.accent_color, button_label: quiz.button_label,
      status: quiz.status, access: quiz.access, require_email: quiz.require_email,
      collect_name: quiz.collect_name, consent_text: quiz.consent_text,
      mailerlite_group_id: quiz.mailerlite_group_id, seo_title: quiz.seo_title,
      seo_description: quiz.seo_description, slug: quiz.slug,
    }).eq('id', quiz.id);
    setSaving(false);
    if (error) toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    else toast({ title: 'Saved' });
  };

  // ---- Results ----
  const addResult = async () => {
    if (!quiz) return;
    const { data, error } = await supabase.from('quiz_results').insert({
      quiz_id: quiz.id, position: results.length, title: `Result ${results.length + 1}`,
    }).select().single();
    if (error) return toast({ title: error.message, variant: 'destructive' });
    setResults([...results, data as QuizResult]);
  };
  const updateResult = async (rid: string, patch: Partial<QuizResult>) => {
    setResults(results.map((r) => r.id === rid ? { ...r, ...patch } : r));
    await supabase.from('quiz_results').update(patch).eq('id', rid);
  };
  const deleteResult = async (rid: string) => {
    if (!confirm('Delete this result?')) return;
    await supabase.from('quiz_results').delete().eq('id', rid);
    setResults(results.filter((r) => r.id !== rid));
    // options with this result_id will have result_id set to null (ON DELETE SET NULL)
    load();
  };

  // ---- Questions ----
  const addQuestion = async () => {
    if (!quiz) return;
    const { data, error } = await supabase.from('quiz_questions').insert({
      quiz_id: quiz.id, position: questions.length, text: `Question ${questions.length + 1}`,
    }).select().single();
    if (error) return toast({ title: error.message, variant: 'destructive' });
    setQuestions([...questions, { ...(data as QuizQuestion), options: [] }]);
  };
  const updateQuestion = async (qid: string, patch: Partial<QuizQuestion>) => {
    setQuestions(questions.map((q) => q.id === qid ? { ...q, ...patch } : q));
    await supabase.from('quiz_questions').update(patch).eq('id', qid);
  };
  const deleteQuestion = async (qid: string) => {
    if (!confirm('Delete this question?')) return;
    await supabase.from('quiz_questions').delete().eq('id', qid);
    setQuestions(questions.filter((q) => q.id !== qid));
  };
  const moveQuestion = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= questions.length) return;
    const next = [...questions];
    [next[idx], next[j]] = [next[j], next[idx]];
    setQuestions(next);
    await Promise.all(next.map((q, i) => supabase.from('quiz_questions').update({ position: i }).eq('id', q.id)));
  };

  // ---- Options ----
  const addOption = async (qid: string) => {
    const q = questions.find((x) => x.id === qid);
    if (!q) return;
    const { data, error } = await supabase.from('quiz_options').insert({
      question_id: qid, position: q.options.length, text: `Option ${q.options.length + 1}`,
    }).select().single();
    if (error) return toast({ title: error.message, variant: 'destructive' });
    setQuestions(questions.map((x) => x.id === qid ? { ...x, options: [...x.options, data as QuizOption] } : x));
  };
  const updateOption = async (oid: string, patch: Partial<QuizOption>) => {
    setQuestions(questions.map((q) => ({
      ...q,
      options: q.options.map((o) => o.id === oid ? { ...o, ...patch } : o),
    })));
    await supabase.from('quiz_options').update(patch).eq('id', oid);
  };
  const deleteOption = async (oid: string) => {
    await supabase.from('quiz_options').delete().eq('id', oid);
    setQuestions(questions.map((q) => ({ ...q, options: q.options.filter((o) => o.id !== oid) })));
  };

  if (loading || !quiz) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <PageBreadcrumb items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Quizzes', href: '/admin/quizzes' },
          { label: quiz.title },
        ]} />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.open(`/quiz/${quiz.slug}`, '_blank')}>
            <ExternalLink className="w-3 h-3 mr-1" /> Preview
          </Button>
          <Button size="sm" onClick={persistQuiz} disabled={saving}>
            {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null} Save
          </Button>
          <ProfileDropdown />
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <Tabs defaultValue="cover">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="cover">Cover</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="lead">Lead Capture</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* COVER */}
          <TabsContent value="cover" className="space-y-4 mt-6">
            <div>
              <Label>Title</Label>
              <Input value={quiz.title} onChange={(e) => saveQuiz({ title: e.target.value })} />
            </div>
            <div>
              <Label>Subtitle</Label>
              <Input value={quiz.subtitle || ''} onChange={(e) => saveQuiz({ subtitle: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={quiz.description || ''} onChange={(e) => saveQuiz({ description: e.target.value })} rows={3} />
            </div>
            <div>
              <Label>Cover image</Label>
              <ImageUploader url={quiz.cover_image_url} onChange={(u) => saveQuiz({ cover_image_url: u })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Primary color</Label>
                <Input type="color" value={quiz.primary_color} onChange={(e) => saveQuiz({ primary_color: e.target.value })} />
              </div>
              <div>
                <Label>Accent color</Label>
                <Input type="color" value={quiz.accent_color} onChange={(e) => saveQuiz({ accent_color: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Start button label</Label>
              <Input value={quiz.button_label} onChange={(e) => saveQuiz({ button_label: e.target.value })} />
            </div>
            <p className="text-xs text-muted-foreground">Click Save (top right) to persist changes.</p>
          </TabsContent>

          {/* QUESTIONS */}
          <TabsContent value="questions" className="space-y-4 mt-6">
            {questions.length === 0 && (
              <p className="text-sm text-muted-foreground italic">No questions yet.</p>
            )}
            {questions.map((q, idx) => (
              <Card key={q.id} className="p-4 space-y-3 bg-muted/30">
                <div className="flex items-start gap-2">
                  <div className="flex flex-col items-center pt-1 text-muted-foreground">
                    <GripVertical className="w-4 h-4" />
                    <span className="text-xs mt-1">{idx + 1}</span>
                  </div>
                  <div className="flex-1 space-y-3">
                    <Input value={q.text} onChange={(e) => updateQuestion(q.id, { text: e.target.value })} placeholder="Question text" />
                    <Textarea rows={1} className="text-sm" value={q.help_text || ''} onChange={(e) => updateQuestion(q.id, { help_text: e.target.value })} placeholder="Help text (optional)" />
                    <div>
                      <Label className="text-xs">Question image (optional)</Label>
                      <ImageUploader url={q.image_url} onChange={(u) => updateQuestion(q.id, { image_url: u })} />
                    </div>
                    <div className="space-y-2 pl-2 border-l-2 border-border">
                      <Label className="text-xs">Answer options (each votes for a result)</Label>
                      {q.options.map((o) => (
                        <div key={o.id} className="flex items-center gap-2">
                          <Input className="flex-1" value={o.text} onChange={(e) => updateOption(o.id, { text: e.target.value })} placeholder="Answer text" />
                          <Select value={o.result_id || 'none'} onValueChange={(v) => updateOption(o.id, { result_id: v === 'none' ? null : v })}>
                            <SelectTrigger className="w-48"><SelectValue placeholder="Result" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">— No vote —</SelectItem>
                              {results.map((r) => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <label className="cursor-pointer">
                            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              const u = await uploadImage(f);
                              if (u) updateOption(o.id, { image_url: u });
                            }} />
                            <span className="inline-flex px-2 py-1 border rounded text-xs hover:bg-muted">
                              {o.image_url ? '✓ img' : 'img'}
                            </span>
                          </label>
                          <Button size="sm" variant="ghost" onClick={() => deleteOption(o.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                      <Button size="sm" variant="outline" onClick={() => addOption(q.id)}>
                        <Plus className="w-3 h-3 mr-1" /> Add option
                      </Button>
                    </div>
                    <div className="flex justify-end gap-1 pt-2 border-t border-border">
                      <Button size="sm" variant="ghost" onClick={() => moveQuestion(idx, -1)} disabled={idx === 0}>
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => moveQuestion(idx, 1)} disabled={idx === questions.length - 1}>
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteQuestion(q.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            <Button variant="outline" onClick={addQuestion}><Plus className="w-4 h-4 mr-2" /> Add question</Button>
          </TabsContent>

          {/* RESULTS */}
          <TabsContent value="results" className="space-y-4 mt-6">
            {results.length === 0 && <p className="text-sm text-muted-foreground italic">No results yet. Add 2–6 outcomes.</p>}
            {results.map((r) => (
              <Card key={r.id} className="p-4 space-y-3 bg-muted/30">
                <Input value={r.title} onChange={(e) => updateResult(r.id, { title: e.target.value })} placeholder="Result title (e.g. You are a Seeker)" />
                <Textarea value={r.description || ''} onChange={(e) => updateResult(r.id, { description: e.target.value })} placeholder="Description" rows={4} />
                <ImageUploader url={r.image_url} onChange={(u) => updateResult(r.id, { image_url: u })} />
                <div className="grid grid-cols-2 gap-2">
                  <Input value={r.cta_label || ''} onChange={(e) => updateResult(r.id, { cta_label: e.target.value })} placeholder="CTA button label" />
                  <Input value={r.cta_url || ''} onChange={(e) => updateResult(r.id, { cta_url: e.target.value })} placeholder="CTA URL" />
                </div>
                <Input value={r.redirect_url || ''} onChange={(e) => updateResult(r.id, { redirect_url: e.target.value })} placeholder="Auto-redirect URL (optional)" />
                <div className="flex justify-end">
                  <Button size="sm" variant="ghost" onClick={() => deleteResult(r.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}
            <Button variant="outline" onClick={addResult}><Plus className="w-4 h-4 mr-2" /> Add result</Button>
          </TabsContent>

          {/* LEAD */}
          <TabsContent value="lead" className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <div><Label>Require email before showing result</Label></div>
              <Switch checked={quiz.require_email} onCheckedChange={(v) => saveQuiz({ require_email: v })} />
            </div>
            <div className="flex items-center justify-between">
              <div><Label>Collect name</Label></div>
              <Switch checked={quiz.collect_name} onCheckedChange={(v) => saveQuiz({ collect_name: v })} />
            </div>
            <div>
              <Label>Consent text</Label>
              <Textarea rows={2} value={quiz.consent_text || ''} onChange={(e) => saveQuiz({ consent_text: e.target.value })} placeholder="By submitting you agree to receive emails…" />
            </div>
            <div>
              <Label>MailerLite group ID (optional — overrides default)</Label>
              <Input value={quiz.mailerlite_group_id || ''} onChange={(e) => saveQuiz({ mailerlite_group_id: e.target.value })} placeholder="Leave empty to use default group" />
            </div>
          </TabsContent>

          {/* SETTINGS */}
          <TabsContent value="settings" className="space-y-4 mt-6">
            <div>
              <Label>URL slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/quiz/</span>
                <Input value={quiz.slug} onChange={(e) => saveQuiz({ slug: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select value={quiz.status} onValueChange={(v) => saveQuiz({ status: v as 'draft' | 'published' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Access</Label>
                <Select value={quiz.access} onValueChange={(v) => saveQuiz({ access: v as 'public' | 'members' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public (shareable URL)</SelectItem>
                    <SelectItem value="members">Members-only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>SEO title</Label>
              <Input value={quiz.seo_title || ''} onChange={(e) => saveQuiz({ seo_title: e.target.value })} />
            </div>
            <div>
              <Label>SEO description</Label>
              <Textarea rows={2} value={quiz.seo_description || ''} onChange={(e) => saveQuiz({ seo_description: e.target.value })} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminQuizEditor;