import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import NavActions from '@/components/NavActions';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Bug, Plus, AlertTriangle, Info, AlertCircle, Flame } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface BugReport {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  steps_to_reproduce: string | null;
  severity: string;
  status: string;
  page_url: string | null;
  browser_info: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

const SEVERITY_CONFIG: Record<string, { icon: React.ReactNode; class: string }> = {
  low: { icon: <Info className="w-3 h-3" />, class: 'bg-secondary text-secondary-foreground' },
  medium: { icon: <AlertTriangle className="w-3 h-3" />, class: 'bg-primary/20 text-primary' },
  high: { icon: <AlertCircle className="w-3 h-3" />, class: 'bg-destructive/20 text-destructive' },
  critical: { icon: <Flame className="w-3 h-3" />, class: 'bg-destructive text-destructive-foreground' },
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-secondary text-secondary-foreground',
  'in progress': 'bg-primary/20 text-primary',
  resolved: 'bg-green-900/40 text-green-300',
  'won\'t fix': 'bg-muted text-muted-foreground',
  'cannot reproduce': 'bg-muted text-muted-foreground',
};

const BugReports = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [pageUrl, setPageUrl] = useState('');

  const fetchReports = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('bug_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bug reports:', error);
      return;
    }
    setReports((data as BugReport[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchReports();
  }, [user]);

  const handleSubmit = async () => {
    if (!user || !title.trim()) return;
    setSubmitting(true);

    const browserInfo = `${navigator.userAgent}`;

    const { error } = await supabase.from('bug_reports').insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      steps_to_reproduce: stepsToReproduce.trim() || null,
      severity,
      page_url: pageUrl.trim() || null,
      browser_info: browserInfo,
    } as any);

    if (error) {
      toast({ title: 'Error', description: 'Could not submit bug report.', variant: 'destructive' });
    } else {
      toast({ title: 'Bug Reported', description: 'Thank you for helping us improve!' });
      setTitle('');
      setDescription('');
      setStepsToReproduce('');
      setSeverity('medium');
      setPageUrl('');
      setDialogOpen(false);
      fetchReports();
    }
    setSubmitting(false);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    await supabase.from('bug_reports').update({ status: newStatus, updated_at: new Date().toISOString() } as any).eq('id', id);
    fetchReports();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Please sign in to report bugs.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <PageBreadcrumb items={[{ label: 'Bug Reports' }]} />
        <NavActions />
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-serif text-foreground">Bug Reports</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Help us fix issues — report anything that seems broken
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" />
                Report Bug
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-serif">Report a Bug</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Title *</label>
                  <Input
                    placeholder="Brief summary of the issue"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={200}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
                  <Textarea
                    placeholder="What happened? What did you expect to happen?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={2000}
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Steps to Reproduce</label>
                  <Textarea
                    placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
                    value={stepsToReproduce}
                    onChange={(e) => setStepsToReproduce(e.target.value)}
                    maxLength={2000}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Severity</label>
                    <Select value={severity} onValueChange={setSeverity}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low — cosmetic issue</SelectItem>
                        <SelectItem value="medium">Medium — feature impaired</SelectItem>
                        <SelectItem value="high">High — feature broken</SelectItem>
                        <SelectItem value="critical">Critical — app unusable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Page URL</label>
                    <Input
                      placeholder="/devotion/..."
                      value={pageUrl}
                      onChange={(e) => setPageUrl(e.target.value)}
                      maxLength={500}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={!title.trim() || submitting}
                  className="w-full"
                >
                  {submitting ? 'Submitting…' : 'Submit Bug Report'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-center py-12">Loading…</p>
        ) : reports.length === 0 ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <Bug className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No bug reports yet. Hopefully it stays that way!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => {
              const sevConfig = SEVERITY_CONFIG[report.severity] || SEVERITY_CONFIG.medium;
              return (
                <Card key={report.id} className="border-border">
                  <CardContent className="py-4 px-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-foreground leading-snug">{report.title}</h3>
                          <Badge className={`shrink-0 text-[10px] gap-1 ${sevConfig.class}`}>
                            {sevConfig.icon}
                            {report.severity}
                          </Badge>
                          <Badge className={`shrink-0 text-[10px] ${STATUS_COLORS[report.status] || STATUS_COLORS.open}`}>
                            {report.status}
                          </Badge>
                        </div>
                        {report.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{report.description}</p>
                        )}
                        {report.steps_to_reproduce && (
                          <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2">
                            <span className="font-medium">Steps:</span> {report.steps_to_reproduce}
                          </p>
                        )}
                        {report.page_url && (
                          <p className="text-xs text-muted-foreground/60 mt-1">Page: {report.page_url}</p>
                        )}
                        <p className="text-xs text-muted-foreground/60 mt-2">
                          {new Date(report.created_at).toLocaleDateString()}
                        </p>
                        {isAdmin && report.admin_notes && (
                          <p className="text-xs text-primary/80 mt-1 italic">Admin: {report.admin_notes}</p>
                        )}
                      </div>
                      {isAdmin && (
                        <select
                          value={report.status}
                          onChange={(e) => handleStatusChange(report.id, e.target.value)}
                          className="text-xs bg-secondary border border-border rounded px-1.5 py-1 text-foreground shrink-0"
                        >
                          <option value="open">Open</option>
                          <option value="in progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="won't fix">Won't Fix</option>
                          <option value="cannot reproduce">Can't Reproduce</option>
                        </select>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default BugReports;
