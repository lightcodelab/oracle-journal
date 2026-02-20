import { useEffect, useState, useCallback } from "react";
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
import { Loader2, Plus, Trash2, Eye, EyeOff, UserPlus } from "lucide-react";
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

      toast({ title: "User created", description: `${email} has been granted temporary access.` });
      setDialogOpen(false);
      resetForm();
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
                  <Label htmlFor="tempPassword">Temporary Password *</Label>
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
                  <p className="text-xs text-muted-foreground">Must include uppercase, lowercase, number, and special character.</p>
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

                <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                  {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</> : "Create User & Grant Access"}
                </Button>
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
                      <div className="flex items-center gap-2">
                        <Badge variant={u.is_active ? "default" : "secondary"}>
                          {u.is_active ? "Active" : "Expired"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
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
    </div>
  );
};

export default UserManagement;
