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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, Eye, EyeOff, UserPlus, RefreshCw, Copy, Check, KeyRound, CalendarPlus, Pencil, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import ProfileDropdown from "@/components/ProfileDropdown";
import PageBreadcrumb from "@/components/PageBreadcrumb";

const CONTENT_AREAS = [
  { key: "remembrance", label: "The Door of Remembrance", description: "Oracle card decks and rites" },
  { key: "devotion", label: "The Door of Devotion", description: "Healing resources, courses, and protocols" },
  { key: "communion", label: "The Door of Communion", description: "Live sessions, classes, and workshops" },
];

interface ManualUser {
  user_id: string;
  email: string;
  full_name: string | null;
  buckets: string[];
  starts_at: string;
  ends_at: string;
  notes: string | null;
  is_active: boolean;
}

const UserManagement = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState<ManualUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [createdUserDetails, setCreatedUserDetails] = useState<{ email: string; password: string; name: string; endsAt: string; buckets: string[] } | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset password state
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<ManualUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetPasswordDetails, setResetPasswordDetails] = useState<{ email: string; password: string; name: string } | null>(null);
  const [resetCopied, setResetCopied] = useState(false);

  // Extend access state
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [extendUser, setExtendUser] = useState<ManualUser | null>(null);
  const [extendStartsAt, setExtendStartsAt] = useState<Date | undefined>(new Date());
  const [extendEndsAt, setExtendEndsAt] = useState<Date | undefined>(undefined);
  const [extendBuckets, setExtendBuckets] = useState<string[]>([]);
  const [extendNotes, setExtendNotes] = useState("");
  const [extendingAccess, setExtendingAccess] = useState(false);

  // Edit user state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<ManualUser | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editStartsAt, setEditStartsAt] = useState<Date | undefined>(undefined);
  const [editEndsAt, setEditEndsAt] = useState<Date | undefined>(undefined);
  const [editBuckets, setEditBuckets] = useState<string[]>([]);
  const [editingUser, setEditingUser] = useState(false);

  // Copy user details state
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);

  // Form state
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [startsAt, setStartsAt] = useState<Date | undefined>(new Date());
  const [endsAt, setEndsAt] = useState<Date | undefined>(undefined);
  const [selectedBuckets, setSelectedBuckets] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const fetchManualUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const { data: grants, error } = await supabase
        .from("manual_access_grants")
        .select("user_id, bucket_key, starts_at, ends_at, notes")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!grants?.length) {
        setUsers([]);
        setLoadingUsers(false);
        return;
      }

      // Group by user_id
      const userMap = new Map<string, { buckets: string[]; starts_at: string; ends_at: string; notes: string | null }>();
      for (const g of grants) {
        if (!userMap.has(g.user_id)) {
          userMap.set(g.user_id, { buckets: [], starts_at: g.starts_at, ends_at: g.ends_at, notes: g.notes });
        }
        userMap.get(g.user_id)!.buckets.push(g.bucket_key);
      }

      // Fetch profiles for these users
      const userIds = Array.from(userMap.keys());
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);

      const now = new Date();
      const result: ManualUser[] = userIds.map((uid) => {
        const grant = userMap.get(uid)!;
        const profile = profiles?.find((p) => p.id === uid);
        return {
          user_id: uid,
          email: profile?.email || "Unknown",
          full_name: profile?.full_name || null,
          buckets: grant.buckets,
          starts_at: grant.starts_at,
          ends_at: grant.ends_at,
          notes: grant.notes,
          is_active: new Date(grant.starts_at) <= now && new Date(grant.ends_at) > now,
        };
      });

      setUsers(result);
    } catch (err: any) {
      toast({ title: "Error loading users", description: err.message, variant: "destructive" });
    } finally {
      setLoadingUsers(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate("/admin");
      return;
    }
    if (!authLoading && isAdmin) {
      fetchManualUsers();
    }
  }, [authLoading, isAdmin, navigate, fetchManualUsers]);

  const resetForm = () => {
    setEmail("");
    setFullName("");
    setTempPassword("");
    setStartsAt(new Date());
    setEndsAt(undefined);
    setSelectedBuckets([]);
    setNotes("");
    setCreatedUserDetails(null);
    setCopied(false);
  };

  const handleSubmit = async () => {
    if (!email || !tempPassword || !startsAt || !endsAt || !selectedBuckets.length) {
      toast({ title: "Missing fields", description: "Please fill in all required fields and select at least one content area.", variant: "destructive" });
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
          fullName: fullName,
          tempPassword,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          buckets: selectedBuckets,
          notes: notes || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setCreatedUserDetails({
        email,
        password: tempPassword,
        name: fullName,
        endsAt: endsAt!.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
        buckets: selectedBuckets,
      });

      toast({ title: "User created", description: `${email} has been granted temporary access. Copy their login details below.` });
      fetchManualUsers();
    } catch (err: any) {
      toast({ title: "Failed to create user", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveAccess = async (userId: string) => {
    setDeletingUserId(userId);
    try {
      const { error } = await supabase
        .from("manual_access_grants")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;

      toast({ title: "Access removed", description: "All manual access grants have been removed for this user." });
      fetchManualUsers();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setDeletingUserId(null);
    }
  };

  const toggleBucket = (key: string) => {
    setSelectedBuckets((prev) =>
      prev.includes(key) ? prev.filter((b) => b !== key) : [...prev, key]
    );
  };

  const generatePassword = () => {
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lower = "abcdefghijklmnopqrstuvwxyz";
    const digits = "0123456789";
    const special = "!@#$%^&*";
    const all = upper + lower + digits + special;
    let pwd = [
      upper[Math.floor(Math.random() * upper.length)],
      lower[Math.floor(Math.random() * lower.length)],
      digits[Math.floor(Math.random() * digits.length)],
      special[Math.floor(Math.random() * special.length)],
    ];
    for (let i = pwd.length; i < 14; i++) {
      pwd.push(all[Math.floor(Math.random() * all.length)]);
    }
    pwd.sort(() => Math.random() - 0.5);
    return pwd.join("");
  };

  const handleGeneratePassword = () => {
    const password = generatePassword();
    setTempPassword(password);
    setShowPassword(true);
  };

  const handleGenerateNewPassword = () => {
    const password = generatePassword();
    setNewPassword(password);
    setShowNewPassword(true);
  };

  const handleCopyDetails = async () => {
    if (!createdUserDetails) return;
    const areas = createdUserDetails.buckets
      .map((b) => CONTENT_AREAS.find((a) => a.key === b)?.label || b)
      .join(", ");
    const loginUrl = SITE_CONFIG.productionDomain + "/auth";
    const text = `Hi${createdUserDetails.name ? ` ${createdUserDetails.name}` : ""},

Here are your login details for the Temple of Sustainment:

Login page: ${loginUrl}
Email: ${createdUserDetails.email}
Temporary password: ${createdUserDetails.password}

You will be prompted to change your password when you first sign in.

Your access includes: ${areas}
Access expires: ${createdUserDetails.endsAt}

If you'd like to continue your access after this date, you can become a member at https://thetemple.lightcodelab.com`;

    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied!", description: "Login details copied to clipboard." });
    setTimeout(() => setCopied(false), 3000);
  };

  // Reset password handlers
  const openResetPasswordDialog = (u: ManualUser) => {
    setResetPasswordUser(u);
    setNewPassword("");
    setShowNewPassword(false);
    setResetPasswordDetails(null);
    setResetCopied(false);
    setResetPasswordDialogOpen(true);
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser || !newPassword) {
      toast({ title: "Missing password", description: "Please enter or generate a new password.", variant: "destructive" });
      return;
    }

    setResettingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke("reset-manual-user-password", {
        body: {
          userId: resetPasswordUser.user_id,
          newPassword,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResetPasswordDetails({
        email: resetPasswordUser.email,
        password: newPassword,
        name: resetPasswordUser.full_name || "",
      });

      toast({ title: "Password reset", description: `Password has been reset for ${resetPasswordUser.email}. Copy the new details below.` });
    } catch (err: any) {
      toast({ title: "Failed to reset password", description: err.message, variant: "destructive" });
    } finally {
      setResettingPassword(false);
    }
  };

  const handleCopyResetDetails = async () => {
    if (!resetPasswordDetails) return;
    const loginUrl = SITE_CONFIG.productionDomain + "/auth";
    const text = `Hi${resetPasswordDetails.name ? ` ${resetPasswordDetails.name}` : ""},

Your password for the Temple of Sustainment has been reset.

Login page: ${loginUrl}
Email: ${resetPasswordDetails.email}
New temporary password: ${resetPasswordDetails.password}

You will be prompted to change your password when you next sign in.`;

    await navigator.clipboard.writeText(text);
    setResetCopied(true);
    toast({ title: "Copied!", description: "Reset details copied to clipboard." });
    setTimeout(() => setResetCopied(false), 3000);
  };

  // Extend access handlers
  const openExtendDialog = (u: ManualUser) => {
    setExtendUser(u);
    setExtendStartsAt(new Date());
    setExtendEndsAt(undefined);
    setExtendBuckets([...u.buckets]);
    setExtendNotes("");
    setExtendDialogOpen(true);
  };

  const toggleExtendBucket = (key: string) => {
    setExtendBuckets((prev) =>
      prev.includes(key) ? prev.filter((b) => b !== key) : [...prev, key]
    );
  };

  const handleExtendAccess = async () => {
    if (!extendUser || !extendStartsAt || !extendEndsAt || !extendBuckets.length) {
      toast({ title: "Missing fields", description: "Please fill in all required fields and select at least one content area.", variant: "destructive" });
      return;
    }

    if (extendEndsAt <= extendStartsAt) {
      toast({ title: "Invalid dates", description: "End date must be after start date.", variant: "destructive" });
      return;
    }

    setExtendingAccess(true);
    try {
      // First remove existing grants for this user
      const { error: deleteError } = await supabase
        .from("manual_access_grants")
        .delete()
        .eq("user_id", extendUser.user_id);

      if (deleteError) throw deleteError;

      // Insert new grants
      const grants = extendBuckets.map((bucket_key) => ({
        user_id: extendUser.user_id,
        bucket_key,
        granted_by: user?.id,
        starts_at: extendStartsAt.toISOString(),
        ends_at: extendEndsAt.toISOString(),
        notes: extendNotes || null,
      }));

      const { error: insertError } = await supabase
        .from("manual_access_grants")
        .insert(grants);

      if (insertError) throw insertError;

      toast({ title: "Access updated", description: `Access for ${extendUser.email} has been extended.` });
      setExtendDialogOpen(false);
      fetchManualUsers();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setExtendingAccess(false);
    }
  };

  // Copy user details (without password)
  const handleCopyUserDetails = async (u: ManualUser) => {
    const areas = u.buckets
      .map((b) => CONTENT_AREAS.find((a) => a.key === b)?.label || b)
      .join(", ");
    const loginUrl = SITE_CONFIG.productionDomain + "/auth";
    const expiryDate = new Date(u.ends_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const text = `Hi${u.full_name ? ` ${u.full_name}` : ""},

Here are your login details for the Temple of Sustainment:

Login page: ${loginUrl}
Email: ${u.email}

Your access includes: ${areas}
Access expires: ${expiryDate}

If you need your password reset, please let us know.

If you'd like to continue your access after this date, you can become a member at https://thetemple.lightcodelab.com`;

    await navigator.clipboard.writeText(text);
    setCopiedUserId(u.user_id);
    toast({ title: "Copied!", description: "User details copied to clipboard." });
    setTimeout(() => setCopiedUserId(null), 3000);
  };

  // Edit user handlers
  const openEditDialog = (u: ManualUser) => {
    setEditUser(u);
    setEditFullName(u.full_name || "");
    setEditNotes(u.notes || "");
    setEditStartsAt(new Date(u.starts_at));
    setEditEndsAt(new Date(u.ends_at));
    setEditBuckets([...u.buckets]);
    setEditDialogOpen(true);
  };

  const toggleEditBucket = (key: string) => {
    setEditBuckets((prev) =>
      prev.includes(key) ? prev.filter((b) => b !== key) : [...prev, key]
    );
  };

  const handleEditUser = async () => {
    if (!editUser || !editStartsAt || !editEndsAt || !editBuckets.length) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    if (editEndsAt <= editStartsAt) {
      toast({ title: "Invalid dates", description: "End date must be after start date.", variant: "destructive" });
      return;
    }

    setEditingUser(true);
    try {
      // Update profile name
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: editFullName || null })
        .eq("id", editUser.user_id);

      if (profileError) throw profileError;

      // Replace access grants
      const { error: deleteError } = await supabase
        .from("manual_access_grants")
        .delete()
        .eq("user_id", editUser.user_id);

      if (deleteError) throw deleteError;

      const grants = editBuckets.map((bucket_key) => ({
        user_id: editUser.user_id,
        bucket_key,
        granted_by: user?.id,
        starts_at: editStartsAt.toISOString(),
        ends_at: editEndsAt.toISOString(),
        notes: editNotes || null,
      }));

      const { error: insertError } = await supabase
        .from("manual_access_grants")
        .insert(grants);

      if (insertError) throw insertError;

      toast({ title: "User updated", description: `Details for ${editUser.email} have been saved.` });
      setEditDialogOpen(false);
      fetchManualUsers();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setEditingUser(false);
    }
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
            <p className="text-muted-foreground mt-1">Manually grant temporary content access to 1:1 clients</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><UserPlus className="w-4 h-4 mr-2" />Add User</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-serif">Add Manual User</DialogTitle>
                <DialogDescription>Create a new user account with temporary content access. They will be prompted to change their password on first login.</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Smith" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="tempPassword">Temporary Password *</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={handleGeneratePassword} className="h-auto py-1 px-2 text-xs">
                      <RefreshCw className="w-3 h-3 mr-1" />Generate
                    </Button>
                  </div>
                  <div className="relative">
                    <Input
                      id="tempPassword"
                      type={showPassword ? "text" : "password"}
                      value={tempPassword}
                      onChange={(e) => setTempPassword(e.target.value)}
                      placeholder="Min 8 chars, upper, lower, number, special"
                    />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Must include uppercase, lowercase, number, and special character. User will be forced to change on first login.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date *</Label>
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
                    <Label>End Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endsAt && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endsAt ? format(endsAt, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endsAt}
                          onSelect={setEndsAt}
                          disabled={(date) => (startsAt ? date <= startsAt : false)}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Content Access *</Label>
                  {CONTENT_AREAS.map((area) => (
                    <div key={area.key} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                      <Checkbox
                        id={`bucket-${area.key}`}
                        checked={selectedBuckets.includes(area.key)}
                        onCheckedChange={() => toggleBucket(area.key)}
                      />
                      <div className="flex-1">
                        <label htmlFor={`bucket-${area.key}`} className="text-sm font-medium cursor-pointer">{area.label}</label>
                        <p className="text-xs text-muted-foreground">{area.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. 1:1 client, 3-month program" />
                </div>

                {createdUserDetails ? (
                  <div className="space-y-3">
                    <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
                      <p className="text-sm font-medium text-foreground">✓ User created successfully</p>
                      <p className="text-xs text-muted-foreground">Copy their login details to share via email or message.</p>
                    </div>
                    <Button onClick={handleCopyDetails} variant="default" className="w-full">
                      {copied ? <><Check className="w-4 h-4 mr-2" />Copied!</> : <><Copy className="w-4 h-4 mr-2" />Copy Login Details</>}
                    </Button>
                    <Button onClick={() => { setDialogOpen(false); resetForm(); }} variant="outline" className="w-full">
                      Done
                    </Button>
                  </div>
                ) : (
                  <Button onClick={handleSubmit} disabled={submitting} className="w-full">
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
              <p className="text-muted-foreground">No manually added users yet.</p>
              <p className="text-sm text-muted-foreground mt-1">Click "Add User" to grant temporary access to a client.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {users.map((u, index) => (
              <motion.div key={u.user_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base font-serif">{u.full_name || u.email}</CardTitle>
                        {u.full_name && <CardDescription className="text-sm">{u.email}</CardDescription>}
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant={u.is_active ? "default" : "secondary"}>
                          {u.is_active ? "Active" : "Expired"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Copy login details"
                          onClick={() => handleCopyUserDetails(u)}
                        >
                          {copiedUserId === u.user_id ? <Check className="w-4 h-4 text-primary" /> : <Send className="w-4 h-4 text-muted-foreground" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Reset password"
                          onClick={() => openResetPasswordDialog(u)}
                        >
                          <KeyRound className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit user"
                          onClick={() => openEditDialog(u)}
                        >
                          <Pencil className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Extend / renew access"
                          onClick={() => openExtendDialog(u)}
                        >
                          <CalendarPlus className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Remove all access"
                          onClick={() => handleRemoveAccess(u.user_id)}
                          disabled={deletingUserId === u.user_id}
                        >
                          {deletingUserId === u.user_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-destructive" />}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span>{format(new Date(u.starts_at), "MMM d, yyyy")} → {format(new Date(u.ends_at), "MMM d, yyyy")}</span>
                      <div className="flex gap-1.5">
                        {u.buckets.map((b) => {
                          const area = CONTENT_AREAS.find((a) => a.key === b);
                          return <Badge key={b} variant="outline" className="text-xs">{area?.label || b}</Badge>;
                        })}
                      </div>
                    </div>
                    {u.notes && <p className="text-xs text-muted-foreground mt-2">{u.notes}</p>}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={(open) => { setResetPasswordDialogOpen(open); if (!open) { setResetPasswordUser(null); setResetPasswordDetails(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Reset Password</DialogTitle>
            <DialogDescription>
              Reset the password for {resetPasswordUser?.full_name || resetPasswordUser?.email}. They will be required to change it on next login.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {resetPasswordDetails ? (
              <div className="space-y-3">
                <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
                  <p className="text-sm font-medium text-foreground">✓ Password reset successfully</p>
                  <p className="text-xs text-muted-foreground">Copy the new login details to share with the user.</p>
                </div>
                <Button onClick={handleCopyResetDetails} variant="default" className="w-full">
                  {resetCopied ? <><Check className="w-4 h-4 mr-2" />Copied!</> : <><Copy className="w-4 h-4 mr-2" />Copy New Login Details</>}
                </Button>
                <Button onClick={() => { setResetPasswordDialogOpen(false); setResetPasswordUser(null); setResetPasswordDetails(null); }} variant="outline" className="w-full">
                  Done
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="newPassword">New Password *</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={handleGenerateNewPassword} className="h-auto py-1 px-2 text-xs">
                      <RefreshCw className="w-3 h-3 mr-1" />Generate
                    </Button>
                  </div>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8 chars, upper, lower, number, special"
                    />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowNewPassword(!showNewPassword)}>
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button onClick={handleResetPassword} disabled={resettingPassword || !newPassword} className="w-full">
                  {resettingPassword ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Resetting…</> : "Reset Password"}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Extend Access Dialog */}
      <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">Extend / Renew Access</DialogTitle>
            <DialogDescription>
              Set a new access period for {extendUser?.full_name || extendUser?.email}. This will replace their current access dates.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !extendStartsAt && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {extendStartsAt ? format(extendStartsAt, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={extendStartsAt} onSelect={setExtendStartsAt} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !extendEndsAt && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {extendEndsAt ? format(extendEndsAt, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={extendEndsAt}
                      onSelect={setExtendEndsAt}
                      disabled={(date) => (extendStartsAt ? date <= extendStartsAt : false)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Content Access *</Label>
              {CONTENT_AREAS.map((area) => (
                <div key={area.key} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                  <Checkbox
                    id={`extend-bucket-${area.key}`}
                    checked={extendBuckets.includes(area.key)}
                    onCheckedChange={() => toggleExtendBucket(area.key)}
                  />
                  <div className="flex-1">
                    <label htmlFor={`extend-bucket-${area.key}`} className="text-sm font-medium cursor-pointer">{area.label}</label>
                    <p className="text-xs text-muted-foreground">{area.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="extendNotes">Notes (optional)</Label>
              <Input id="extendNotes" value={extendNotes} onChange={(e) => setExtendNotes(e.target.value)} placeholder="e.g. Renewed for 3 more months" />
            </div>

            <Button onClick={handleExtendAccess} disabled={extendingAccess} className="w-full">
              {extendingAccess ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating…</> : "Update Access"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">Edit User</DialogTitle>
            <DialogDescription>
              Update details for {editUser?.email}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="editFullName">Full Name</Label>
              <Input id="editFullName" value={editFullName} onChange={(e) => setEditFullName(e.target.value)} placeholder="Jane Smith" />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={editUser?.email || ""} disabled className="opacity-60" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !editStartsAt && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editStartsAt ? format(editStartsAt, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={editStartsAt} onSelect={setEditStartsAt} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !editEndsAt && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editEndsAt ? format(editEndsAt, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={editEndsAt}
                      onSelect={setEditEndsAt}
                      disabled={(date) => (editStartsAt ? date <= editStartsAt : false)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Content Access *</Label>
              {CONTENT_AREAS.map((area) => (
                <div key={area.key} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                  <Checkbox
                    id={`edit-bucket-${area.key}`}
                    checked={editBuckets.includes(area.key)}
                    onCheckedChange={() => toggleEditBucket(area.key)}
                  />
                  <div className="flex-1">
                    <label htmlFor={`edit-bucket-${area.key}`} className="text-sm font-medium cursor-pointer">{area.label}</label>
                    <p className="text-xs text-muted-foreground">{area.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="editNotes">Notes (optional)</Label>
              <Input id="editNotes" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="e.g. 1:1 client, 3-month program" />
            </div>

            <Button onClick={handleEditUser} disabled={editingUser} className="w-full">
              {editingUser ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
