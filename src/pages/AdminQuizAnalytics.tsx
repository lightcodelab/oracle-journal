import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Download } from 'lucide-react';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import ProfileDropdown from '@/components/ProfileDropdown';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { Quiz, QuizResult } from '@/lib/quizTypes';

interface Response {
  id: string;
  result_id: string | null;
  name: string | null;
  email: string | null;
  created_at: string;
}

const AdminQuizAnalytics = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [counts, setCounts] = useState({ view: 0, start: 0, complete: 0, optin: 0 });
  const [dailySeries, setDailySeries] = useState<Array<{ day: string; completions: number }>>([]);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const [{ data: q }, { data: rs }, { data: resp }, { data: events }] = await Promise.all([
        supabase.from('quizzes').select('*').eq('id', id).maybeSingle(),
        supabase.from('quiz_results').select('*').eq('quiz_id', id).order('position'),
        supabase.from('quiz_responses').select('id, result_id, name, email, created_at').eq('quiz_id', id).order('created_at', { ascending: false }).limit(200),
        supabase.from('quiz_events').select('event_type, created_at').eq('quiz_id', id).gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
      ]);
      if (!q) { navigate('/admin/quizzes'); return; }
      setQuiz(q as Quiz);
      setResults((rs || []) as QuizResult[]);
      setResponses((resp || []) as Response[]);

      const c = { view: 0, start: 0, complete: 0, optin: 0 };
      const dayMap: Record<string, number> = {};
      for (const e of events || []) {
        c[e.event_type as keyof typeof c] = (c[e.event_type as keyof typeof c] || 0) + 1;
        if (e.event_type === 'complete') {
          const d = new Date(e.created_at).toISOString().slice(0, 10);
          dayMap[d] = (dayMap[d] || 0) + 1;
        }
      }
      setCounts(c);
      const days: Array<{ day: string; completions: number }> = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        days.push({ day: d.slice(5), completions: dayMap[d] || 0 });
      }
      setDailySeries(days);
      setLoading(false);
    })();
  }, [id, navigate]);

  const resultCounts = results.map((r) => ({
    ...r,
    count: responses.filter((x) => x.result_id === r.id).length,
  }));
  const total = responses.length || 1;

  const exportCSV = () => {
    const rows = [['name', 'email', 'result', 'date']];
    for (const r of responses) {
      const res = results.find((x) => x.id === r.result_id)?.title || '';
      rows.push([r.name || '', r.email || '', res, r.created_at]);
    }
    const csv = rows.map((r) => r.map((c) => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${quiz?.slug}-leads.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !quiz) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const conv = counts.view ? Math.round((counts.complete / counts.view) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <PageBreadcrumb items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Quizzes', href: '/admin/quizzes' },
          { label: quiz.title, href: `/admin/quizzes/${quiz.id}` },
          { label: 'Analytics' },
        ]} />
        <ProfileDropdown />
      </div>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            ['Views', counts.view],
            ['Starts', counts.start],
            ['Completions', counts.complete],
            ['Opt-ins', counts.optin],
            ['Conversion', `${conv}%`],
          ].map(([l, v]) => (
            <Card key={l as string}>
              <CardContent className="pt-4">
                <div className="text-xs text-muted-foreground">{l}</div>
                <div className="text-2xl font-serif">{v}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Completions (last 30 days)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailySeries}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="day" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="completions" stroke={quiz.primary_color} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Result breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {resultCounts.length === 0 && <p className="text-sm text-muted-foreground">No results defined.</p>}
            {resultCounts.map((r) => {
              const pct = Math.round((r.count / total) * 100);
              return (
                <div key={r.id}>
                  <div className="flex justify-between text-sm">
                    <span>{r.title}</span>
                    <span className="text-muted-foreground">{r.count} · {pct}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded">
                    <div className="h-full rounded" style={{ width: `${pct}%`, backgroundColor: quiz.primary_color }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent leads</CardTitle>
            <Button size="sm" variant="outline" onClick={exportCSV}><Download className="w-3 h-3 mr-1" /> Export CSV</Button>
          </CardHeader>
          <CardContent>
            {responses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No submissions yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr><th className="pb-2">Name</th><th className="pb-2">Email</th><th className="pb-2">Result</th><th className="pb-2">Date</th></tr>
                  </thead>
                  <tbody>
                    {responses.map((r) => (
                      <tr key={r.id} className="border-t border-border">
                        <td className="py-2">{r.name || '—'}</td>
                        <td className="py-2">{r.email || '—'}</td>
                        <td className="py-2">{results.find((x) => x.id === r.result_id)?.title || '—'}</td>
                        <td className="py-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminQuizAnalytics;