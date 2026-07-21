import { useEffect, useState, useCallback } from "react";
import { SITE_CONFIG } from "@/lib/siteConfig";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye, EyeOff, UserPlus, RefreshCw, Copy, Check, KeyRound, CalendarPlus, Pencil, Send, CalendarIcon, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import ProfileDropdown from "@/components/ProfileDropdown";
import PageBreadcrumb from "@/components/PageBreadcrumb";

/**
 * Admin surface for the canonical manual full-access model.
 *
 * Every grant is a single [starts_at, expires_at) full-Temple window.
 * Bucket / Door selection has been removed. Writes go exclusively through
 * the transactional admin RPCs (`admin_create_manual_full_access`,
 * `admin_extend_manual_full_access`, `admin_revoke_manual_full_access`)
 * so overlap exclusion, audit and identity guards are always applied.
 */

type GrantState = "scheduled" | "active" | "expired" | "revoked";

interface ManualUser {
  grant_id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  starts_at: string;
  expires_at: string;
  revoked_at: string | null;
  notes: string | null;
  state: GrantState;
}

const DURATION_PRESETS: { label: string; months: number }[] = [
  { label: "1 month", months: 1 },
  { label: "3 months", months: 3 },
  { label: "6 months", months: 6 },
  { label: "12 months", months: 12 },
];

function addMonths(d: Date, m: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + m);
  return r;
}

function deriveState(g: { starts_at: string; expires_at: string; revoked_at: string | null }): GrantState {
  if (g.revoked_at) return "revoked";
  const now = new Date();
  const s = new Date(g.starts_at);
  const e = new Date(g.expires_at);
  if (now < s) return "scheduled";
  if (now >= e) return "expired";
  return "active";
}

function generatePassword(): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const special = "!@#$%^&*";
  const all = upper + lower + digits + special;
  const pwd = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
  ];
  for (let i = pwd.length; i < 14; i++) pwd.push(all[Math.floor(Math.random() * all.length)]);
  return pwd.sort(() => Math.random() - 0.5).join("");
}

function formatWindow(g: ManualUser): string {
  return `${format(new Date(g.starts_at), "MMM d, yyyy")} → ${format(new Date(g.expires_at), "MMM d, yyyy")}`;
}

const UserManagement = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState<ManualUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [startsAt, setStartsAt] = useState<Date | undefined>(new Date());
  const [endsAt, setEndsAt] = useState<Date | undefined>(addMonths(new Date(), 3));
  const [notes, setNotes] = useState("");
  const [createdDetails, setCreatedDetails] = useState<{ email: string; password: string; name: string; endsAt: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [extendOpen, setExtendOpen] = useState(false);
  const [extendUser, setExtendUser] = useState<ManualUser | null>(null);
  const [extendNewExpiry, setExtendNewExpiry] = useState<Date | undefined>();
  const [extendNotes, setExtendNotes] = useState("");
  const [extending, setExtending] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<ManualUser | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetUser, setResetUser] = useState<ManualUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetDetails, setResetDetails] = useState<{ email: string; password: string; name: string } | null>(null);
  const [resetCopied, setResetCopied] = useState(false);

  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const { data: grants, error } = await supabase
        .from("manual_full_access_grants")
        .select("id, user_id, starts_at, expires_at, revoked_at, notes")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!grants?.length) {
        setUsers([]);
        return;
      }
      const ids = Array.from(new Set(grants.map((g) => g.user_id)));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", ids);
      const result: ManualUser[] = grants.map((g) => {
        const p = profiles?.find((x) => x.id === g.user_id);
        return {
          grant_id: g.id,
          user_id: g.user_id,
          email: p?.email || "Unknown",
          full_name: p?.full_name || null,
          starts_at: g.starts_at,
          expires_at: g.expires_at,
          revoked_at: g.revoked_at,
          notes: g.notes,
          state: deriveState(g),
        };
      });
      const order: Record<GrantState, number> = { active: 0, scheduled: 1, expired: 2, revoked: 3 };
      result.sort((a, b) => order[a.state] - order[b.state] || a.starts_at.localeCompare(b.starts_at));
      setUsers(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load users";
      toast({ title: "Error loading users", description: msg, variant: "destructive" });
    } finally {
      setLoadingUsers(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate("/admin");
      return;
    }
    if (!authLoading && isAdmin) fetchUsers();
  }, [authLoading, isAdmin, navigate, fetchUsers]);

  const resetCreateForm = () => {
    setEmail("");
    setFullName("");
    setTempPassword("");
    setStartsAt(new Date());
    setEndsAt(addMonths(new Date(), 3));
    setNotes("");
    setCreatedDetails(null);
    setCopied(false);
  };

  const applyCreatePreset = (months: number) => {
    const s = startsAt ?? new Date();
    setStartsAt(s);
    setEndsAt(addMonths(s, months));
  };

  const handleCreate = async () => {
    if (!email || !tempPassword || !startsAt || !endsAt) {
      toast({ title: "Missing fields", description: "Email, password and both dates are required.", variant: "destructive" });
      return;
    }
    if (endsAt <= startsAt) {
      toast({ title: "Invalid dates", description: "End date must be after start date.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-manual-user", {
        body: {
          email,
          fullName,
          tempPassword,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          notes: notes || undefined,
        },
      });
      if (error) throw error;
      const payload = data as { error?: string } | null;
      if (payload?.error) throw new Error(payload.error);
      setCreatedDetails({
        email,
        password: tempPassword,
        name: fullName,
        endsAt: endsAt.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
      });
      toast({ title: "User created", description: `${email} has been granted full Temple access.` });
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create user";
      toast({ title: "Failed to create user", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const openExtend = (u: ManualUser) => {
    setExtendUser(u);
    const base = u.state === "expired" ? new Date() : new Date(u.expires_at);
    setExtendNewExpiry(addMonths(base, 3));
    setExtendNotes("");
    setExtendOpen(true);
  };

  const handleExtend = async () => {
    if (!extendUser || !extendNewExpiry) return;
    if (new Date(extendNewExpiry) <= new Date(extendUser.starts_at)) {
      toast({ title: "Invalid date", description: "New expiry must be after the original start date.", variant: "destructive" });
      return;
    }
    setExtending(true);
    try {
      const { error } = await supabase.rpc("admin_extend_manual_full_access", {
        _grant_id: extendUser.grant_id,
        _new_expires_at: extendNewExpiry.toISOString(),
        _notes: extendNotes || null,
      });
      if (error) throw error;
      toast({ title: "Access extended", description: `${extendUser.email} now has access until ${format(extendNewExpiry, "PPP")}.` });
      setExtendOpen(false);
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to extend";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setExtending(false);
    }
  };

  const openEdit = (u: ManualUser) => {
    setEditUser(u);
    setEditFullName(u.full_name || "");
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: editFullName || null })
        .eq("id", editUser.user_id);
      if (error) throw error;
      toast({ title: "Profile updated" });
      setEditOpen(false);
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleRevoke = async (u: ManualUser) => {
    setRevokingId(u.grant_id);
    try {
      const { error } = await supabase.rpc("admin_revoke_manual_full_access", {
        _grant_id: u.grant_id,
        _notes: null,
      });
      if (error) throw error;
      toast({ title: "Access revoked", description: `Access for ${u.email} has been ended immediately.` });
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to revoke";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setRevokingId(null);
    }
  };

  const openReset = (u: ManualUser) => {
    setResetUser(u);
    setNewPassword("");
    setShowNewPassword(false);
    setResetDetails(null);
    setResetCopied(false);
    setResetOpen(true);
  };

  const handleReset = async () => {
    if (!resetUser || !newPassword) {
      toast({ title: "Missing password", description: "Please enter or generate a new password.", variant: "destructive" });
      return;
    }
    setResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke("reset-manual-user-password", {
        body: { userId: resetUser.user_id, newPassword },
      });
      if (error) throw error;
      const payload = data as { error?: string } | null;
      if (payload?.error) throw new Error(payload.error);
      setResetDetails({ email: resetUser.email, password: newPassword, name: resetUser.full_name || "" });
      toast({ title: "Password reset", description: `Password reset for ${resetUser.email}.` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reset";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  const copyCreated = async () => {
    if (!createdDetails) return;
    const loginUrl = SITE_CONFIG.productionDomain + "/auth";
    const text = `Hi${createdDetails.name ? ` ${createdDetails.name}` : ""},

Here are your login details for the Temple of Sustainment:

Login page: ${loginUrl}
Email: ${createdDetails.email}
Temporary password: ${createdDetails.password}

You will be prompted to change your password when you first sign in.

You have full access to The Temple until ${createdDetails.endsAt}.

If you'd like to continue after this date, you can become a member at ${SITE_CONFIG.productionDomain}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied!" });
    setTimeout(() => setCopied(false), 3000);
  };

  const copyReset = async () => {
    if (!resetDetails) return;
    const loginUrl = SITE_CONFIG.productionDomain + "/auth";
    const text = `Hi${resetDetails.name ? ` ${resetDetails.name}` : ""},

Your password for the Temple of Sustainment has been reset.

Login page: ${loginUrl}
Email: ${resetDetails.email}
New temporary password: ${resetDetails.password}

You will be prompted to change your password when you next sign in.`;
    await navigator.clipboard.writeText(text);
    setResetCopied(true);
    toast({ title: "Copied!" });
    setTimeout(() => setResetCopied(false), 3000);
  };

  const copyUserLogin = async (u: ManualUser) => {
    const loginUrl = SITE_CONFIG.productionDomain + "/auth";
    const expiry = new Date(u.expires_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    const text = `Hi${u.full_name ? ` ${u.full_name}` : ""},

Here are your login details for the Temple of Sustainment:

Login page: ${loginUrl}
Email: ${u.email}

You have full access to The Temple until ${expiry}.

If you'd like to continue after this date, you can become a member at ${SITE_CONFIG.productionDomain}`;
    await navigator.clipboard.writeText(text);
    setCopiedUserId(u.user_id);
    toast({ title: "Copied!" });
    setTimeout(() => setCopiedUserId(null), 3000);
  };

  if (authLoading || loadingUsers) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <PageBreadcrumb items={[{ label: "Admin Dashboard", href: "/admin" }, { label: "User Management" }]} />
        <ProfileDropdown />
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif text-foreground">User Management</h1>
            <p className="text-muted-foreground mt-1">Grant time-limited full access to The Temple for 1:1 clients</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetCreateForm(); }}>
            <DialogTrigger asChild>
              <Button><UserPlus className="w-4 h-4 mr-2" />Add User</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-serif">Add Manual User</DialogTitle>
                <DialogDescription>Create an account with time-limited full Temple access. They will be prompted to change their password on first login.</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Smith" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="tempPassword">Temporary Password *</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setTempPassword(generatePassword()); setShowPassword(true); }} className="h-auto py-1 px-2 text-xs">
                      <RefreshCw className="w-3 h-3 mr-1" />Generate
                    </Button>
                  </div>
                  <div className="relative">
                    <Input id="tempPassword" type={showPassword ? "text" : "password"} value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} placeholder="Min 8 chars, upper, lower, number, special" />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Access Duration</Label>
                  <div className="flex flex-wrap gap-2">
                    {DURATION_PRESETS.map((p) => (
                      <Button key={p.label} type="button" variant="outline" size="sm" onClick={() => applyCreatePreset(p.months)}>
                        {p.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startsAt && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startsAt ? format(startsAt, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={startsAt} onSelect={setStartsAt} initialFocus className={cn("p-3 pointer-events-auto")} />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Expires *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endsAt && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endsAt ? format(endsAt, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={endsAt} onSelect={setEndsAt} disabled={(date) => (startsAt ? date <= startsAt : false)} initialFocus className={cn("p-3 pointer-events-auto")} />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. 1:1 client, 3-month program" />
                </div>

                {createdDetails ? (
                  <div className="space-y-3">
                    <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
                      <p className="text-sm font-medium text-foreground">✓ User created — full Temple access until {createdDetails.endsAt}.</p>
                      <p className="text-xs text-muted-foreground">Copy their login details to share.</p>
                    </div>
                    <Button onClick={copyCreated} className="w-full">
                      {copied ? <><Check className="w-4 h-4 mr-2" />Copied!</> : <><Copy className="w-4 h-4 mr-2" />Copy Login Details</>}
                    </Button>
                    <Button onClick={() => { setDialogOpen(false); resetCreateForm(); }} variant="outline" className="w-full">Done</Button>
                  </div>
                ) : (
                  <Button onClick={handleCreate} disabled={submitting} className="w-full">
                    {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</> : "Create User & Grant Access"}
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>

        {users.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <UserPlus className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No manually granted users yet.</p>
              <p className="text-sm text-muted-foreground mt-1">Click "Add User" to grant time-limited access.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {users.map((u, i) => {
              const badgeVariant =
                u.state === "active" ? "default" :
                u.state === "scheduled" ? "secondary" :
                "outline";
              return (
                <motion.div key={u.grant_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <CardTitle className="text-base font-serif truncate">{u.full_name || u.email}</CardTitle>
                          {u.full_name && <CardDescription className="text-sm truncate">{u.email}</CardDescription>}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Badge variant={badgeVariant} className={cn(u.state === "revoked" && "text-destructive border-destructive/40")}>
                            {u.state.charAt(0).toUpperCase() + u.state.slice(1)}
                          </Badge>
                          <Button variant="ghost" size="icon" title="Copy login details" onClick={() => copyUserLogin(u)}>
                            {copiedUserId === u.user_id ? <Check className="w-4 h-4 text-primary" /> : <Send className="w-4 h-4 text-muted-foreground" />}
                          </Button>
                          <Button variant="ghost" size="icon" title="Reset password" onClick={() => openReset(u)}>
                            <KeyRound className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Edit name" onClick={() => openEdit(u)}>
                            <Pencil className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          {u.state !== "revoked" && (
                            <Button variant="ghost" size="icon" title="Extend / renew access" onClick={() => openExtend(u)}>
                              <CalendarPlus className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          )}
                          {(u.state === "active" || u.state === "scheduled") && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" title="Revoke access immediately" disabled={revokingId === u.grant_id}>
                                  {revokingId === u.grant_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 text-destructive" />}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Revoke access for {u.email}?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This ends their full Temple access immediately. The grant is preserved in history and audit but no longer entitles the user. To re-enable access, create a new grant.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Keep access</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleRevoke(u)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Revoke now
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span>{formatWindow(u)}</span>
                        {u.revoked_at && (
                          <span className="text-destructive">Revoked {format(new Date(u.revoked_at), "MMM d, yyyy")}</span>
                        )}
                      </div>
                      {u.notes && <p className="text-xs text-muted-foreground mt-2">{u.notes}</p>}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Extend dialog */}
      <Dialog open={extendOpen} onOpenChange={setExtendOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Extend / Renew Access</DialogTitle>
            <DialogDescription>
              Move the expiry for {extendUser?.full_name || extendUser?.email}. The original start date is preserved for history.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {extendUser && (
              <p className="text-sm text-muted-foreground">
                Current window: {format(new Date(extendUser.starts_at), "PPP")} → {format(new Date(extendUser.expires_at), "PPP")}
              </p>
            )}
            <div className="space-y-2">
              <Label>Presets</Label>
              <div className="flex flex-wrap gap-2">
                {DURATION_PRESETS.map((p) => (
                  <Button key={p.label} type="button" variant="outline" size="sm"
                    onClick={() => {
                      const base = extendUser?.state === "expired" ? new Date() : new Date(extendUser?.expires_at || Date.now());
                      setExtendNewExpiry(addMonths(base, p.months));
                    }}>
                    +{p.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>New expiry *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !extendNewExpiry && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {extendNewExpiry ? format(extendNewExpiry, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={extendNewExpiry} onSelect={setExtendNewExpiry}
                    disabled={(date) => extendUser ? date <= new Date(extendUser.starts_at) : false}
                    initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input value={extendNotes} onChange={(e) => setExtendNotes(e.target.value)} placeholder="e.g. Renewed after 1:1 session" />
            </div>
            <Button onClick={handleExtend} disabled={extending || !extendNewExpiry} className="w-full">
              {extending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating…</> : "Update Expiry"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit name */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Edit User</DialogTitle>
            <DialogDescription>Update the display name for {editUser?.email}. Access dates are managed via Extend or Revoke.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} placeholder="Jane Smith" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={editUser?.email || ""} disabled className="opacity-60" />
            </div>
            <Button onClick={handleSaveEdit} disabled={savingEdit} className="w-full">
              {savingEdit ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset password */}
      <Dialog open={resetOpen} onOpenChange={(open) => { setResetOpen(open); if (!open) { setResetUser(null); setResetDetails(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Reset Password</DialogTitle>
            <DialogDescription>
              Reset password for {resetUser?.full_name || resetUser?.email}. They will be required to change it on next login.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {resetDetails ? (
              <div className="space-y-3">
                <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="text-sm font-medium text-foreground">✓ Password reset</p>
                </div>
                <Button onClick={copyReset} className="w-full">
                  {resetCopied ? <><Check className="w-4 h-4 mr-2" />Copied!</> : <><Copy className="w-4 h-4 mr-2" />Copy New Login Details</>}
                </Button>
                <Button onClick={() => { setResetOpen(false); setResetUser(null); setResetDetails(null); }} variant="outline" className="w-full">Done</Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>New Password *</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setNewPassword(generatePassword()); setShowNewPassword(true); }} className="h-auto py-1 px-2 text-xs">
                      <RefreshCw className="w-3 h-3 mr-1" />Generate
                    </Button>
                  </div>
                  <div className="relative">
                    <Input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 8 chars, upper, lower, number, special" />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowNewPassword(!showNewPassword)}>
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button onClick={handleReset} disabled={resetting || !newPassword} className="w-full">
                  {resetting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Resetting…</> : "Reset Password"}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;