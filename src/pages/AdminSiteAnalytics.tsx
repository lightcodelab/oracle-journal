import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import ProfileDropdown from "@/components/ProfileDropdown";
import PageBreadcrumb from "@/components/PageBreadcrumb";

type Row = Record<string, string | number | null>;
interface Stats {
  totals: Record<string, number | null>;
  top_pages: Row[]; doors: Row[]; focus: Row[]; hours: Row[]; weekdays: Row[];
  regions: Row[]; timezones: Row[]; devices: Row[]; os: Row[]; browsers: Row[];
  journeys: Row[]; exits: Row[]; searches: Row[]; empty_searches: Row[]; avatars: Row[];
}

const RANGES = [{ label: "Last 7 days", days: 7 }, { label: "Last 30 days", days: 30 }, { label: "Last 90 days", days: 90 }];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const n = (v: unknown) => Number(v ?? 0);

function Bars({ rows, label, value }: { rows: Row[]; label: (r: Row) => string; value: string }) {
  const max = Math.max(1, ...rows.map((r) => n(r[value])));
  if (!rows.length) return <p className="text-sm text-muted-foreground">No data yet.</p>;
  return (
    <ul className="space-y-2">
      {rows.map((r, i) => (
        <li key={i} className="text-sm">
          <div className="flex justify-between gap-2"><span className="truncate">{label(r)}</span><span className="text-muted-foreground">{n(r[value])}</span></div>
          <div className="h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${(n(r[value]) / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle className="font-serif text-lg">{title}</CardTitle>{desc && <CardDescription>{desc}</CardDescription>}</CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function SimpleTable({ rows, cols }: { rows: Row[]; cols: [string, string][] }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">No data yet.</p>;
  return (
    <Table>
      <TableHeader><TableRow>{cols.map(([, h]) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
      <TableBody>{rows.map((r, i) => <TableRow key={i}>{cols.map(([k]) => <TableCell key={k} className="max-w-xs truncate">{r[k] ?? "—"}</TableCell>)}</TableRow>)}</TableBody>
    </Table>
  );
}

const AdminSiteAnalytics = () => {
  const { user, isAdmin, loading: baseLoading, rolesLoading } = useAuth();
  const authLoading = baseLoading || rolesLoading;
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (!authLoading && (!user || !isAdmin)) navigate("/"); }, [authLoading, user, isAdmin, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_site_analytics", {
      _from: new Date(Date.now() - days * 86400000).toISOString(), _to: new Date().toISOString(),
    });
    if (error) setError(error.message); else { setError(null); setStats(data as unknown as Stats); }
    setLoading(false);
  }, [days]);

  useEffect(() => { if (user && isAdmin) void load(); }, [user, isAdmin, load]);

  if (authLoading || (loading && !stats)) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const t = stats?.totals ?? {};
  const hours = Array.from({ length: 24 }, (_, h) => ({ h, views: n(stats?.hours.find((r) => n(r.hr) === h)?.views) }));
  const maxHour = Math.max(1, ...hours.map((h) => h.views));
  const summary = [
    ["Page views", t.page_views], ["Visits", t.sessions], ["Members active", t.members],
    ["Pages per visit", t.avg_pages], ["Minutes per visit", t.avg_minutes], ["Days active per member", t.avg_visit_days],
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-serif text-xl md:text-2xl text-foreground">Member Analytics</h1>
          <ProfileDropdown />
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <PageBreadcrumb items={[{ label: "Admin", href: "/admin" }, { label: "Member Analytics" }]} />
        <div className="flex flex-wrap items-center gap-2">
          {RANGES.map((r) => <Button key={r.days} size="sm" variant={days === r.days ? "default" : "outline"} onClick={() => setDays(r.days)}>{r.label}</Button>)}
          <Button size="sm" variant="ghost" onClick={() => void load()} disabled={loading} aria-label="Refresh analytics"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
        </div>
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 mt-0.5 text-primary shrink-0" />
          Group patterns only — no individual member is shown. Location comes from each visitor's time zone and language setting, never their IP address. Times are in the visitor's own local time. Admin pages are not counted.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {summary.map(([l, v]) => (
            <Card key={l as string}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{l}</p><p className="text-2xl font-serif text-foreground">{v ?? "—"}</p></CardContent></Card>
          ))}
        </div>

        <Section title="Most accessed resources & pages">
          <SimpleTable rows={stats?.top_pages ?? []} cols={[["title", "Page"], ["path", "Address"], ["door", "Door"], ["views", "Views"], ["people", "People"]]} />
        </Section>

        <Section title="Time of day" desc="Visitor's local time">
          <div className="flex items-end gap-1 h-32">
            {hours.map((h) => (
              <div key={h.h} className="flex-1 flex flex-col items-center gap-1" title={`${h.h}:00 — ${h.views} views`}>
                <div className="w-full rounded-t bg-primary" style={{ height: `${(h.views / maxHour) * 100}%`, minHeight: h.views ? 2 : 0 }} />
                <span className="text-[10px] text-muted-foreground">{h.h % 3 === 0 ? h.h : ""}</span>
              </div>
            ))}
          </div>
        </Section>

        <div className="grid md:grid-cols-3 gap-6">
          <Section title="Days of the week"><Bars rows={(stats?.weekdays ?? [])} label={(r) => DAYS[n(r.dw)]} value="views" /></Section>
          <Section title="Countries / regions" desc="From language settings"><Bars rows={stats?.regions ?? []} label={(r) => String(r.region)} value="sessions" /></Section>
          <Section title="Time zones"><Bars rows={stats?.timezones ?? []} label={(r) => String(r.timezone)} value="sessions" /></Section>
          <Section title="Devices"><Bars rows={stats?.devices ?? []} label={(r) => String(r.device)} value="sessions" /></Section>
          <Section title="Operating systems"><Bars rows={stats?.os ?? []} label={(r) => String(r.os)} value="sessions" /></Section>
          <Section title="Browsers"><Bars rows={stats?.browsers ?? []} label={(r) => String(r.browser)} value="sessions" /></Section>
          <Section title="Doors visited"><Bars rows={stats?.doors ?? []} label={(r) => String(r.door)} value="views" /></Section>
          <Section title="Members' chosen focus" desc="All members, all time"><Bars rows={stats?.focus ?? []} label={(r) => String(r.focus)} value="members" /></Section>
          <Section title="Where visits end"><Bars rows={stats?.exits ?? []} label={(r) => String(r.path)} value="sessions" /></Section>
        </div>

        <Section title="Member avatars" desc="Groups of 3 or more members sharing the same focus, device, time of day and favourite Door">
          <SimpleTable rows={stats?.avatars ?? []} cols={[["focus", "Focus"], ["door", "Favourite Door"], ["device", "Device"], ["daypart", "Usually visits"], ["members", "Members"]]} />
        </Section>

        <Section title="Common journeys" desc="Which page members go to next">
          <SimpleTable rows={stats?.journeys ?? []} cols={[["from_path", "From"], ["to_path", "To"], ["times", "Times"]]} />
        </Section>

        <div className="grid md:grid-cols-2 gap-6">
          <Section title="Top searches"><SimpleTable rows={stats?.searches ?? []} cols={[["query", "Search"], ["times", "Times"], ["avg_results", "Avg results"]]} /></Section>
          <Section title="Searches that found nothing" desc="Ideas for new content"><SimpleTable rows={stats?.empty_searches ?? []} cols={[["query", "Search"], ["times", "Times"]]} /></Section>
        </div>
      </div>
    </div>
  );
};

export default AdminSiteAnalytics;
