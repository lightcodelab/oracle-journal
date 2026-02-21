import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import NavActions from '@/components/NavActions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChevronUp, Plus, MessageSquarePlus, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Suggestion {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  vote_count: number;
  user_voted: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-secondary text-secondary-foreground',
  'under review': 'bg-primary/20 text-primary',
  planned: 'bg-accent/20 text-accent',
  completed: 'bg-green-900/40 text-green-300',
  declined: 'bg-destructive/20 text-destructive-foreground',
};

const SuggestionCard = ({ s, isAdmin, onVote, onStatusChange, onDelete }: {
  s: Suggestion;
  isAdmin: boolean;
  onVote: (id: string, voted: boolean) => void;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}) => (
  <Card className="border-border">
    <CardContent className="flex gap-4 py-4 px-4">
      <button
        onClick={() => onVote(s.id, s.user_voted)}
        className={`flex flex-col items-center justify-center min-w-[48px] rounded-md py-2 transition-colors ${
          s.user_voted
            ? 'bg-primary/20 text-primary'
            : 'bg-secondary text-muted-foreground hover:text-foreground'
        }`}
      >
        <ChevronUp className="w-5 h-5" />
        <span className="text-sm font-medium">{s.vote_count}</span>
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <h3 className="font-medium text-foreground leading-snug">{s.title}</h3>
          <Badge className={`shrink-0 text-[10px] ${STATUS_COLORS[s.status] || STATUS_COLORS.open}`}>
            {s.status}
          </Badge>
        </div>
        {s.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{s.description}</p>
        )}
        <p className="text-xs text-muted-foreground/60 mt-2">
          {new Date(s.created_at).toLocaleDateString()}
        </p>
      </div>
      {isAdmin && (
        <div className="flex flex-col gap-1 shrink-0">
          <select
            value={s.status}
            onChange={(e) => onStatusChange(s.id, e.target.value)}
            className="text-xs bg-secondary border border-border rounded px-1.5 py-1 text-foreground"
          >
            <option value="open">Open</option>
            <option value="under review">Under Review</option>
            <option value="planned">Planned</option>
            <option value="completed">Completed</option>
            <option value="declined">Declined</option>
          </select>
          <button
            onClick={() => onDelete(s.id)}
            className="text-destructive-foreground hover:text-destructive text-xs flex items-center gap-1 mt-1"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </CardContent>
  </Card>
);

const FeatureSuggestions = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchSuggestions = async () => {
    if (!user) return;

    const { data: suggestionsData, error } = await supabase
      .from('feature_suggestions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching suggestions:', error);
      return;
    }

    const { data: votesData } = await supabase
      .from('suggestion_votes')
      .select('suggestion_id');

    const { data: userVotes } = await supabase
      .from('suggestion_votes')
      .select('suggestion_id')
      .eq('user_id', user.id);

    const voteCounts: Record<string, number> = {};
    votesData?.forEach((v: any) => {
      voteCounts[v.suggestion_id] = (voteCounts[v.suggestion_id] || 0) + 1;
    });

    const userVoteSet = new Set(userVotes?.map((v: any) => v.suggestion_id) || []);

    const enriched: Suggestion[] = (suggestionsData || []).map((s: any) => ({
      ...s,
      vote_count: voteCounts[s.id] || 0,
      user_voted: userVoteSet.has(s.id),
    }));

    enriched.sort((a, b) => b.vote_count - a.vote_count);
    setSuggestions(enriched);
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchSuggestions();
  }, [user]);

  const handleSubmit = async () => {
    if (!user || !title.trim()) return;
    setSubmitting(true);

    const { error } = await supabase.from('feature_suggestions').insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
    });

    if (error) {
      toast({ title: 'Error', description: 'Could not submit suggestion.', variant: 'destructive' });
    } else {
      toast({ title: 'Submitted!', description: 'Thank you for your suggestion.' });
      setTitle('');
      setDescription('');
      setDialogOpen(false);
      fetchSuggestions();
    }
    setSubmitting(false);
  };

  const handleVote = async (suggestionId: string, alreadyVoted: boolean) => {
    if (!user) return;

    if (alreadyVoted) {
      await supabase
        .from('suggestion_votes')
        .delete()
        .eq('suggestion_id', suggestionId)
        .eq('user_id', user.id);
    } else {
      await supabase.from('suggestion_votes').insert({
        suggestion_id: suggestionId,
        user_id: user.id,
      });
    }
    fetchSuggestions();
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    await supabase.from('feature_suggestions').update({ status: newStatus }).eq('id', id);
    fetchSuggestions();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('feature_suggestions').delete().eq('id', id);
    fetchSuggestions();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view suggestions.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <h1
          className="font-serif text-lg tracking-wide cursor-pointer text-primary"
          onClick={() => navigate('/temple')}
        >
          Temple of Sustainment
        </h1>
        <NavActions />
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-serif text-foreground">Feature Suggestions</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Suggest & vote on ideas to shape the Temple
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" />
                Suggest
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-serif">New Suggestion</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <Input
                  placeholder="Feature title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                />
                <Textarea
                  placeholder="Describe your idea (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={1000}
                  rows={4}
                />
                <Button
                  onClick={handleSubmit}
                  disabled={!title.trim() || submitting}
                  className="w-full"
                >
                  {submitting ? 'Submitting…' : 'Submit Suggestion'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-center py-12">Loading…</p>
        ) : suggestions.length === 0 ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <MessageSquarePlus className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No suggestions yet. Be the first!</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Main suggestions (non-planned) */}
            <div className="space-y-3">
              {suggestions.filter(s => s.status !== 'planned').map((s) => (
                <SuggestionCard key={s.id} s={s} isAdmin={isAdmin} onVote={handleVote} onStatusChange={handleStatusChange} onDelete={handleDelete} />
              ))}
            </div>

            {/* Backlog section for planned items */}
            {suggestions.some(s => s.status === 'planned') && (
              <div className="mt-12">
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-lg font-serif text-foreground">Backlog</h3>
                  <Badge className="bg-accent/20 text-accent text-[10px]">Planned</Badge>
                </div>
                <div className="space-y-3">
                  {suggestions.filter(s => s.status === 'planned').map((s) => (
                    <SuggestionCard key={s.id} s={s} isAdmin={isAdmin} onVote={handleVote} onStatusChange={handleStatusChange} onDelete={handleDelete} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default FeatureSuggestions;
