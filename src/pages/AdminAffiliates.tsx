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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, Settings as SettingsIcon, DollarSign } from "lucide-react";
import ProfileDropdown from "@/components/ProfileDropdown";
import PageBreadcrumb from "@/components/PageBreadcrumb";

const cents = (c: number) =>
  `$${(c / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const AdminAffiliates = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [settings, setSettings] = useState<any | null>(null);

  const [editing, setEditing] = useState<any | null>(null);
  const [payoutDialog, setPayoutDialog] = useState<any | null>(null);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("manual");
  const [payoutRef, setPayoutRef] = useState("");

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate("/");
    }
  }, [authLoading, user, isAdmin, navigate]);

  useEffect(() => {
    if (user && isAdmin) void loadAll();
  }, [user, isAdmin]);

  const loadAll = async () => {
    setLoading(true);
    const [a, c, p, s] = await Promise.all([
      supabase.from("affiliates").select("*").order("created_at", { ascending: false }),
      supabase
        .from("affiliate_commissions")
        .select("*, affiliates!inner(display_name, referral_code)")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("affiliate_payouts")
        .select("*, affiliates!inner(display_name, referral_code)")
        .order("created_at", { ascending: false }),
      supabase.from("affiliate_settings").select("*").eq("id", 1).maybeSingle(),
    ]);
    setAffiliates(a.data ?? []);
    setCommissions(c.data ?? []);
    setPayouts(p.data ?? []);
    setSettings(s.data);
    setLoading(false);
  };

  const setStatus = async (id: string, status: string) => {
    const patch: any = { status };
    if (status === "active") patch.approved_at = new Date().toISOString();
    const { error } = await supabase.from("affiliates").update(patch).eq("id", id);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Affiliate ${status}` });
    await loadAll();
  };

  const saveAffiliate = async () => {
    if (!editing) return;
    const { error } = await supabase
      .from("affiliates")
      .update({
        display_name: editing.display_name,
        payout_email: editing.payout_email,
        payout_method: editing.payout_method,
        commission_signup_pct: editing.commission_signup_pct,
        commission_recurring_pct: editing.commission_recurring_pct,
        notes: editing.notes,
      })
      .eq("id", editing.id);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    setEditing(null);
    await loadAll();
  };

  const saveSettings = async () => {
    if (!settings) return;
    const { error } = await supabase
      .from("affiliate_settings")
      .update({
        default_signup_pct: settings.default_signup_pct,
        default_recurring_pct: settings.default_recurring_pct,
        cookie_window_days: settings.cookie_window_days,
        min_payout_cents: settings.min_payout_cents,
        terms_md: settings.terms_md,
      })
      .eq("id", 1);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Settings saved" });
  };

  const approveCommission = async (id: string, status: string) => {
    const { error } = await supabase.from("affiliate_commissions").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Failed", variant: "destructive" });
      return;
    }
    await loadAll();
  };

  const recordPayout = async () => {
    if (!payoutDialog) return;
    const amount = Math.round(parseFloat(payoutAmount || "0") * 100);
    if (amount <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }
    const { data: payout, error } = await supabase
      .from("affiliate_payouts")
      .insert({
        affiliate_id: payoutDialog.id,
        amount_cents: amount,
        method: payoutMethod,
        reference: payoutRef || null,
        status: "paid",
        paid_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    // Mark eligible approved commissions as paid + link to payout
    await supabase
      .from("affiliate_commissions")
      .update({ status: "paid", payout_id: payout.id })
      .eq("affiliate_id", payoutDialog.id)
      .eq("status", "approved");

    setPayoutDialog(null);
    setPayoutAmount("");
    setPayoutRef("");
    toast({ title: "Payout recorded" });
    await loadAll();
  };

  const affiliateOwedMap = new Map<string, number>();
  commissions.forEach((c) => {
    if (c.status === "approved") {
      affiliateOwedMap.set(c.affiliate_id, (affiliateOwedMap.get(c.affiliate_id) ?? 0) + c.amount_cents);
    }
  });

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
        <PageBreadcrumb items={[{ label: "Admin", href: "/admin" }, { label: "Affiliates" }]} />
        <ProfileDropdown />
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-serif mb-6">Affiliate Management</h1>

        <Tabs defaultValue="affiliates">
          <TabsList>
            <TabsTrigger value="affiliates">Affiliates ({affiliates.length})</TabsTrigger>
            <TabsTrigger value="commissions">Commissions</TabsTrigger>
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
            <TabsTrigger value="settings"><SettingsIcon className="w-4 h-4 mr-1" />Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="affiliates" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Rate (signup/rec)</TableHead>
                      <TableHead>Owed</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {affiliates.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <div className="font-medium">{a.display_name || "—"}</div>
                          <div className="text-xs text-muted-foreground">{a.payout_email}</div>
                        </TableCell>
                        <TableCell><code className="text-xs">{a.referral_code}</code></TableCell>
                        <TableCell>
                          <Badge variant={a.status === "active" ? "default" : "secondary"} className="capitalize">
                            {a.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {(a.commission_signup_pct ?? settings?.default_signup_pct)}% / {(a.commission_recurring_pct ?? settings?.default_recurring_pct)}%
                        </TableCell>
                        <TableCell>{cents(affiliateOwedMap.get(a.id) ?? 0)}</TableCell>
                        <TableCell className="text-right space-x-1">
                          {a.status === "pending" && (
                            <>
                              <Button size="sm" variant="default" onClick={() => setStatus(a.id, "active")}>
                                <CheckCircle2 className="w-4 h-4 mr-1" />Approve
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setStatus(a.id, "rejected")}>
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {a.status === "active" && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => setEditing(a)}>Edit</Button>
                              <Button size="sm" onClick={() => { setPayoutDialog(a); setPayoutAmount(((affiliateOwedMap.get(a.id) ?? 0) / 100).toFixed(2)); }}>
                                <DollarSign className="w-4 h-4 mr-1" />Pay
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setStatus(a.id, "suspended")}>Suspend</Button>
                            </>
                          )}
                          {a.status === "suspended" && (
                            <Button size="sm" onClick={() => setStatus(a.id, "active")}>Reactivate</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="commissions" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Affiliate</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissions.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>{c.affiliates.display_name || c.affiliates.referral_code}</TableCell>
                        <TableCell className="capitalize">{c.type}</TableCell>
                        <TableCell>{cents(c.amount_cents)}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{c.status}</Badge></TableCell>
                        <TableCell className="text-right space-x-1">
                          {c.status === "pending" && (
                            <Button size="sm" variant="outline" onClick={() => approveCommission(c.id, "approved")}>
                              Approve
                            </Button>
                          )}
                          {c.status !== "void" && c.status !== "paid" && (
                            <Button size="sm" variant="ghost" onClick={() => approveCommission(c.id, "void")}>
                              Void
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payouts" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Affiliate</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}</TableCell>
                        <TableCell>{p.affiliates.display_name || p.affiliates.referral_code}</TableCell>
                        <TableCell>{cents(p.amount_cents)}</TableCell>
                        <TableCell className="capitalize">{p.method.replace("_", " ")}</TableCell>
                        <TableCell className="text-xs">{p.reference || "—"}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{p.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Program defaults</CardTitle>
                <CardDescription>Applied when an affiliate doesn't have a custom rate set.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {settings && (
                  <>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <Label>Default signup %</Label>
                        <Input
                          type="number" step="0.01"
                          value={settings.default_signup_pct}
                          onChange={(e) => setSettings({ ...settings, default_signup_pct: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label>Default recurring %</Label>
                        <Input
                          type="number" step="0.01"
                          value={settings.default_recurring_pct}
                          onChange={(e) => setSettings({ ...settings, default_recurring_pct: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label>Cookie window (days)</Label>
                        <Input
                          type="number"
                          value={settings.cookie_window_days}
                          onChange={(e) => setSettings({ ...settings, cookie_window_days: parseInt(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label>Minimum payout ($)</Label>
                        <Input
                          type="number" step="0.01"
                          value={(settings.min_payout_cents / 100).toString()}
                          onChange={(e) => setSettings({ ...settings, min_payout_cents: Math.round(parseFloat(e.target.value) * 100) })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Affiliate program terms (shown on application)</Label>
                      <Textarea
                        rows={6}
                        value={settings.terms_md || ""}
                        onChange={(e) => setSettings({ ...settings, terms_md: e.target.value })}
                      />
                    </div>
                    <Button onClick={saveSettings}>Save settings</Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit affiliate dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit affiliate</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Display name</Label>
                <Input value={editing.display_name ?? ""} onChange={(e) => setEditing({ ...editing, display_name: e.target.value })} />
              </div>
              <div>
                <Label>Payout email</Label>
                <Input value={editing.payout_email ?? ""} onChange={(e) => setEditing({ ...editing, payout_email: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Signup %</Label>
                  <Input type="number" step="0.01" value={editing.commission_signup_pct ?? ""} onChange={(e) => setEditing({ ...editing, commission_signup_pct: e.target.value ? parseFloat(e.target.value) : null })} />
                </div>
                <div>
                  <Label>Recurring %</Label>
                  <Input type="number" step="0.01" value={editing.commission_recurring_pct ?? ""} onChange={(e) => setEditing({ ...editing, commission_recurring_pct: e.target.value ? parseFloat(e.target.value) : null })} />
                </div>
              </div>
              <div>
                <Label>Payout method</Label>
                <Select value={editing.payout_method} onValueChange={(v) => setEditing({ ...editing, payout_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="stripe_connect">Stripe Connect (coming soon)</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Internal notes</Label>
                <Textarea value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveAffiliate}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record payout dialog */}
      <Dialog open={!!payoutDialog} onOpenChange={(o) => !o && setPayoutDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record payout to {payoutDialog?.display_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Amount ($)</Label>
              <Input type="number" step="0.01" value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">
                Marks all approved commissions for this affiliate as paid.
              </p>
            </div>
            <div>
              <Label>Method</Label>
              <Select value={payoutMethod} onValueChange={setPayoutMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual (bank, etc.)</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="stripe_connect">Stripe Connect</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reference (transaction id, etc.)</Label>
              <Input value={payoutRef} onChange={(e) => setPayoutRef(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPayoutDialog(null)}>Cancel</Button>
            <Button onClick={recordPayout}>Record payout</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAffiliates;