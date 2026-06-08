import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as Icons from "lucide-react";
import { Sparkles, Plus, LineChart as LineIcon, CalendarDays } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  useTransformationTools,
  useAllUserEntries,
  TransformationTool,
  TransformationEntry,
} from "@/hooks/useTransformationTools";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import ProfileDropdown from "@/components/ProfileDropdown";

const Icon = ({ name, className }: { name: string | null; className?: string }) => {
  const C = (Icons as any)[name || "Sparkles"] || Sparkles;
  return <C className={className} />;
};

const palette = [
  "hsl(var(--primary))",
  "#d4a574",
  "#a37bbf",
  "#7bb7a3",
  "#c97b7b",
  "#b39c5a",
  "#7b9cc9",
  "#c97bb3",
  "#5ab39c",
];

const MyTracking = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: tools = [] } = useTransformationTools();
  const { data: entries = [] } = useAllUserEntries(user?.id, 500);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [detailEntry, setDetailEntry] = useState<TransformationEntry | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  const toolById = useMemo(() => {
    const m = new Map<string, TransformationTool>();
    tools.forEach((t) => m.set(t.id, t));
    return m;
  }, [tools]);

  const usedTools = useMemo(
    () => tools.filter((t) => entries.some((e) => e.tool_id === t.id)),
    [tools, entries],
  );

  const stats = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
    return {
      total: entries.length,
      week: entries.filter((e) => new Date(e.created_at).getTime() >= weekAgo).length,
      month: entries.filter((e) => new Date(e.created_at).getTime() >= monthAgo).length,
      tools: usedTools.length,
    };
  }, [entries, usedTools]);

  // Combined chart: each tool is its own series, x = date
  const combined = useMemo(() => {
    const byDate: Record<string, any> = {};
    [...entries].reverse().forEach((e) => {
      if (typeof e.scores_json?.primary !== "number") return;
      const d = new Date(e.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      const t = toolById.get(e.tool_id);
      if (!t) return;
      byDate[d] = byDate[d] || { date: d };
      byDate[d][t.title] = e.scores_json.primary;
    });
    return Object.values(byDate);
  }, [entries, toolById]);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <PageBreadcrumb items={[{ label: "My Tracking" }]} />
        <ProfileDropdown />
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="font-serif text-4xl md:text-5xl text-foreground">My Tracking</h1>
            <p className="text-muted-foreground italic mt-2 max-w-xl">
              A living record of what you are noticing. Trends, not verdicts.
            </p>
          </div>
          <Button size="lg" onClick={() => setPickerOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Reflection
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total entries", value: stats.total },
            { label: "This week", value: stats.week },
            { label: "This month", value: stats.month },
            { label: "Tools used", value: stats.tools },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">{s.label}</p>
                <p className="font-serif text-3xl mt-1">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="trends">
          <TabsList>
            <TabsTrigger value="trends"><LineIcon className="w-4 h-4 mr-2" /> Trends</TabsTrigger>
            <TabsTrigger value="entries"><CalendarDays className="w-4 h-4 mr-2" /> Entries</TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="space-y-6 pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-xl">All tools — overall scores</CardTitle>
              </CardHeader>
              <CardContent>
                {combined.length < 2 ? (
                  <p className="text-sm text-muted-foreground italic">
                    Save a few more reflections to see your trends here.
                  </p>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer>
                      <LineChart data={combined} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                        <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        {usedTools.map((t, i) => (
                          <Line
                            key={t.id}
                            type="monotone"
                            dataKey={t.title}
                            stroke={palette[i % palette.length]}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            connectNulls
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              {usedTools.map((t) => {
                const toolEntries = entries.filter((e) => e.tool_id === t.id).slice(0, 8).reverse();
                const data = toolEntries
                  .filter((e) => typeof e.scores_json?.primary === "number")
                  .map((e) => ({
                    date: new Date(e.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
                    value: e.scores_json!.primary as number,
                  }));
                return (
                  <Card key={t.id} className="cursor-pointer hover:border-primary/40 transition" onClick={() => navigate(`/tools/${t.slug}`)}>
                    <CardHeader className="flex flex-row items-center gap-3 pb-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon name={t.icon_name} className="w-4 h-4 text-primary" />
                      </div>
                      <CardTitle className="font-serif text-base flex-1">{t.title}</CardTitle>
                      <Badge variant="secondary">{entries.filter((e) => e.tool_id === t.id).length}</Badge>
                    </CardHeader>
                    <CardContent>
                      {data.length < 2 ? (
                        <p className="text-xs text-muted-foreground italic">Not enough data yet.</p>
                      ) : (
                        <div className="h-32 w-full">
                          <ResponsiveContainer>
                            <LineChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                              <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                              <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="entries" className="pt-4">
            {entries.length === 0 ? (
              <Card>
                <CardContent className="p-10 text-center space-y-4">
                  <p className="text-muted-foreground italic">
                    Nothing logged yet. Begin with a reflection when you're ready.
                  </p>
                  <Button onClick={() => setPickerOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" /> New Reflection
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {entries.map((e) => {
                  const t = toolById.get(e.tool_id);
                  return (
                    <Card
                      key={e.id}
                      className="cursor-pointer hover:border-primary/40 transition"
                      onClick={() => setDetailEntry(e)}
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon name={t?.icon_name || "Sparkles"} className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-serif text-base truncate">{t?.title || "Tool"}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(e.created_at).toLocaleString(undefined, {
                              weekday: "short", month: "short", day: "numeric",
                              year: "numeric", hour: "numeric", minute: "2-digit",
                            })}
                          </p>
                        </div>
                        {typeof e.scores_json?.primary === "number" && (
                          <Badge variant="outline" className="font-serif text-base">
                            {Number(e.scores_json.primary).toFixed(1)}
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Tool picker dialog */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Choose a tool</DialogTitle>
            <DialogDescription>Which reflection would you like to log?</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 sm:grid-cols-2 max-h-[60vh] overflow-y-auto pr-1">
            {tools.map((t) => (
              <button
                key={t.id}
                onClick={() => { setPickerOpen(false); navigate(`/tools/${t.slug}/new`); }}
                className="text-left p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition flex items-start gap-3"
              >
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <Icon name={t.icon_name} className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-serif text-base">{t.title}</p>
                  {t.short_description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{t.short_description}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Entry detail dialog */}
      <Dialog open={!!detailEntry} onOpenChange={(o) => !o && setDetailEntry(null)}>
        <DialogContent className="max-w-2xl">
          {detailEntry && (() => {
            const t = toolById.get(detailEntry.tool_id);
            const answers = detailEntry.answers_json || {};
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="font-serif text-2xl flex items-center gap-2">
                    <Icon name={t?.icon_name || "Sparkles"} className="w-5 h-5 text-primary" />
                    {t?.title || "Reflection"}
                  </DialogTitle>
                  <DialogDescription>
                    {new Date(detailEntry.created_at).toLocaleString(undefined, {
                      weekday: "long", month: "long", day: "numeric",
                      year: "numeric", hour: "numeric", minute: "2-digit",
                    })}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                  {typeof detailEntry.scores_json?.primary === "number" && (
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">Score</p>
                      <p className="font-serif text-2xl">{Number(detailEntry.scores_json.primary).toFixed(1)}</p>
                    </div>
                  )}
                  {Object.entries(answers).map(([k, v]) => (
                    <div key={k} className="border-b border-border/50 pb-2 last:border-0">
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">
                        {k.replace(/_/g, " ")}
                      </p>
                      <p className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap">
                        {Array.isArray(v) ? v.join(", ") : String(v ?? "—")}
                      </p>
                    </div>
                  ))}
                </div>
                {t && (
                  <div className="flex justify-end pt-2">
                    <Button variant="outline" onClick={() => { setDetailEntry(null); navigate(`/tools/${t.slug}`); }}>
                      Open tool
                    </Button>
                  </div>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyTracking;