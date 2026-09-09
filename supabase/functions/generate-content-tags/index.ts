// Generates search tags for oracle cards and courses from their own content.
// Admin-only. Tags are written to course_tags (shared vocabulary) and linked
// through card_tag_assignments / course_tag_assignments so Search can find them.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const MIN_TAGS = 5;
const MAX_TAGS = 8;

const normaliseTag = (raw: string): string | null => {
  const cleaned = raw.replace(/[^a-zA-Z0-9\s\-'&]/g, '').replace(/\s+/g, ' ').trim();
  if (cleaned.length < 3 || cleaned.length > 40) return null;
  return cleaned
    .toLowerCase()
    .split(' ')
    .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
};

const flattenText = (value: unknown, depth = 0): string => {
  if (value == null || depth > 4) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((v) => flattenText(v, depth + 1)).join('\n');
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>)
      .map((v) => flattenText(v, depth + 1))
      .join('\n');
  }
  return '';
};

const stripHtml = (s: string) => s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

async function suggestTags(
  items: { key: string; label: string; text: string }[],
  vocabulary: string[],
  contextLabel: string,
): Promise<Record<string, string[]>> {
  const prompt = [
    `You are tagging content inside a somatic / trauma-informed healing library so members can find it through search.`,
    `Context: ${contextLabel}`,
    ``,
    `For EACH item below, return between ${MIN_TAGS} and ${MAX_TAGS} short search tags (1-3 words each).`,
    `Tags must describe what a member would actually search for: the theme, the felt experience,`,
    `the pattern, the practice type, and the life area. Reuse tags from this existing vocabulary`,
    `whenever they genuinely fit, before inventing new ones:`,
    vocabulary.length ? vocabulary.join(', ') : '(none yet)',
    ``,
    `Rules: no diagnoses, no medical or efficacy claims, no invented product names, no numbers,`,
    `no duplicated tags within one item, Title Case, plain language.`,
    ``,
    `Return ONLY valid JSON of the shape {"items":[{"key":"...","tags":["...","..."]}]}.`,
    ``,
    `ITEMS:`,
    ...items.map((i) => `--- key: ${i.key}\ntitle: ${i.label}\ncontent: ${i.text.slice(0, 2600)}`),
  ].join('\n');

  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`AI gateway failed [${res.status}]: ${body}`);
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content ?? '{}';
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = String(content).match(/\{[\s\S]*\}/);
    parsed = match ? JSON.parse(match[0]) : { items: [] };
  }
  const out: Record<string, string[]> = {};
  const validKeys = new Set(items.map((i) => i.key));
  for (const entry of parsed?.items ?? []) {
    const raw = String(entry?.key ?? '').trim();
    // Models occasionally mangle long ids, so only accept keys we actually sent.
    const key = validKeys.has(raw)
      ? raw
      : (items.find((i) => i.key.replace(/-/g, '') === raw.replace(/-/g, '')) ?? { key: '' }).key;
    if (!key) continue;
    const tags = (entry?.tags ?? [])
      .map((t: unknown) => normaliseTag(String(t)))
      .filter((t: string | null): t is string => !!t);
    if (key && tags.length) out[key] = [...new Set(tags)].slice(0, MAX_TAGS);
  }
  return out;
}

