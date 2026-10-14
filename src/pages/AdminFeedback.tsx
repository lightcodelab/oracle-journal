import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import ProfileDropdown from '@/components/ProfileDropdown';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const QUESTIONS = [
  { key: 'used_or_explored', label: 'What did you use or explore?' },
  { key: 'experience', label: 'What was your experience?' },
  { key: 'helpful', label: 'What was helpful?' },
  { key: 'unclear_or_missing', label: 'Was anything unclear or missing?' },
  { key: 'more_useful', label: 'Is there anything that would have made it more useful?' },
] as const;

const BUG_STATUSES = ['open', 'in progress', 'resolved', "won't fix", 'cannot reproduce'];

type Row = Record<string, string | null> & { id: string; user_id: string; created_at: string };

const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

const AdminFeedback = () => {
  const { isAdmin, rolesLoading } = useAuth();
  const navigate = useNavigate();
  const [experiences, setExperiences] = useState<Row[]>([]);
  const [bugs, setBugs] = useState<Row[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});

  const load = async () => {
    const [{ data: ex }, { data: bg }] = await Promise.all([
      supabase.from('experience_feedback').select('*').order('created_at', { ascending: false }),
      supabase.from('bug_reports').select('*').order('created_at', { ascending: false }),
    ]);
    const e = (ex ?? []) as unknown as Row[];
    const b = (bg ?? []) as unknown as Row[];
    setExperiences(e);
    setBugs(b);
    const ids = Array.from(new Set([...e, ...b].map((r) => r.user_id)));
    if (ids.length) {
      const { data: p } = await supabase.from('profiles').select('id, full_name, email').in('id', ids);
      setNames(Object.fromEntries((p ?? []).map((x) => [x.id, x.full_name || x.email || 'Member'])));
    }
  };

  useEffect(() => {
    if (rolesLoading) return;
    if (!isAdmin) { navigate('/admin'); return; }
    load();
  }, [isAdmin, rolesLoading]);

  const setStatus = async (id: string, status: string) => {
    await supabase.from('bug_reports').update({ status, updated_at: new Date().toISOString() } as never).eq('id', id);
    load();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <PageBreadcrumb items={[{ label: 'Admin', href: '/admin' }, { label: 'Member Feedback' }]} />
        <ProfileDropdown />
      </header>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-serif">Member Feedback</h1>
          <p className="text-sm text-muted-foreground mt-1">Shared experiences and bug reports from members, newest first.</p>
        </div>
        <Tabs defaultValue="experiences">
          <TabsList>
            <TabsTrigger value="experiences">Shared Experiences ({experiences.length})</TabsTrigger>
            <TabsTrigger value="bugs">Bug Reports ({bugs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="experiences" className="space-y-3 mt-4">
            {experiences.length === 0 && <p className="text-muted-foreground text-sm">No experiences shared yet.</p>}
            {experiences.map((r) => (
              <Card key={r.id}>
                <CardContent className="pt-5 space-y-3 text-sm">
                  <p className="text-muted-foreground">{names[r.user_id] ?? 'Member'} · {fmt(r.created_at)}</p>
                  {QUESTIONS.filter((q) => r[q.key]).map((q) => (
                    <div key={q.key}>
                      <p className="font-medium text-foreground">{q.label}</p>
                      <p className="text-muted-foreground whitespace-pre-wrap">{r[q.key]}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="bugs" className="space-y-3 mt-4">
            {bugs.length === 0 && <p className="text-muted-foreground text-sm">No bug reports yet.</p>}
            {bugs.map((r) => (
              <Card key={r.id}>
                <CardContent className="pt-5 space-y-2 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{r.title}</p>
                      <p className="text-muted-foreground text-xs">{names[r.user_id] ?? 'Member'} · {fmt(r.created_at)}{r.severity ? ` · ${r.severity}` : ''}</p>
                    </div>
                    <Select value={r.status ?? 'open'} onValueChange={(v) => setStatus(r.id, v)}>
                      <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BUG_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {r.description && <p className="text-muted-foreground whitespace-pre-wrap">{r.description}</p>}
                  {r.steps_to_reproduce && (
                    <div><p className="font-medium text-foreground">Steps</p><p className="text-muted-foreground whitespace-pre-wrap">{r.steps_to_reproduce}</p></div>
                  )}
                  {r.page_url && <Badge variant="outline" className="font-normal">{r.page_url}</Badge>}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminFeedback;
