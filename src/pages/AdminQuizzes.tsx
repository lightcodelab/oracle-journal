import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, BarChart3, ExternalLink, Trash2, Loader2 } from 'lucide-react';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import ProfileDropdown from '@/components/ProfileDropdown';
import { useToast } from '@/hooks/use-toast';
import { slugify, type Quiz } from '@/lib/quizTypes';

interface QuizRow extends Quiz {
  views: number;
  completions: number;
}

const AdminQuizzes = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);

  const load = async () => {
    setLoading(true);
    const { data: qs, error } = await supabase
      .from('quizzes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }
    // Fetch aggregate counts
    const rows: QuizRow[] = [];
    for (const q of qs || []) {
      const { count: viewCount } = await supabase
        .from('quiz_events')
        .select('*', { count: 'exact', head: true })
        .eq('quiz_id', q.id)
        .eq('event_type', 'view');
      const { count: compCount } = await supabase
        .from('quiz_events')
        .select('*', { count: 'exact', head: true })
        .eq('quiz_id', q.id)
        .eq('event_type', 'complete');
      rows.push({ ...(q as Quiz), views: viewCount ?? 0, completions: compCount ?? 0 });
    }
    setQuizzes(rows);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createQuiz = async () => {
    const title = prompt('Quiz title?');
    if (!title) return;
    let slug = slugify(title);
    // ensure unique
    const { data: existing } = await supabase.from('quizzes').select('id').eq('slug', slug).maybeSingle();
    if (existing) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await supabase
      .from('quizzes')
      .insert({ title, slug })
      .select()
      .single();
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    navigate(`/admin/quizzes/${data.id}`);
  };

  const deleteQuiz = async (id: string) => {
    if (!confirm('Delete this quiz and all its data?')) return;
    const { error } = await supabase.from('quizzes').delete().eq('id', id);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    load();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <PageBreadcrumb items={[{ label: 'Admin', href: '/admin' }, { label: 'Quizzes' }]} />
        <ProfileDropdown />
      </div>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif">Quiz Builder</h1>
            <p className="text-muted-foreground text-sm">Create personality quizzes with lead capture</p>
          </div>
          <Button onClick={createQuiz}><Plus className="w-4 h-4 mr-2" /> New quiz</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : quizzes.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            No quizzes yet. Create your first quiz to get started.
          </CardContent></Card>
        ) : (
          <div className="grid gap-4">
            {quizzes.map((q) => {
              const conv = q.views ? Math.round((q.completions / q.views) * 100) : 0;
              return (
                <Card key={q.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-lg font-serif">{q.title}</CardTitle>
                          <Badge variant={q.status === 'published' ? 'default' : 'secondary'}>{q.status}</Badge>
                          <Badge variant="outline">{q.access}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">/{q.slug}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex gap-6 text-sm">
                      <div><span className="text-muted-foreground">Views:</span> <strong>{q.views}</strong></div>
                      <div><span className="text-muted-foreground">Completions:</span> <strong>{q.completions}</strong></div>
                      <div><span className="text-muted-foreground">Conversion:</span> <strong>{conv}%</strong></div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => window.open(`/quiz/${q.slug}`, '_blank')}>
                        <ExternalLink className="w-3 h-3 mr-1" /> View
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/admin/quizzes/${q.id}/analytics`)}>
                        <BarChart3 className="w-3 h-3 mr-1" /> Analytics
                      </Button>
                      <Button size="sm" onClick={() => navigate(`/admin/quizzes/${q.id}`)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteQuiz(q.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminQuizzes;