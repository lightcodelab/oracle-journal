import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, ArrowLeft, Plus, ArrowUp, ArrowDown } from 'lucide-react';
import RichTextEditor from '@/components/admin/RichTextEditor';
import { cardImageSrc } from '@/lib/cardImage';
import { useToast } from '@/hooks/use-toast';
import ProfileDropdown from '@/components/ProfileDropdown';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import { compressImage } from '@/lib/imageCompression';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CourseTagPicker from '@/components/admin/CourseTagPicker';
import CardResourceLinkPicker, { type SelectedLink } from '@/components/admin/CardResourceLinkPicker';
import { fetchCardResourceLinks, saveCardResourceLinks } from '@/lib/cardResourceLinks';
import { Switch } from '@/components/ui/switch';

import { Image as ImageIcon, X as XIcon } from 'lucide-react';
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
  description?: string | null;
  theme?: string | null;
  thumbnail_url?: string | null;
  card_back_url?: string | null;
  image_color?: string | null;
  is_published: boolean;
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
    { key: 'mini_reading', label: 'Mini Reading — shown on the card view', type: 'textarea', storage: 'json', rows: 5, helper: 'Short 2-3 sentence reading shown after a shuffle or card lookup. Leave blank to show the full sections instead.' },
    { key: 'mini_reflection_question', label: 'Mini Reading — Reflection Question', type: 'input', storage: 'json', helper: 'One distilled question shown under the mini reading.' },
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

  // Deck settings draft
  const [deckDraft, setDeckDraft] = useState<{
    name: string;
    description: string;
    theme: string;
    thumbnail_url: string | null;
    card_back_url: string | null;
    is_published: boolean;
  } | null>(null);
  const [deckTagIds, setDeckTagIds] = useState<string[]>([]);
  const [cardTagIds, setCardTagIds] = useState<string[]>([]);
  const [cardLinks, setCardLinks] = useState<SelectedLink[]>([]);

  const [savingDeck, setSavingDeck] = useState(false);
  const [uploadingDeckThumb, setUploadingDeckThumb] = useState(false);
  const [uploadingCardBack, setUploadingCardBack] = useState(false);

  // New-deck dialog state
  const [newDeckOpen, setNewDeckOpen] = useState(false);
  const [creatingDeck, setCreatingDeck] = useState(false);
  const [newDeck, setNewDeck] = useState({
    name: '',
    theme: '',
    description: '',
    image_color: '#8b5e3c',
  });
  const [backMode, setBackMode] = useState<'image' | 'color'>('image');
  const [backImageFile, setBackImageFile] = useState<File | null>(null);
  const [backImagePreview, setBackImagePreview] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);

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
        .from('decks')
        .select('id, name, description, theme, thumbnail_url, card_back_url, image_color, is_published')
        .order('display_order', { ascending: true });
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
    if (!selectedDeckId) {
      setCards([]); setSelectedCardId(''); setDraft(null);
      setDeckDraft(null); setDeckTagIds([]);
      return;
    }
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

      // Load current deck values into settings draft
      const d = decks.find((x) => x.id === selectedDeckId);
      if (d) {
        setDeckDraft({
          name: d.name || '',
          description: d.description || '',
          theme: d.theme || '',
          thumbnail_url: d.thumbnail_url || null,
          card_back_url: d.card_back_url || null,
          is_published: d.is_published,
        });
      }
      const { data: tagRows } = await (supabase as any)
        .from('deck_tag_assignments')
        .select('tag_id')
        .eq('deck_id', selectedDeckId);
      setDeckTagIds((tagRows || []).map((r: any) => r.tag_id));
    })();
  }, [selectedDeckId, toast, decks]);

  // Load draft when card changes
  useEffect(() => {
    if (!selectedCardId) { setDraft(null); setCardTagIds([]); return; }
    const found = cards.find((c) => c.id === selectedCardId);
    if (found) {
      setDraft({
        ...found,
        content_sections: found.content_sections || {},
      });
    }
  }, [selectedCardId, cards]);

  // Load this card's tags
  useEffect(() => {
    if (!selectedCardId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('card_tag_assignments')
        .select('tag_id')
        .eq('card_id', selectedCardId);
      if (!cancelled) setCardTagIds((data || []).map((r: any) => r.tag_id));
    })();
    return () => { cancelled = true; };
  }, [selectedCardId]);

  // Load this card's linked resources
  useEffect(() => {
    if (!selectedCardId) { setCardLinks([]); return; }
    let cancelled = false;
    (async () => {
      const rows = await fetchCardResourceLinks(selectedCardId);
      if (!cancelled) setCardLinks(rows.map((r) => ({ kind: r.resource_kind, id: r.resource_id })));
    })();
    return () => { cancelled = true; };
  }, [selectedCardId]);


  const selectedDeck = decks.find((d) => d.id === selectedDeckId);
  const fields = useMemo<FieldDef[]>(() => {
    if (!selectedDeck) return [];
    // New decks created from this admin default to The Sacred Rewrite field structure.
    return DECK_FIELDS[selectedDeck.name] || DECK_FIELDS['The Sacred Rewrite'];
  }, [selectedDeck]);

  const [generatingTags, setGeneratingTags] = useState(false);

  const generateCardTags = async (overwrite: boolean) => {
    if (!selectedDeckId) return;
    setGeneratingTags(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-content-tags', {
        body: { mode: 'cards', deck_id: selectedDeckId, overwrite },
      });
      if (error) throw error;
      toast({
        title: 'Tags suggested',
        description: `${(data as any)?.tagged ?? 0} cards tagged. Open a card to edit its tags.`,
      });
      if (selectedCardId) {
        const { data: rows } = await supabase
          .from('card_tag_assignments')
          .select('tag_id')
          .eq('card_id', selectedCardId);
        setCardTagIds((rows || []).map((r: any) => r.tag_id));
      }
    } catch (e: any) {
      toast({ title: 'Could not suggest tags', description: e?.message ?? String(e), variant: 'destructive' });
    } finally {
      setGeneratingTags(false);
    }
  };


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

  // Sections the admin explicitly added this session (so an empty box stays visible).
  const [addedKeys, setAddedKeys] = useState<string[]>([]);
  const [uploadingCardImage, setUploadingCardImage] = useState(false);

  useEffect(() => { setAddedKeys([]); }, [selectedCardId]);

  const fieldId = (f: FieldDef) => `${f.storage}:${f.key}`;

  const visibleFields = useMemo(
    () => fields.filter((f) => getValue(f).trim() !== '' || addedKeys.includes(fieldId(f))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fields, draft, addedKeys],
  );

  const availableFields = useMemo(
    () => fields.filter((f) => !visibleFields.includes(f)),
    [fields, visibleFields],
  );

  type CustomSection = { id: string; title: string; content: string };

  const customSections: CustomSection[] = Array.isArray(draft?.content_sections?.custom_sections)
    ? ((draft!.content_sections!.custom_sections as any[]).map((s, i) => ({
        id: String(s?.id ?? i),
        title: String(s?.title ?? ''),
        content: String(s?.content ?? ''),
      })))
    : [];

  const setCustomSections = (next: CustomSection[]) => {
    if (!draft) return;
    setDraft({
      ...draft,
      content_sections: { ...(draft.content_sections || {}), custom_sections: next },
    });
  };

  const addSection = (value: string) => {
    if (!draft) return;
    if (value === '__custom__') {
      setCustomSections([
        ...customSections,
        { id: `cs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, title: '', content: '' },
      ]);
      return;
    }
    if (!addedKeys.includes(value)) setAddedKeys((prev) => [...prev, value]);
  };

  const removeSection = (f: FieldDef) => {
    updateField(f, '');
    setAddedKeys((prev) => prev.filter((k) => k !== fieldId(f)));
  };

  const updateCustomSection = (id: string, patch: Partial<CustomSection>) => {
    setCustomSections(customSections.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeCustomSection = (id: string) => {
    setCustomSections(customSections.filter((s) => s.id !== id));
  };

  const moveCustomSection = (index: number, delta: number) => {
    const next = [...customSections];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setCustomSections(next);
  };

  const handleCardImageUpload = async (file: File) => {
    if (!draft) return;
    setUploadingCardImage(true);
    try {
      const compressed = await compressImage(file);
      const ext = compressed.name.split('.').pop() || 'webp';
      const path = `cards/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('content-images')
        .upload(path, compressed, { contentType: compressed.type, upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('content-images').getPublicUrl(path);
      setDraft((d) => (d ? { ...d, image_file_name: pub.publicUrl } : d));
      toast({ title: 'Card image uploaded', description: 'Press Save Changes to keep it.' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingCardImage(false);
    }
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

      // Sync this card's tags (used by Search)
      await supabase.from('card_tag_assignments').delete().eq('card_id', draft.id);
      if (cardTagIds.length > 0) {
        const { error: tagErr } = await supabase
          .from('card_tag_assignments')
          .insert(cardTagIds.map((tag_id) => ({ card_id: draft.id, tag_id })));
        if (tagErr) throw tagErr;
      }

      // Sync linked resources shown on the card page
      await saveCardResourceLinks(draft.id, cardLinks);


      toast({ title: 'Card saved', description: `${draft.card_title} updated.` });
      // Refresh local cache
      setCards((prev) => prev.map((c) => (c.id === draft.id ? { ...c, ...payload } as CardRow : c)));
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateDeck = async () => {
    if (!newDeck.name.trim() || !newDeck.theme.trim()) {
      toast({ title: 'Name and Theme required', variant: 'destructive' });
      return;
    }
    if (backMode === 'image' && !backImageFile) {
      toast({ title: 'Card back image required', description: 'Upload an image or switch to Color.', variant: 'destructive' });
      return;
    }
    setCreatingDeck(true);
    try {
      // If user uploaded an image, compress + push to storage and store URL in image_color.
      let imageColorValue = newDeck.image_color || '#8b5e3c';
      if (backMode === 'image' && backImageFile) {
        setUploadingImage(true);
        const compressed = await compressImage(backImageFile);
        const ext = compressed.name.split('.').pop() || 'webp';
        const path = `card-backs/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('content-images')
          .upload(path, compressed, { contentType: compressed.type, upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('content-images').getPublicUrl(path);
        imageColorValue = pub.publicUrl;
        setUploadingImage(false);
      }

      const nextOrder = (decks.length || 0) + 1;
      const { data: created, error } = await supabase
        .from('decks')
        .insert({
          name: newDeck.name.trim(),
          theme: newDeck.theme.trim(),
          description: newDeck.description.trim() || null,
          image_color: imageColorValue,
          display_order: nextOrder,
          is_free: false,
          is_starter: false,
          is_published: false,
        })
        .select('id, name, description, theme, thumbnail_url, card_back_url, image_color, is_published')
        .single();
      if (error) throw error;

      // Refresh deck list and select the new deck
      const { data: deckData } = await supabase
        .from('decks').select('id, name, description, theme, thumbnail_url, card_back_url, image_color, is_published').order('display_order', { ascending: true });
      setDecks(deckData || []);
      setSelectedDeckId(created.id);
      setNewDeckOpen(false);
      setNewDeck({ name: '', theme: '', description: '', image_color: '#8b5e3c' });
      setBackImageFile(null);
      setBackImagePreview('');
      setBackMode('image');
      toast({
        title: 'Deck created',
        description: `${created.name} created with The Sacred Rewrite field structure. Add cards using the form below.`,
      });
    } catch (err: any) {
      toast({ title: 'Failed to create deck', description: err.message, variant: 'destructive' });
    } finally {
      setCreatingDeck(false);
      setUploadingImage(false);
    }
  };

  const handleAddCard = async () => {
    if (!selectedDeckId || !selectedDeck) return;
    const nextNumber = (cards.reduce((max, c) => Math.max(max, c.card_number), 0) || 0) + 1;
    try {
      const { data, error } = await supabase
        .from('cards')
        .insert({
          deck_id: selectedDeckId,
          deck_name: selectedDeck.name,
          card_number: nextNumber,
          card_title: `Card ${nextNumber}`,
          content_sections: {},
        })
        .select('*')
        .single();
      if (error) throw error;
      const newCard = data as CardRow;
      setCards((prev) => [...prev, newCard].sort((a, b) => a.card_number - b.card_number));
      setSelectedCardId(newCard.id);
      toast({ title: 'Card added', description: `Card ${nextNumber} created. Edit and save below.` });
    } catch (err: any) {
      toast({ title: 'Failed to add card', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeckThumbnailUpload = async (file: File) => {
    setUploadingDeckThumb(true);
    try {
      const compressed = await compressImage(file);
      const ext = compressed.name.split('.').pop() || 'webp';
      const path = `deck-thumbnails/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('content-images')
        .upload(path, compressed, { contentType: compressed.type, upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('content-images').getPublicUrl(path);
      setDeckDraft((d) => (d ? { ...d, thumbnail_url: pub.publicUrl } : d));
      toast({ title: 'Thumbnail uploaded' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingDeckThumb(false);
    }
  };

  const handleDeckCardBackUpload = async (file: File) => {
    setUploadingCardBack(true);
    try {
      const compressed = await compressImage(file);
      const ext = compressed.name.split('.').pop() || 'webp';
      const path = `card-backs/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('content-images')
        .upload(path, compressed, { contentType: compressed.type, upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('content-images').getPublicUrl(path);
      setDeckDraft((d) => (d ? { ...d, card_back_url: pub.publicUrl } : d));
      toast({ title: 'Card back uploaded', description: 'Save Deck Settings to apply it.' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingCardBack(false);
    }
  };

  const handleSaveDeckSettings = async () => {
    if (!selectedDeckId || !deckDraft) return;
    if (!deckDraft.name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }
    setSavingDeck(true);
    try {
      const { error } = await supabase
        .from('decks')
        .update({
          name: deckDraft.name.trim(),
          description: deckDraft.description.trim() || null,
          theme: deckDraft.theme.trim() || null,
          thumbnail_url: deckDraft.thumbnail_url,
          card_back_url: deckDraft.card_back_url,
          is_published: deckDraft.is_published,
        })
        .eq('id', selectedDeckId);
      if (error) throw error;

      // Sync deck tags
      await (supabase as any).from('deck_tag_assignments').delete().eq('deck_id', selectedDeckId);
      if (deckTagIds.length > 0) {
        const rows = deckTagIds.map((tag_id) => ({ deck_id: selectedDeckId, tag_id }));
        await (supabase as any).from('deck_tag_assignments').insert(rows);
      }

      // Refresh local decks list
      setDecks((prev) =>
        prev.map((d) =>
          d.id === selectedDeckId
            ? {
                ...d,
                name: deckDraft.name.trim(),
                description: deckDraft.description.trim() || null,
                theme: deckDraft.theme.trim() || null,
                thumbnail_url: deckDraft.thumbnail_url,
                card_back_url: deckDraft.card_back_url,
                is_published: deckDraft.is_published,
              }
            : d,
        ),
      );
      toast({ title: 'Deck saved', description: 'Deck settings updated.' });
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSavingDeck(false);
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
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="font-serif text-lg">Select a card to edit</CardTitle>
              <Dialog open={newDeckOpen} onOpenChange={setNewDeckOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" /> New Deck
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="font-serif">Create a new card deck</DialogTitle>
                    <DialogDescription>
                      New decks use the same field structure as <em>The Sacred Rewrite</em>
                      {' '}(Opening Invocation, Spiral of Inquiry, Acknowledgement, Spiral of Seeing,
                      Living Inquiry, Guided Audio, Embodiment Ritual, Closing Benediction).
                      You can add cards to it after creating.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label>Deck Name *</Label>
                      <Input
                        value={newDeck.name}
                        placeholder="e.g. The Sacred Rewrite Vol. II"
                        onChange={(e) => setNewDeck({ ...newDeck, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Theme *</Label>
                      <Input
                        value={newDeck.theme}
                        placeholder="e.g. Remembrance, Awakening, Sovereignty"
                        onChange={(e) => setNewDeck({ ...newDeck, theme: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        rows={3}
                        value={newDeck.description}
                        onChange={(e) => setNewDeck({ ...newDeck, description: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Card Back</Label>
                      <Tabs value={backMode} onValueChange={(v) => setBackMode(v as 'image' | 'color')}>
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="image">Upload Image</TabsTrigger>
                          <TabsTrigger value="color">Solid Color</TabsTrigger>
                        </TabsList>
                        <TabsContent value="image" className="space-y-3 pt-3">
                          <Input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              setBackImageFile(file);
                              if (backImagePreview) URL.revokeObjectURL(backImagePreview);
                              setBackImagePreview(file ? URL.createObjectURL(file) : '');
                            }}
                          />
                          {backImagePreview && (
                            <div className="rounded-md border border-border overflow-hidden w-32 aspect-[2/3] bg-muted">
                              <img src={backImagePreview} alt="Card back preview" className="w-full h-full object-cover" />
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">
                            JPG, PNG or WebP. Auto-compressed to ~60% quality, max 1920px.
                          </p>
                        </TabsContent>
                        <TabsContent value="color" className="space-y-2 pt-3">
                          <Input
                            value={newDeck.image_color}
                            placeholder="#8b5e3c"
                            onChange={(e) => setNewDeck({ ...newDeck, image_color: e.target.value })}
                          />
                          <p className="text-xs text-muted-foreground">Hex color used as the card back fill.</p>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setNewDeckOpen(false)} disabled={creatingDeck}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateDeck} disabled={creatingDeck || uploadingImage}>
                      {(creatingDeck || uploadingImage)
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{uploadingImage ? 'Uploading…' : 'Creating…'}</>
                        : 'Create Deck'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
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
              <div className="flex items-center justify-between">
                <Label>Card</Label>
                {selectedDeckId && (
                  <Button type="button" variant="ghost" size="sm" onClick={handleAddCard}>
                    <Plus className="w-3 h-3 mr-1" /> Add Card
                  </Button>
                )}
              </div>
              <Select
                value={selectedCardId}
                onValueChange={setSelectedCardId}
                disabled={!selectedDeckId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    selectedDeckId
                      ? (cards.length === 0 ? 'No cards yet — click Add Card' : 'Choose a card…')
                      : 'Pick a deck first'
                  } />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-[60vh] overflow-y-auto">
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

        {/* Deck Settings — parent-deck metadata */}
        {selectedDeckId && deckDraft && (
          <Card className="border-primary/30 bg-muted/20">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="font-serif text-lg">Deck Settings</CardTitle>
                <Badge variant={deckDraft.is_published ? 'default' : 'secondary'}>
                  {deckDraft.is_published ? 'Published' : 'Draft'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                These fields control how the deck appears on the Door of Remembrance. They are separate from individual card content.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4 rounded-md border border-border/60 bg-background p-4">
                <div className="space-y-1">
                  <Label htmlFor="deck-published">Publish Deck</Label>
                  <p className="text-xs text-muted-foreground">
                    Draft decks and their cards are visible only to admins.
                  </p>
                </div>
                <Switch
                  id="deck-published"
                  checked={deckDraft.is_published}
                  onCheckedChange={(is_published) => setDeckDraft({ ...deckDraft, is_published })}
                  aria-label="Publish deck"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Deck Name</Label>
                  <Input
                    value={deckDraft.name}
                    onChange={(e) => setDeckDraft({ ...deckDraft, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Input
                    value={deckDraft.theme}
                    onChange={(e) => setDeckDraft({ ...deckDraft, theme: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <RichTextEditor
                  value={deckDraft.description}
                  onChange={(html) => setDeckDraft({ ...deckDraft, description: html })}
                  minHeight={180}
                />
              </div>
              <div className="space-y-2">
                <Label>Thumbnail (Door of Remembrance card image)</Label>
                {deckDraft.thumbnail_url ? (
                  <div className="flex items-center gap-3 p-3 bg-background rounded-md border">
                    <img
                      src={deckDraft.thumbnail_url}
                      alt="Deck thumbnail"
                      className="w-24 aspect-video object-cover rounded"
                    />
                    <span className="flex-1 text-xs truncate text-muted-foreground">{deckDraft.thumbnail_url}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeckDraft({ ...deckDraft, thumbnail_url: null })}
                    >
                      <XIcon className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={uploadingDeckThumb}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleDeckThumbnailUpload(file);
                      }}
                    />
                    {uploadingDeckThumb && <Loader2 className="w-4 h-4 animate-spin" />}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Displayed on the Door of Remembrance deck grid. JPG/PNG/WebP, auto-compressed.
                </p>
              </div>
              <CourseTagPicker
                selectedTagIds={deckTagIds}
                onChange={setDeckTagIds}
                label="Deck Tags"
              />
              <div className="space-y-2 pt-4 border-t border-border/60">
                <Label>Suggested card tags</Label>
                <p className="text-xs text-muted-foreground">
                  Reads each card in this deck — its own writing, this deck's description and any
                  matching companion lesson — and suggests at least 5 search tags per card. Cards
                  that already have tags are left alone unless you choose to replace them. You can
                  edit every suggestion afterwards on the card itself.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" disabled={generatingTags} onClick={() => generateCardTags(false)}>
                    {generatingTags ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Working…</>
                    ) : 'Suggest tags for untagged cards'}
                  </Button>
                  <Button variant="ghost" size="sm" disabled={generatingTags} onClick={() => generateCardTags(true)}>
                    Replace all tags in this deck
                  </Button>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-border/60">
                <Button onClick={handleSaveDeckSettings} disabled={savingDeck}>
                  {savingDeck ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
                  ) : (
                    <><Save className="w-4 h-4 mr-2" />Save Deck Settings</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
                  <Label>Card Image</Label>
                  {draft.image_file_name ? (
                    <div className="flex items-center gap-3 p-3 bg-background rounded-md border">
                      <img
                        src={cardImageSrc(draft.image_file_name)}
                        alt="Card image"
                        className="w-20 aspect-[3/4] object-cover rounded"
                      />
                      <span className="flex-1 text-xs truncate text-muted-foreground">
                        {draft.image_file_name}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setDraft({ ...draft, image_file_name: null })}
                      >
                        <XIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={uploadingCardImage}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleCardImageUpload(file);
                          e.target.value = '';
                        }}
                      />
                      {uploadingCardImage && <Loader2 className="w-4 h-4 animate-spin" />}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG or WebP — auto-compressed. Existing cards keep their original artwork
                    until you upload a replacement.
                  </p>
                </div>
              </div>

              {/* Deck-specific sections */}
              <div className="space-y-5 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground font-serif italic">
                  Card Reading content — only the sections below appear on the card page.
                </p>

                {visibleFields.map((f) => (
                  <div key={`${f.storage}-${f.key}`} className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <Label>{f.label}</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={() => removeSection(f)}
                      >
                        <XIcon className="w-4 h-4 mr-1" /> Remove
                      </Button>
                    </div>
                    {f.type === 'input' ? (
                      <Input
                        value={getValue(f)}
                        onChange={(e) => updateField(f, e.target.value)}
                      />
                    ) : (
                      <RichTextEditor
                        value={getValue(f)}
                        onChange={(html) => updateField(f, html)}
                        minHeight={(f.rows || 6) * 24}
                      />
                    )}
                    {f.helper && <p className="text-xs text-muted-foreground">{f.helper}</p>}
                  </div>
                ))}

                {/* Custom sections */}
                {customSections.map((section, index) => (
                  <div key={section.id} className="space-y-2 rounded-md border border-primary/30 p-3 bg-muted/20">
                    <div className="flex items-center justify-between gap-2">
                      <Label>Custom section</Label>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={index === 0}
                          onClick={() => moveCustomSection(index, -1)}
                          aria-label="Move section up"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={index === customSections.length - 1}
                          onClick={() => moveCustomSection(index, 1)}
                          aria-label="Move section down"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground"
                          onClick={() => removeCustomSection(section.id)}
                        >
                          <XIcon className="w-4 h-4 mr-1" /> Remove
                        </Button>
                      </div>
                    </div>
                    <Input
                      value={section.title}
                      placeholder="Section title — shown on the card page"
                      onChange={(e) => updateCustomSection(section.id, { title: e.target.value })}
                    />
                    <RichTextEditor
                      value={section.content}
                      onChange={(html) => updateCustomSection(section.id, { content: html })}
                      minHeight={160}
                    />
                  </div>
                ))}

                {/* Add a section */}
                <div className="space-y-2 pt-2">
                  <Label>Add a section</Label>
                  <Select value="" onValueChange={addSection}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a section to add…" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-[50vh] overflow-y-auto">
                      {availableFields.map((f) => (
                        <SelectItem key={`${f.storage}-${f.key}`} value={`${f.storage}:${f.key}`}>
                          {f.label}
                        </SelectItem>
                      ))}
                      <SelectItem value="__custom__">New custom section…</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Named sections belong to this deck's layout. A custom section lets you write your
                    own title and content, shown after the deck's own sections.
                  </p>
                </div>
              </div>

              {/* Card tags — power the Search tool */}
              <div className="space-y-2 pt-4 border-t border-border">
                <CourseTagPicker
                  selectedTagIds={cardTagIds}
                  onChange={setCardTagIds}
                  label="Card Tags"
                />
                <p className="text-xs text-muted-foreground">
                  Tags make this individual card findable in Search. Aim for at least 5. They are
                  saved together with the card when you press Save Changes.
                </p>
              </div>

              {/* Linked resources shown on the card page */}
              <div className="space-y-2 pt-4 border-t border-border">
                <Label>Linked Resources for deepening the experience</Label>
                <CardResourceLinkPicker value={cardLinks} onChange={setCardLinks} />
                <p className="text-xs text-muted-foreground">
                  Search any existing resource or course by name and add it. These appear on the card
                  page under "Linked Resources for deepening the experience". Saved with Save Changes.
                </p>
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
