import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Copy, Plus, Loader2, DollarSign, MousePointerClick, Users, TrendingUp } from "lucide-react";
import ProfileDropdown from "@/components/ProfileDropdown";
import PageBreadcrumb from "@/components/PageBreadcrumb";

type Affiliate = {
  id: string;
  status: string;
  referral_code: string;
  display_name: string | null;
  payout_email: string | null;
  payout_method: string;
  commission_signup_pct: number | null;
  commission_recurring_pct: number | null;
  terms_accepted_at: string | null;
};

type AffiliateLink = {
  id: string;
  code: string;
  label: string | null;
  commission_model: "one_time" | "recurring";
  destination_path: string;
  clicks: number;
};

const randomCode = (len = 6) =>
  Array.from({ length: len }, () =>
    "abcdefghjkmnpqrstuvwxyz23456789"[Math.floor(Math.random() * 31)]
  ).join("");

const AffiliatePortal = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [referralCount, setReferralCount] = useState(0);
  const [stats, setStats] = useState({ pending: 0, approved: 0, paid: 0 });
  const [settings, setSettings] = useState<{
    default_signup_pct: number;
    default_recurring_pct: number;
    min_payout_cents: number;
    currency: string;
    terms_md: string | null;
  } | null>(null);

  // Application form
  const [applyName, setApplyName] = useState("");
  const [applyEmail, setApplyEmail] = useState("");
  const [applyNotes, setApplyNotes] = useState("");
  const [applyModel, setApplyModel] = useState<"one_time" | "recurring">("recurring");
  const [applyWebsite, setApplyWebsite] = useState("");
  const [applyInstagram, setApplyInstagram] = useState("");
  const [applyTiktok, setApplyTiktok] = useState("");
  const [applyFacebook, setApplyFacebook] = useState("");
  const [applyOtherSocial, setApplyOtherSocial] = useState("");
  const [applyAudience, setApplyAudience] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // New link form
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkModel, setNewLinkModel] = useState<"one_time" | "recurring">("recurring");
  const [newLinkPath, setNewLinkPath] = useState("/");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: aff }, { data: set }] = await Promise.all([
      supabase.from("affiliates").select("*").eq("user_id", user!.id).maybeSingle(),
      supabase.from("affiliate_settings").select("*").eq("id", 1).maybeSingle(),
    ]);
    setAffiliate((aff as Affiliate) ?? null);
    setSettings(set as any);

    if (aff) {
      const [{ data: ls }, { count }, { data: cs }] = await Promise.all([
        supabase.from("affiliate_links").select("*").eq("affiliate_id", aff.id).order("created_at", { ascending: false }),
        supabase.from("affiliate_referrals").select("*", { count: "exact", head: true }).eq("affiliate_id", aff.id),
        supabase.from("affiliate_commissions").select("amount_cents, status").eq("affiliate_id", aff.id),
      ]);
      setLinks((ls as AffiliateLink[]) ?? []);
      setReferralCount(count ?? 0);
      const agg = { pending: 0, approved: 0, paid: 0 };
      (cs ?? []).forEach((c: any) => {
        if (c.status === "pending") agg.pending += c.amount_cents;
        if (c.status === "approved") agg.approved += c.amount_cents;
        if (c.status === "paid") agg.paid += c.amount_cents;
      });
      setStats(agg);
    }
    setLoading(false);
  };

  const apply = async () => {
    if (!user) return;
    if (!applyName.trim() || !applyEmail.trim()) {
      toast({ title: "Required fields missing", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      // Generate unique-ish code
      const base = applyName.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 12) || randomCode(8);
      const code = `${base}-${randomCode(4)}`;
      const { error } = await supabase.from("affiliates").insert({
        user_id: user.id,
        display_name: applyName.trim(),
        payout_email: applyEmail.trim(),
        referral_code: code,
        notes: applyNotes.trim() || null,
        terms_accepted_at: new Date().toISOString(),
        commission_signup_pct: applyModel === "one_time" ? 40 : 0,
        commission_recurring_pct: applyModel === "recurring" ? 10 : 0,
        website_url: applyWebsite.trim() || null,
        instagram_handle: applyInstagram.trim() || null,
        tiktok_handle: applyTiktok.trim() || null,
        facebook_handle: applyFacebook.trim() || null,
        other_social: applyOtherSocial.trim() || null,
        audience_characteristics: applyAudience.trim() || null,
      });
      if (error) throw error;
      toast({ title: "Application submitted", description: "An admin will review your affiliate application shortly." });
      await loadAll();
    } catch (e: any) {
      toast({ title: "Failed to apply", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const createLink = async () => {
    if (!affiliate) return;
    const code = `${affiliate.referral_code}-${randomCode(4)}`;
    const { error } = await supabase.from("affiliate_links").insert({
      affiliate_id: affiliate.id,
      code,
      label: newLinkLabel.trim() || null,
      commission_model: newLinkModel,
      destination_path: newLinkPath.trim() || "/",
    });
    if (error) {
      toast({ title: "Could not create link", description: error.message, variant: "destructive" });
      return;
    }
    setNewLinkLabel("");
    setNewLinkPath("/");
    await loadAll();
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied" });
  };

  const linkUrl = (code: string) => `${window.location.origin}/r/${code}`;
  const cents = (c: number) =>
    `$${(c / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <PageBreadcrumb items={[{ label: "Affiliate Program" }]} />
        <ProfileDropdown />
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-8">
        <header>
          <h1 className="text-3xl font-serif text-foreground">Affiliate Program</h1>
          <p className="text-muted-foreground mt-1">
            Share the Temple and earn commission on every member you bring in.
          </p>
        </header>

        {!affiliate && (
          <Card>
            <CardHeader>
              <CardTitle>Apply to become an affiliate</CardTitle>
              <CardDescription>
                {settings && (
                  <>
                    Default commission: <strong>{settings.default_signup_pct}%</strong> on signup or{" "}
                    <strong>{settings.default_recurring_pct}%</strong> recurring. Minimum payout{" "}
                    {cents(settings.min_payout_cents)} {settings.currency.toUpperCase()}.
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings?.terms_md && (
                <div className="text-sm bg-muted/40 p-3 rounded whitespace-pre-wrap">{settings.terms_md}</div>
              )}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>Display name</Label>
                  <Input value={applyName} onChange={(e) => setApplyName(e.target.value)} maxLength={80} />
                </div>
                <div>
                  <Label>Payout email</Label>
                  <Input type="email" value={applyEmail} onChange={(e) => setApplyEmail(e.target.value)} maxLength={255} />
                </div>
              </div>
              <div>
                <Label>Commission model</Label>
                <Select value={applyModel} onValueChange={(v: any) => setApplyModel(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">40% on initial signup only</SelectItem>
                    <SelectItem value="recurring">10% recurring for the lifetime of the subscriber</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  This sets your default. Admins may adjust rates and you can still create per-link overrides later.
                </p>
              </div>
              <div>
                <Label>How will you promote the Temple? (optional)</Label>
                <Textarea value={applyNotes} onChange={(e) => setApplyNotes(e.target.value)} maxLength={1000} />
              </div>
              <div>
                <Label>Website URL</Label>
                <Input
                  type="url"
                  placeholder="https://"
                  value={applyWebsite}
                  onChange={(e) => setApplyWebsite(e.target.value)}
                  maxLength={255}
                />
              </div>
              <div className="space-y-3 pt-2">
                <h3 className="font-serif text-lg text-foreground">Social media accounts</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Instagram @</Label>
                    <Input
                      placeholder="@yourhandle"
                      value={applyInstagram}
                      onChange={(e) => setApplyInstagram(e.target.value)}
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <Label>TikTok @</Label>
                    <Input
                      placeholder="@yourhandle"
                      value={applyTiktok}
                      onChange={(e) => setApplyTiktok(e.target.value)}
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <Label>Facebook @</Label>
                    <Input
                      placeholder="@yourhandle or page name"
                      value={applyFacebook}
                      onChange={(e) => setApplyFacebook(e.target.value)}
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <Label>Other</Label>
                    <Input
                      placeholder="YouTube, Substack, podcast, etc."
                      value={applyOtherSocial}
                      onChange={(e) => setApplyOtherSocial(e.target.value)}
                      maxLength={255}
                    />
                  </div>
                </div>
              </div>
              <div>
                <Label>Your audience characteristics</Label>
                <Textarea
                  placeholder="Who follows you? Size, demographics, interests, why they'd resonate with the Temple…"
                  value={applyAudience}
                  onChange={(e) => setApplyAudience(e.target.value)}
                  maxLength={1000}
                />
              </div>
              <Button onClick={apply} disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Submit application
              </Button>
            </CardContent>
          </Card>
        )}

        {affiliate && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Your status</CardTitle>
                  <CardDescription>Referral code: {affiliate.referral_code}</CardDescription>
                </div>
                <Badge
                  variant={affiliate.status === "active" ? "default" : "secondary"}
                  className="capitalize"
                >
                  {affiliate.status}
                </Badge>
              </CardHeader>
              <CardContent>
                {affiliate.status === "pending" && (
                  <p className="text-sm text-muted-foreground">
                    Your application is awaiting review. You'll be notified once approved.
                  </p>
                )}
                {affiliate.status === "active" && (
                  <div className="grid sm:grid-cols-4 gap-4">
                    <StatTile icon={MousePointerClick} label="Total clicks" value={links.reduce((a, b) => a + b.clicks, 0).toString()} />
                    <StatTile icon={Users} label="Referrals" value={referralCount.toString()} />
                    <StatTile icon={TrendingUp} label="Approved" value={cents(stats.approved + stats.pending)} />
                    <StatTile icon={DollarSign} label="Paid out" value={cents(stats.paid)} />
                  </div>
                )}
              </CardContent>
            </Card>

            {affiliate.status === "active" && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Your referral links</CardTitle>
                    <CardDescription>
                      Each link locks in the commission model the referrer is paid on.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Default link */}
                    <div className="flex items-center gap-2 p-3 rounded border bg-muted/30">
                      <div className="flex-1 truncate text-sm">{linkUrl(affiliate.referral_code)}</div>
                      <Badge variant="outline">default · recurring</Badge>
                      <Button size="sm" variant="ghost" onClick={() => copy(linkUrl(affiliate.referral_code))}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>

                    {links.map((l) => (
                      <div key={l.id} className="flex items-center gap-2 p-3 rounded border">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">{linkUrl(l.code)}</div>
                          <div className="text-xs text-muted-foreground">
                            {l.label || "—"} · {l.clicks} clicks · → {l.destination_path}
                          </div>
                        </div>
                        <Badge variant="outline">{l.commission_model.replace("_", " ")}</Badge>
                        <Button size="sm" variant="ghost" onClick={() => copy(linkUrl(l.code))}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}

                    <div className="border-t pt-4 space-y-3">
                      <div className="text-sm font-medium">Create new link</div>
                      <div className="grid sm:grid-cols-3 gap-3">
                        <Input
                          placeholder="Label (e.g. Instagram bio)"
                          value={newLinkLabel}
                          onChange={(e) => setNewLinkLabel(e.target.value)}
                          maxLength={80}
                        />
                        <Select value={newLinkModel} onValueChange={(v: any) => setNewLinkModel(v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="recurring">Recurring (% every payment)</SelectItem>
                            <SelectItem value="one_time">One-time (signup only)</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Destination path (/)"
                          value={newLinkPath}
                          onChange={(e) => setNewLinkPath(e.target.value)}
                          maxLength={200}
                        />
                      </div>
                      <Button onClick={createLink} size="sm">
                        <Plus className="w-4 h-4 mr-1" /> Add link
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <CommissionTable affiliateId={affiliate.id} />
                <PayoutsTable affiliateId={affiliate.id} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const StatTile = ({ icon: Icon, label, value }: any) => (
  <div className="rounded-lg border p-4">
    <div className="flex items-center gap-2 text-muted-foreground text-xs">
      <Icon className="w-4 h-4" /> {label}
    </div>
    <div className="mt-1 text-2xl font-semibold">{value}</div>
  </div>
);

const CommissionTable = ({ affiliateId }: { affiliateId: string }) => {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase
      .from("affiliate_commissions")
      .select("*")
      .eq("affiliate_id", affiliateId)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setRows(data ?? []));
  }, [affiliateId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent commissions</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No commissions yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="capitalize">{r.type}</TableCell>
                  <TableCell>${(r.amount_cents / 100).toFixed(2)}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{r.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

const PayoutsTable = ({ affiliateId }: { affiliateId: string }) => {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase
      .from("affiliate_payouts")
      .select("*")
      .eq("affiliate_id", affiliateId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows(data ?? []));
  }, [affiliateId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payouts</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payouts recorded yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>${(r.amount_cents / 100).toFixed(2)}</TableCell>
                  <TableCell className="capitalize">{r.method.replace("_", " ")}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{r.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default AffiliatePortal;