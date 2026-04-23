import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, ArrowLeft, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ProfileDropdown from '@/components/ProfileDropdown';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface DeckRow {
  id: string;
  name: string;
}

interface CardRow {
  id: string;
  deck_id: string;
  deck_name: string | null;
  card_number: number;
  card_title: string;
  image_file_name: string | null;
  card_details: string | null;
  opening_invocation_heading: string | null;
  opening_invocation_content: string | null;
  spiral_of_inquiry_heading: string | null;
  spiral_of_inquiry_content: string | null;
  acknowledgement_heading: string | null;
  acknowledgement_content: string | null;
  spiral_of_seeing_heading: string | null;
  spiral_of_seeing_content: string | null;
  living_inquiry_heading: string | null;
  living_inquiry_content: string | null;
  guided_audio_heading: string | null;
  guided_audio_content: string | null;
  embodiment_ritual_heading: string | null;
  embodiment_ritual_content: string | null;
  benediction_heading: string | null;
  benediction_content: string | null;
  content_sections: Record<string, any> | null;
}

// Mirror the labels shown on the Door of Remembrance public selectors
// (CardNumberSelector + CardDropdownSelector) so admins see the same wording.
const getPublicCardLabel = (card: CardRow, deckName: string | undefined): string => {
  const sections = (card.content_sections || {}) as Record<string, any>;

  if (deckName === 'Magic not Logic') {
    if (sections.clearing_statement) {
      const text = String(sections.clearing_statement);
      const firstLine = text.split('\n')[0];
      return firstLine.length > 60 ? firstLine.substring(0, 60) + '…' : firstLine;
    }
    return `Card ${card.card_number}`;
  }

  if (deckName === 'AreekeerA') {
    return card.card_title || '';
  }

  if (deckName === 'The Art of Self-Healing') {
    if (sections.activity_heading) {
      return String(sections.activity_heading)
        .replace(/^Exercise:\s*/i, '')
        .replace(/^Template:\s*/i, '')
        .trim();
    }
    return '';
  }

  // The Sacred Rewrite + everything else
  return card.card_title || '';
};

type FieldDef = {
  key: string;
  label: string;
  type: 'input' | 'textarea';
  // 'column' = top-level cards table column; 'json' = inside content_sections
  storage: 'column' | 'json';
  rows?: number;
  helper?: string;
};

// All possible fields per deck (every field ever used across decks).
const DECK_FIELDS: Record<string, FieldDef[]> = {
  'The Sacred Rewrite': [
    { key: 'card_details', label: 'The Card (card_details)', type: 'textarea', storage: 'column', rows: 5 },
    { key: 'opening_invocation_heading', label: 'Opening Invocation — Heading', type: 'input', storage: 'column' },
    { key: 'opening_invocation_content', label: 'Opening Invocation — Content', type: 'textarea', storage: 'column', rows: 6 },
    { key: 'spiral_of_inquiry_heading', label: 'Spiral of Inquiry — Heading', type: 'input', storage: 'column' },
    { key: 'spiral_of_inquiry_content', label: 'Spiral of Inquiry — Content', type: 'textarea', storage: 'column', rows: 6 },
    { key: 'acknowledgement_heading', label: 'Acknowledgement — Heading', type: 'input', storage: 'column' },
    { key: 'acknowledgement_content', label: 'Acknowledgement — Content', type: 'textarea', storage: 'column', rows: 6 },
    { key: 'spiral_of_seeing_heading', label: 'Spiral of Seeing — Heading', type: 'input', storage: 'column' },
    { key: 'spiral_of_seeing_content', label: 'Spiral of Seeing — Content', type: 'textarea', storage: 'column', rows: 6 },
    { key: 'living_inquiry_heading', label: 'Living Inquiry — Heading', type: 'input', storage: 'column' },
    { key: 'living_inquiry_content', label: 'Living Inquiry — Content', type: 'textarea', storage: 'column', rows: 6 },
    { key: 'guided_audio_heading', label: 'Guided Audio — Heading', type: 'input', storage: 'column' },
    { key: 'guided_audio_content', label: 'Guided Audio — Content', type: 'textarea', storage: 'column', rows: 6 },
    { key: 'embodiment_ritual_heading', label: 'Embodiment Ritual — Heading (Premium)', type: 'input', storage: 'column' },
    { key: 'embodiment_ritual_content', label: 'Embodiment Ritual — Content (Premium)', type: 'textarea', storage: 'column', rows: 6 },
    { key: 'benediction_heading', label: 'Closing Benediction — Heading', type: 'input', storage: 'column' },
    { key: 'benediction_content', label: 'Closing Benediction — Content', type: 'textarea', storage: 'column', rows: 6 },
  ],
  'AreekeerA': [
    { key: 'card_subtitle', label: 'Card Subtitle', type: 'input', storage: 'json' },
    { key: 'card_content', label: 'Card Guidance / Card Content', type: 'textarea', storage: 'json', rows: 8 },
    { key: 'exercise_heading', label: 'Exercise — Heading', type: 'input', storage: 'json' },
    { key: 'exercise', label: 'Exercise — Content', type: 'textarea', storage: 'json', rows: 8 },
  ],
  'The Art of Self-Healing': [
    { key: 'teaching', label: 'Teaching', type: 'textarea', storage: 'json', rows: 8 },
    { key: 'activity_heading', label: 'Activity — Heading', type: 'input', storage: 'json' },
    { key: 'activity', label: 'Activity — Content', type: 'textarea', storage: 'json', rows: 8 },
  ],
  'Magic not Logic': [
    { key: 'card_details', label: 'Card Details (CLEARING + ACTIVATION)', type: 'textarea', storage: 'column', rows: 8, helper: 'Two lines exactly as shown on the card. Format: "CLEARING: …" on line 1, "ACTIVATION: …" on line 2. Saving mirrors this to content_sections.card_details automatically.' },
    { key: 'clearing_statement', label: 'Clearing Statement (drives the dropdown label)', type: 'textarea', storage: 'json', rows: 4, helper: 'First line of this is what appears in the Door of Remembrance card dropdown. Usually identical to the CLEARING line above.' },
    { key: 'journalling_activity_heading', label: 'Journalling Activity — Heading', type: 'input', storage: 'json' },
    { key: 'journalling_activity', label: 'Journalling Activity — Content', type: 'textarea', storage: 'json', rows: 8 },
    { key: 'vimeo_video', label: 'Vimeo Video ID', type: 'input', storage: 'json', helper: 'Just the ID (e.g. 123456789), not the full URL.' },
  ],
};

// Fallback for unknown decks — show every possible field.
const ALL_FIELDS: FieldDef[] = Object.values(DECK_FIELDS).flat().reduce<FieldDef[]>((acc, f) => {
  if (!acc.find((x) => x.key === f.key && x.storage === f.storage)) acc.push(f);
  return acc;
}, []);

const CardDeckAdmin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [decks, setDecks] = useState<DeckRow[]>([]);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string>('');
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [draft, setDraft] = useState<CardRow | null>(null);

  // Auth + load decks
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/auth'); return; }
      const { data: roles } = await supabase
        .from('user_roles').select('role')
        .eq('user_id', session.user.id).eq('role', 'admin').single();
      if (!roles) { navigate('/devotion'); return; }

      const { data: deckData, error } = await supabase
        .from('decks').select('id, name').order('display_order', { ascending: true });
      if (error) {
        toast({ title: 'Failed to load decks', description: error.message, variant: 'destructive' });
      } else {
        setDecks(deckData || []);
      }
      setLoading(false);
    })();
  }, [navigate, toast]);

  // Load cards when deck changes
  useEffect(() => {
    if (!selectedDeckId) { setCards([]); setSelectedCardId(''); setDraft(null); return; }
    (async () => {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('deck_id', selectedDeckId)
        .order('card_number', { ascending: true });
      if (error) {
        toast({ title: 'Failed to load cards', description: error.message, variant: 'destructive' });
        return;
      }
      setCards((data || []) as CardRow[]);
      setSelectedCardId('');
      setDraft(null);
    })();
  }, [selectedDeckId, toast]);

  // Load draft when card changes
  useEffect(() => {
    if (!selectedCardId) { setDraft(null); return; }
    const found = cards.find((c) => c.id === selectedCardId);
    if (found) {
      setDraft({
        ...found,
        content_sections: found.content_sections || {},
      });
    }
  }, [selectedCardId, cards]);

  const selectedDeck = decks.find((d) => d.id === selectedDeckId);
  const fields = useMemo<FieldDef[]>(() => {
    if (!selectedDeck) return [];
    return DECK_FIELDS[selectedDeck.name] || ALL_FIELDS;
  }, [selectedDeck]);

  const updateField = (f: FieldDef, value: string) => {
    if (!draft) return;
    if (f.storage === 'column') {
      setDraft({ ...draft, [f.key]: value } as CardRow);
    } else {
      setDraft({
        ...draft,
        content_sections: { ...(draft.content_sections || {}), [f.key]: value },
      });
    }
  };

  const getValue = (f: FieldDef): string => {
    if (!draft) return '';
    if (f.storage === 'column') {
      return ((draft as any)[f.key] as string) || '';
    }
    return (draft.content_sections?.[f.key] as string) || '';
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      // Magic not Logic stores card_details in BOTH the column AND content_sections.
      // Keep them in sync so the public Door of Remembrance display always matches.
      const mergedSections: Record<string, any> = { ...(draft.content_sections || {}) };
      if (selectedDeck?.name === 'Magic not Logic') {
        mergedSections.card_details = draft.card_details ?? null;
      }

      // Build update payload: only known column fields + content_sections
      const payload: Record<string, any> = {
        card_title: draft.card_title,
        card_number: draft.card_number,
        image_file_name: draft.image_file_name,
        content_sections: mergedSections,
      };
      // Add all column fields for this deck
      fields.filter((f) => f.storage === 'column').forEach((f) => {
        payload[f.key] = (draft as any)[f.key] ?? null;
      });

      const { error } = await supabase.from('cards').update(payload).eq('id', draft.id);
      if (error) throw error;

      toast({ title: 'Card saved', description: `${draft.card_title} updated.` });
      // Refresh local cache
      setCards((prev) => prev.map((c) => (c.id === draft.id ? { ...c, ...payload } as CardRow : c)));
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-serif text-xl">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <PageBreadcrumb items={[{ label: 'Admin', href: '/admin' }, { label: 'Card Deck Editor' }]} />
        <ProfileDropdown />
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif text-foreground">Card Deck Editor</h1>
            <p className="text-muted-foreground text-sm">
              Edit card content across all decks. Leave fields empty when not applicable — empty sections will be hidden on the card view.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </div>

        {/* Deck + Card selectors */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">Select a card to edit</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Deck</Label>
              <Select value={selectedDeckId} onValueChange={setSelectedDeckId}>
                <SelectTrigger><SelectValue placeholder="Choose a deck…" /></SelectTrigger>
                <SelectContent>
                  {decks.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Card</Label>
              <Select
                value={selectedCardId}
                onValueChange={setSelectedCardId}
                disabled={!selectedDeckId || cards.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedDeckId ? 'Choose a card…' : 'Pick a deck first'} />
                </SelectTrigger>
                <SelectContent>
                  {cards.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      Card {c.card_number}
                      {getPublicCardLabel(c, selectedDeck?.name)
                        ? ` — ${getPublicCardLabel(c, selectedDeck?.name)}`
                        : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Editor */}
        {draft && (
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-lg">
                Editing: Card {draft.card_number}
                {getPublicCardLabel(draft, selectedDeck?.name)
                  ? ` — ${getPublicCardLabel(draft, selectedDeck?.name)}`
                  : ''}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Core fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Card Number</Label>
                  <Input
                    type="number"
                    value={draft.card_number}
                    onChange={(e) => setDraft({ ...draft, card_number: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    {selectedDeck?.name === 'AreekeerA' && 'Card Title (one-word, e.g. BODILY)'}
                    {selectedDeck?.name === 'The Sacred Rewrite' && 'Card Title'}
                    {selectedDeck?.name === 'Magic not Logic' && 'Card Title (the clearing statement, e.g. "I have to be in control")'}
                    {selectedDeck?.name === 'The Art of Self-Healing' && 'Card Title (matches Activity heading, e.g. "Exercise: Access Memory")'}
                    {!['AreekeerA','The Sacred Rewrite','Magic not Logic','The Art of Self-Healing'].includes(selectedDeck?.name || '') && 'Card Title'}
                  </Label>
                  <Input
                    value={draft.card_title || ''}
                    onChange={(e) => setDraft({ ...draft, card_title: e.target.value })}
                  />
                  {selectedDeck?.name === 'Magic not Logic' && (
                    <p className="text-xs text-muted-foreground">
                      This is shown in the Door of Remembrance card dropdown. Should match the CLEARING line in Card Details and the Clearing Statement below.
                    </p>
                  )}
                  {selectedDeck?.name === 'The Art of Self-Healing' && (
                    <p className="text-xs text-muted-foreground">
                      The dropdown displays the Activity heading (with "Exercise:" / "Template:" stripped). Keep this in sync with the Activity Heading field below.
                    </p>
                  )}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Image File Name</Label>
                  <Input
                    value={draft.image_file_name || ''}
                    placeholder="e.g. card-01.jpg (served from /cards/)"
                    onChange={(e) => setDraft({ ...draft, image_file_name: e.target.value })}
                  />
                </div>
              </div>

              {/* Deck-specific fields */}
              <div className="space-y-4 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground font-serif italic">
                  {selectedDeck?.name} fields — leave any field blank to hide that section.
                </p>
                {fields.map((f) => (
                  <div key={`${f.storage}-${f.key}`} className="space-y-2">
                    <Label>{f.label}</Label>
                    {f.type === 'input' ? (
                      <Input
                        value={getValue(f)}
                        onChange={(e) => updateField(f, e.target.value)}
                      />
                    ) : (
                      <Textarea
                        rows={f.rows || 6}
                        value={getValue(f)}
                        onChange={(e) => updateField(f, e.target.value)}
                      />
                    )}
                    {f.helper && <p className="text-xs text-muted-foreground">{f.helper}</p>}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => {
                  const found = cards.find((c) => c.id === selectedCardId);
                  if (found) setDraft({ ...found, content_sections: found.content_sections || {} });
                }} disabled={saving}>
                  Reset
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : <><Save className="w-4 h-4 mr-2" />Save Changes</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CardDeckAdmin;