async function ensureTagIds(names: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (names.length === 0) return map;
  const { data: existing } = await admin.from('course_tags').select('id, name');
  const byLower = new Map<string, { id: string; name: string }>();
  (existing ?? []).forEach((t: any) => byLower.set(t.name.toLowerCase(), t));

  const missing: string[] = [];
  for (const name of names) {
    const found = byLower.get(name.toLowerCase());
    if (found) map.set(name.toLowerCase(), found.id);
    else if (!missing.some((m) => m.toLowerCase() === name.toLowerCase())) missing.push(name);
  }

  if (missing.length) {
    const palette = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
    const { data: created, error } = await admin
      .from('course_tags')
      .insert(missing.map((name, i) => ({ name, color: palette[i % palette.length] })))
      .select('id, name');
    if (error) throw error;
    (created ?? []).forEach((t: any) => map.set(t.name.toLowerCase(), t.id));
  }
  return map;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Admin check against the caller's own token.
    const authHeader = req.headers.get('Authorization') ?? '';
    const caller = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await caller.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Not signed in' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: isAdmin } = await admin.rpc('has_role', { _user_id: userId, _role: 'admin' });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admins only' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const mode: 'cards' | 'courses' = body.mode === 'courses' ? 'courses' : 'cards';
    const deckId: string | null = body.deck_id ?? null;
    const overwrite = body.overwrite === true;
    const batchSize = Math.min(Number(body.batch_size) || 8, 12);
    const maxItems = Math.min(Number(body.max_items) || 500, 1000);

    const { data: vocabRows } = await admin.from('course_tags').select('name').order('name');
    const vocabulary = (vocabRows ?? []).map((t: any) => t.name);

    let items: { key: string; label: string; text: string }[] = [];
    let contextLabel = '';

    if (mode === 'cards') {
      let cardQuery = admin
        .from('cards')
        .select('id, deck_id, card_number, card_title, card_details, content_sections, deck_name')
        .order('card_number');
      if (deckId) cardQuery = cardQuery.eq('deck_id', deckId);
      const { data: cards, error: cardErr } = await cardQuery;
      if (cardErr) throw cardErr;

      const { data: decks } = await admin.from('decks').select('id, name, description, theme');
      const deckById = new Map((decks ?? []).map((d: any) => [d.id, d]));

      // Companion / deepening course lesson content, matched by lesson title to card title.
      const { data: lessons } = await admin
        .from('lessons')
        .select('title, description, content, module_title');
      const lessonByTitle = new Map<string, string>();
      (lessons ?? []).forEach((l: any) => {
        const key = String(l.title ?? '').toLowerCase().trim();
        if (!key) return;
        const text = stripHtml([l.description, l.content].filter(Boolean).join('\n'));
        if (text) lessonByTitle.set(key, text);
      });

      const { data: existingAssignments } = await admin.from('card_tag_assignments').select('card_id');
      const alreadyTagged = new Set((existingAssignments ?? []).map((r: any) => r.card_id));

      items = (cards ?? [])
        .filter((c: any) => overwrite || !alreadyTagged.has(c.id))
        .slice(0, maxItems)
        .map((c: any) => {
          const deck = deckById.get(c.deck_id) as any;
          const cardText = stripHtml(
            [c.card_details, flattenText(c.content_sections)].filter(Boolean).join('\n'),
          );
          const companion = lessonByTitle.get(String(c.card_title ?? '').toLowerCase().trim()) ?? '';
          return {
            key: c.id,
            label: `${deck?.name ?? c.deck_name ?? 'Deck'} — Card ${c.card_number}: ${c.card_title ?? ''}`,
            text: [
              deck?.description ? `Deck: ${deck.name} — ${deck.description}` : '',
              deck?.theme ? `Deck theme: ${deck.theme}` : '',
              cardText,
              companion ? `Companion course lesson: ${companion.slice(0, 1200)}` : '',
            ].filter(Boolean).join('\n'),
          };
        });
      contextLabel = 'Oracle card decks (cards a member draws for reflection).';
    } else {
      const { data: courses, error: courseErr } = await admin
        .from('courses')
        .select('id, title, description');
      if (courseErr) throw courseErr;
      const { data: lessons } = await admin
        .from('lessons')
        .select('course_id, title, description, content');
      const lessonsByCourse = new Map<string, string[]>();
      (lessons ?? []).forEach((l: any) => {
        const arr = lessonsByCourse.get(l.course_id) ?? [];
        arr.push(stripHtml([l.title, l.description, l.content].filter(Boolean).join('\n')));
        lessonsByCourse.set(l.course_id, arr);
      });

      const { data: existingAssignments } = await admin.from('course_tag_assignments').select('course_id');
      const tagCounts = new Map<string, number>();
      (existingAssignments ?? []).forEach((r: any) =>
        tagCounts.set(r.course_id, (tagCounts.get(r.course_id) ?? 0) + 1),
      );

      items = (courses ?? [])
        .filter((c: any) => overwrite || (tagCounts.get(c.id) ?? 0) < MIN_TAGS)
        .slice(0, maxItems)
        .map((c: any) => ({
          key: c.id,
          label: c.title,
          text: [
            stripHtml(c.description ?? ''),
            ...(lessonsByCourse.get(c.id) ?? []).map((t) => t.slice(0, 900)),
          ].filter(Boolean).join('\n'),
        }));
      contextLabel = 'Courses, tagged from their own lesson content.';
    }

    let tagged = 0;
    let assignments = 0;

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const suggestions = await suggestTags(batch, vocabulary, contextLabel);
      const allNames = [...new Set(Object.values(suggestions).flat())];
      if (allNames.length === 0) continue;
      const tagIds = await ensureTagIds(allNames);
      allNames.forEach((n) => {
        if (!vocabulary.some((v) => v.toLowerCase() === n.toLowerCase())) vocabulary.push(n);
      });

      const rows: Record<string, string>[] = [];
      for (const [key, names] of Object.entries(suggestions)) {
        const ids = names.map((n) => tagIds.get(n.toLowerCase())).filter(Boolean) as string[];
        if (ids.length === 0) continue;
        tagged += 1;
        if (mode === 'cards') {
          if (overwrite) await admin.from('card_tag_assignments').delete().eq('card_id', key);
          ids.forEach((tag_id) => rows.push({ card_id: key, tag_id }));
        } else {
          if (overwrite) await admin.from('course_tag_assignments').delete().eq('course_id', key);
          ids.forEach((tag_id) => rows.push({ course_id: key, tag_id }));
        }
      }
      if (rows.length) {
        const table = mode === 'cards' ? 'card_tag_assignments' : 'course_tag_assignments';
        const { error: insErr } = await admin.from(table).upsert(rows, {
          onConflict: mode === 'cards' ? 'card_id,tag_id' : 'course_id,tag_id',
          ignoreDuplicates: true,
        });
        if (insErr && !String(insErr.message).includes('duplicate')) throw insErr;
        assignments += rows.length;
      }
    }

    return new Response(
      JSON.stringify({ mode, considered: items.length, tagged, assignments }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('generate-content-tags failed:', err);
    return new Response(JSON.stringify({ error: String((err as Error).message ?? err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
