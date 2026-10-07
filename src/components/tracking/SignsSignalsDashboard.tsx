import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import * as Icons from "lucide-react";
import { Sparkles, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TransformationEntry, TransformationTool } from "@/hooks/useTransformationTools";
import {
  CLAIRS, ClairKey, INTUITION_QUIZ_SLUG, INTUITION_TOOL_SLUGS, TALLY_SLUG, clairForEntry, clairFromText,
} from "@/lib/intuitionClairs";

const STOPWORDS = new Set(
  ("a an and are as at be been but by for from had has have he her his i if in into is it its just me my of on or our she so " +
    "than that the their them then there they this to was we were what when where which while who with you your very really " +
    "about after again all also am any because before being both can could did do does doing down each few more most much " +
    "no not now only other out over own same should some such too under until up us will would felt feel saw see seen heard " +
    "hear thought think knew know got get like one two time day today something someone thing things").split(" "),
);

const Icon = ({ name, className }: { name: string; className?: string }) => {
  const C = (Icons as any)[name] || Sparkles;
  return <C className={className} />;
};

const asList = (v: any): string[] =>
  Array.isArray(v) ? v.map(String) : typeof v === "string" && v.trim() ? v.split(/[,;]/).map((s) => s.trim()).filter(Boolean) : [];

const topN = (m: Map<string, number>, n: number) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);

interface Props {
  userId: string | undefined;
  entries: TransformationEntry[];
  tools: TransformationTool[];
}

/** Themes and recurring signs across the Intuition Builder trackers. */
export default function SignsSignalsDashboard({ userId, entries, tools }: Props) {
  const slugById = useMemo(() => new Map(tools.map((t) => [t.id, t.slug])), [tools]);
  const intuitionEntries = useMemo(
    () => entries.filter((e) => INTUITION_TOOL_SLUGS.includes(slugById.get(e.tool_id) || "")),
    [entries, slugById],
  );

  const { data: quizResultTitle } = useQuery({
    queryKey: ["intuition-quiz-result", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: q } = await supabase.from("quizzes").select("id").eq("slug", INTUITION_QUIZ_SLUG).maybeSingle();
      if (!q) return null;
      const { data: r } = await supabase
        .from("quiz_responses").select("result_id").eq("quiz_id", q.id).eq("user_id", userId!)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!r?.result_id) return null;
      const { data: res } = await supabase.from("quiz_results").select("title").eq("id", r.result_id).maybeSingle();
      return res?.title ?? null;
    },
  });

  const stats = useMemo(() => {
    const byClair = new Map<ClairKey, number>();
    const signs = new Map<string, number>();
    const words = new Map<string, number>();
    const places = new Map<string, number>();
    let claritySum = 0;
    let clarityCount = 0;

    intuitionEntries.forEach((e) => {
      const a = e.answers_json || {};
      const clair = clairForEntry(slugById.get(e.tool_id), a);
      if (clair) byClair.set(clair, (byClair.get(clair) || 0) + 1);
      asList(a.sign_type).forEach((s) => signs.set(s, (signs.get(s) || 0) + 1));
      const place = String(a.location || "").trim().toLowerCase();
      if (place) places.set(place, (places.get(place) || 0) + 1);
      const text = `${a.description || ""} ${a.revelation || ""} ${a.context || ""}`.toLowerCase();
      new Set(text.match(/[a-z']{3,}/g) || []).forEach((w) => {
        if (!STOPWORDS.has(w)) words.set(w, (words.get(w) || 0) + 1);
      });
      if (typeof a.clarity === "number") { claritySum += a.clarity; clarityCount += 1; }
    });

    const repeatedWords = topN(words, 12).filter(([, c]) => c > 1);
    return {
      byClair,
      topSigns: topN(signs, 8),
      themes: repeatedWords,
      places: topN(places, 5),
      avgClarity: clarityCount ? claritySum / clarityCount : null,
    };
  }, [intuitionEntries, slugById]);

  const total = intuitionEntries.length;
  const maxClair = Math.max(1, ...CLAIRS.map((c) => stats.byClair.get(c.key) || 0));
  const practised = CLAIRS.reduce<{ key: ClairKey; n: number } | null>((best, c) => {
    const n = stats.byClair.get(c.key) || 0;
    return n > 0 && (!best || n > best.n) ? { key: c.key, n } : best;
  }, null);
  const quizClair = CLAIRS.find((c) => c.key === clairFromText(quizResultTitle));
  const practisedClair = CLAIRS.find((c) => c.key === practised?.key);
  const recent = intuitionEntries.slice(0, 5);

  return (
    <section aria-labelledby="signs-dashboard-heading" className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 id="signs-dashboard-heading" className="font-serif text-3xl text-foreground">Signs &amp; Signals</h2>
          <p className="mt-1 max-w-xl text-sm italic text-muted-foreground">
            What your intuition has been showing you — the Clairs you use most, and the themes that keep returning.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to={`/tools/${TALLY_SLUG}/new`}><Plus className="mr-2 h-4 w-4" />Log a sign</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="space-y-1 p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Quiz result</p>
            <p className="font-serif text-xl text-primary">{quizClair ? `${quizClair.name}` : "Not taken yet"}</p>
            <p className="text-xs text-muted-foreground">{quizClair ? quizClair.sense : "Take it in The Intuition Builder course"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Showing up most</p>
            <p className="font-serif text-xl text-primary">{practisedClair ? practisedClair.name : "—"}</p>
            <p className="text-xs text-muted-foreground">
              {practisedClair
                ? quizClair && quizClair.key !== practisedClair.key
                  ? `Different from your quiz — you may be using more than one language`
                  : `${practised!.n} sign${practised!.n === 1 ? "" : "s"} logged`
                : "Log a few signs to see this"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Signs logged</p>
            <p className="font-serif text-xl text-primary">{total}</p>
            <p className="text-xs text-muted-foreground">
              {stats.avgClarity !== null ? `Average clarity ${stats.avgClarity.toFixed(1)} / 10` : "Across all six trackers"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="font-serif text-lg">Your Clairs</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {CLAIRS.map((c) => {
              const n = stats.byClair.get(c.key) || 0;
              return (
                <Link key={c.key} to={`/tools/${c.trackerSlug}/new`} className="group block" aria-label={`Log a ${c.sense} sign`}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-foreground group-hover:text-primary">
                      <Icon name={c.icon} className="h-4 w-4 text-primary" />
                      {c.name} <span className="text-muted-foreground">· {c.sense}</span>
                    </span>
                    <span className="text-muted-foreground">{n}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(n / maxClair) * 100}%` }} />
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="font-serif text-lg">Recurring signs</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {stats.topSigns.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">The kinds of signs you log will gather here.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {stats.topSigns.map(([s, n]) => (
                  <Badge key={s} variant="secondary" className="px-3 py-1">{s} · {n}</Badge>
                ))}
              </div>
            )}
            <div>
              <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Common themes in your words</p>
              {stats.themes.length === 0 ? (
                <p className="text-sm italic text-muted-foreground">Themes appear once the same words show up in more than one sign.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {stats.themes.map(([w, n]) => (
                    <Badge key={w} variant="outline" className="border-primary/40 px-3 py-1 text-primary">{w} · {n}</Badge>
                  ))}
                </div>
              )}
            </div>
            {stats.places.length > 0 && (
              <div>
                <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Where signs find you</p>
                <div className="flex flex-wrap gap-2">
                  {stats.places.map(([p, n]) => (
                    <Badge key={p} variant="outline" className="px-3 py-1 capitalize">{p} · {n}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {recent.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="font-serif text-lg">Latest signs</CardTitle></CardHeader>
          <CardContent className="divide-y divide-border">
            {recent.map((e) => {
              const a = e.answers_json || {};
              const clair = CLAIRS.find((c) => c.key === clairForEntry(slugById.get(e.tool_id), a));
              return (
                <div key={e.id} className="flex items-start gap-3 py-3">
                  <Icon name={clair?.icon || "Sparkles"} className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm text-foreground">{String(a.description || "—")}</p>
                    <p className="text-xs text-muted-foreground">
                      {clair ? clair.sense : "Sign"} · {new Date(e.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                      {a.location ? ` · ${a.location}` : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
