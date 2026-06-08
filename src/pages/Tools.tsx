import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import * as Icons from "lucide-react";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTransformationTools, useAllUserEntries, TransformationTool } from "@/hooks/useTransformationTools";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import ProfileDropdown from "@/components/ProfileDropdown";
import { supabase } from "@/integrations/supabase/client";

const Icon = ({ name, className }: { name: string | null; className?: string }) => {
  const C = (Icons as any)[name || "Sparkles"] || Sparkles;
  return <C className={className} />;
};

const todaysTool = (tools: TransformationTool[], entries: any[]): TransformationTool | undefined => {
  if (!tools.length) return undefined;
  const lastByTool: Record<string, number> = {};
  for (const e of entries) {
    if (!lastByTool[e.tool_id]) lastByTool[e.tool_id] = new Date(e.created_at).getTime();
  }
  const sorted = [...tools].sort((a, b) => (lastByTool[a.id] || 0) - (lastByTool[b.id] || 0));
  return sorted[0];
};

const Tools = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: tools = [], isLoading } = useTransformationTools();
  const { data: entries = [] } = useAllUserEntries(user?.id, 100);
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  useEffect(() => { if (!authLoading && !user) navigate("/auth"); }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user || entries.length < 2) return;
    let cancelled = false;
    (async () => {
      const { data: cache } = await supabase
        .from("transformation_insights_cache").select("*")
        .eq("user_id", user.id).maybeSingle();
      if (cache && new Date((cache as any).expires_at) > new Date()) {
        if (!cancelled) setInsight((cache as any).insight_text);
        return;
      }
      setLoadingInsight(true);
      const { data, error } = await supabase.functions.invoke("generate-transformation-insights");
      if (!cancelled) {
        setLoadingInsight(false);
        if (!error && (data as any)?.insight) setInsight((data as any).insight);
      }
    })();
    return () => { cancelled = true; };
  }, [user, entries.length]);

  const today = todaysTool(tools, entries);
  const recent = entries.slice(0, 3);
  const toolById = (id: string) => tools.find((t) => t.id === id);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <PageBreadcrumb items={[{ label: "Transformation Tools" }]} />
        <ProfileDropdown />
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
          <h1 className="font-serif text-4xl md:text-5xl text-foreground">Transformation Tools</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto italic">
            Guided reflections to track what is becoming true in you. Not forms — returns.
          </p>
        </motion.div>

        {today && (
          <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10"><Icon name={today.icon_name} className="w-6 h-6 text-primary" /></div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Today's reflection</p>
                <CardTitle className="font-serif text-2xl">{today.title}</CardTitle>
              </div>
              <Button onClick={() => navigate(`/tools/${today.slug}/new`)}>Begin</Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/80">{today.when_to_use || today.short_description}</p>
            </CardContent>
          </Card>
        )}

        {recent.length > 0 && (
          <section>
            <h2 className="font-serif text-xl mb-3">Recent entries</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {recent.map((e) => {
                const t = toolById(e.tool_id);
                if (!t) return null;
                return (
                  <Card key={e.id} className="cursor-pointer hover:border-primary/40 transition" onClick={() => navigate(`/tools/${t.slug}`)}>
                    <CardContent className="p-4 space-y-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Icon name={t.icon_name} className="w-3.5 h-3.5" />
                        <span>{t.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</p>
                      {typeof e.scores_json?.primary === "number" && (
                        <p className="font-serif text-lg">Score {Number(e.scores_json.primary).toFixed(1)}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {(insight || loadingInsight) && (
          <Card className="border-dashed">
            <CardHeader><CardTitle className="font-serif text-xl">Pattern Insights</CardTitle></CardHeader>
            <CardContent>
              {loadingInsight ? (
                <p className="text-sm text-muted-foreground italic">Listening to your patterns…</p>
              ) : (
                <p className="font-serif text-base text-foreground/90 whitespace-pre-line leading-relaxed">{insight}</p>
              )}
            </CardContent>
          </Card>
        )}

        <section>
          <h2 className="font-serif text-xl mb-4">All tools</h2>
          {isLoading ? <p className="text-muted-foreground">Loading…</p> : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tools.map((t) => (
                <Card key={t.id} className="cursor-pointer hover:shadow-lg hover:border-primary/40 transition h-full" onClick={() => navigate(`/tools/${t.slug}`)}>
                  <CardHeader className="flex flex-row items-center gap-3 pb-2">
                    <div className="p-2.5 rounded-lg bg-primary/10"><Icon name={t.icon_name} className="w-5 h-5 text-primary" /></div>
                    <CardTitle className="font-serif text-lg">{t.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{t.short_description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Tools;