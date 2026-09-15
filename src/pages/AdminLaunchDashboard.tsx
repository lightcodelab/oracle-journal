import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ProfileDropdown from "@/components/ProfileDropdown";
import PageBreadcrumb from "@/components/PageBreadcrumb";

interface LaunchStats {
  funnel: Record<string, number>;
  unique_visitors: number;
  signups: number;
  paying_members: number;
  payments: { count: number; revenue_cents: number; currency: string };
  plan_mix: { plan_code: string | null; cadence: string | null; count: number }[];
  daily: {
    day: string;
    views: number;
    cta_clicks: number;
    checkouts_started: number;
    signups: number;
    payments: number;
    revenue_cents: number;
  }[];
  sources: { source: string; views: number; checkouts_started: number }[];
  affiliates: { code: string; display_name: string | null; signups: number; conversions: number }[];
  recent_signups: {
    id: string;
    email: string | null;
    full_name: string | null;
    created_at: string;
    has_membership: boolean;
  }[];
}

const RANGES = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

const money = (cents: number, currency = "AUD") =>
  `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })} ${currency.toUpperCase()}`;

const pct = (part: number, whole: number) =>
  whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : "—";

const AdminLaunchDashboard = () => {
  const { user, isAdmin, loading: baseAuthLoading, rolesLoading } = useAuth();
  const authLoading = baseAuthLoading || rolesLoading;
  const navigate = useNavigate();
  const { toast } = useToast();
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<LaunchStats | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate("/");
  }, [authLoading, user, isAdmin, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    const from = new Date(Date.now() - days * 86400000).toISOString();
    const { data, error } = await supabase.rpc("admin_launch_stats", {
      _from: from,
      _to: new Date().toISOString(),
    });
    if (error) {
      toast({ title: "Could not load launch stats", description: error.message, variant: "destructive" });
    } else {
      setStats(data as unknown as LaunchStats);
    }
    setLoading(false);
  }, [days, toast]);

  useEffect(() => {
    if (user && isAdmin) void load();
  }, [user, isAdmin, load]);

  if (authLoading || (loading && !stats)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const funnel = stats?.funnel ?? {};
  const views = funnel["sales_page_view"] ?? 0;
  const ctaClicks =
    (funnel["hero_enter_temple_clicked"] ?? 0) +
    (funnel["midpage_enter_temple_clicked"] ?? 0) +
    (funnel["final_enter_temple_clicked"] ?? 0);
  const checkoutsStarted = funnel["membership_checkout_started"] ?? 0;
  const signups = stats?.signups ?? 0;
  const payments = stats?.payments?.count ?? 0;

  const summary = [
    { label: "Sales page visits", value: views.toLocaleString(), note: `${(stats?.unique_visitors ?? 0).toLocaleString()} unique sessions` },
    { label: "Sign-up button clicks", value: ctaClicks.toLocaleString(), note: `${pct(ctaClicks, views)} of visits` },
    { label: "Checkouts started", value: checkoutsStarted.toLocaleString(), note: `${pct(checkoutsStarted, ctaClicks)} of clicks` },
    { label: "New accounts", value: signups.toLocaleString(), note: `${pct(signups, views)} of visits` },
    { label: "Payments received", value: payments.toLocaleString(), note: `${pct(payments, signups)} of new accounts` },
    {
      label: "Revenue",
      value: money(stats?.payments?.revenue_cents ?? 0, stats?.payments?.currency ?? "AUD"),
      note: `${stats?.paying_members ?? 0} active memberships`,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-serif text-xl md:text-2xl text-foreground">Launch Dashboard</h1>
          <ProfileDropdown />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <PageBreadcrumb items={[{ label: "Admin", href: "/admin" }, { label: "Launch Dashboard" }]} />

        <div className="flex flex-wrap items-center gap-2">
          {RANGES.map((r) => (
            <Button
              key={r.days}
              size="sm"
              variant={days === r.days ? "default" : "outline"}
              onClick={() => setDays(r.days)}
            >
              {r.label}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => void load()} disabled={loading} aria-label="Refresh launch stats">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <section aria-labelledby="summary-heading" className="space-y-3">
          <h2 id="summary-heading" className="font-serif text-lg text-foreground">How the launch is going</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {summary.map((s) => (
              <Card key={s.label}>
                <CardHeader className="pb-2">
                  <CardDescription>{s.label}</CardDescription>
                  <CardTitle className="text-3xl font-serif">{s.value}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{s.note}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section aria-labelledby="daily-heading" className="space-y-3">
          <h2 id="daily-heading" className="font-serif text-lg text-foreground">Day by day</h2>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Day</TableHead>
                    <TableHead className="text-right">Visits</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">Checkouts</TableHead>
                    <TableHead className="text-right">Accounts</TableHead>
                    <TableHead className="text-right">Payments</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...(stats?.daily ?? [])].reverse().map((d) => (
                    <TableRow key={d.day}>
                      <TableCell>{new Date(d.day).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">{d.views}</TableCell>
                      <TableCell className="text-right">{d.cta_clicks}</TableCell>
                      <TableCell className="text-right">{d.checkouts_started}</TableCell>
                      <TableCell className="text-right">{d.signups}</TableCell>
                      <TableCell className="text-right">{d.payments}</TableCell>
                      <TableCell className="text-right">{money(d.revenue_cents)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section aria-labelledby="sources-heading" className="space-y-3">
            <h2 id="sources-heading" className="font-serif text-lg text-foreground">Where visitors came from</h2>
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Visits</TableHead>
                      <TableHead className="text-right">Checkouts</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(stats?.sources ?? []).length === 0 && (
                      <TableRow><TableCell colSpan={3} className="text-muted-foreground">No visits recorded yet.</TableCell></TableRow>
                    )}
                    {(stats?.sources ?? []).map((s) => (
                      <TableRow key={s.source}>
                        <TableCell>{s.source}</TableCell>
                        <TableCell className="text-right">{s.views}</TableCell>
                        <TableCell className="text-right">{s.checkouts_started}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </section>

          <section aria-labelledby="affiliates-heading" className="space-y-3">
            <h2 id="affiliates-heading" className="font-serif text-lg text-foreground">Referrals</h2>
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Affiliate</TableHead>
                      <TableHead className="text-right">Sign-ups</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(stats?.affiliates ?? []).length === 0 && (
                      <TableRow><TableCell colSpan={3} className="text-muted-foreground">No referred sign-ups yet.</TableCell></TableRow>
                    )}
                    {(stats?.affiliates ?? []).map((a) => (
                      <TableRow key={a.code}>
                        <TableCell>{a.display_name || a.code}</TableCell>
                        <TableCell className="text-right">{a.signups}</TableCell>
                        <TableCell className="text-right">{a.conversions}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </section>
        </div>

        <section aria-labelledby="plans-heading" className="space-y-3">
          <h2 id="plans-heading" className="font-serif text-lg text-foreground">Active memberships</h2>
          <div className="flex flex-wrap gap-2">
            {(stats?.plan_mix ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No active memberships yet.</p>
            )}
            {(stats?.plan_mix ?? []).map((p) => (
              <Badge key={`${p.plan_code}-${p.cadence}`} variant="secondary" className="text-sm">
                {(p.plan_code ?? "membership")} · {p.cadence ?? "—"} · {p.count}
              </Badge>
            ))}
          </div>
        </section>

        <section aria-labelledby="recent-heading" className="space-y-3">
          <h2 id="recent-heading" className="font-serif text-lg text-foreground">Newest sign-ups</h2>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Membership</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(stats?.recent_signups ?? []).map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.full_name || "—"}</TableCell>
                      <TableCell>{s.email || "—"}</TableCell>
                      <TableCell>{new Date(s.created_at).toLocaleString()}</TableCell>
                      <TableCell>
                        {s.has_membership ? (
                          <Badge>Active</Badge>
                        ) : (
                          <Badge variant="outline">No payment yet</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default AdminLaunchDashboard;
