import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Trash2, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import ProfileDropdown from "@/components/ProfileDropdown";

interface Row {
  id: string;
  placement: "recommended" | "seasonal";
  resource_id: string | null;
  internal_route: string | null;
  title: string;
  description: string | null;
  image_url: string | null;
  priority: number;
  start_at: string | null;
  end_at: string | null;
  is_active: boolean;
}

interface ResourceOption {
  id: string;
  title: string;
  slug: string;
}

// Only Devotion-hosted resources currently have a per-resource canonical
// route (/devotion/resources/:slug or /devotion/courses/:slug). Remembrance
// content is browsed via section pages, so remembrance resources cannot be
// linked directly. Admins must use an internal_route for those.

const EMPTY: Omit<Row, "id"> = {
  placement: "recommended",
  resource_id: null,
  internal_route: null,
  title: "",
  description: "",
  image_url: "",
  priority: 0,
  start_at: null,
  end_at: null,
  is_active: true,
};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export default function AdminHomeRecommendations() {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [resources, setResources] = useState<ResourceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Omit<Row, "id">>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!isAdmin) {
      navigate("/temple");
    }
  }, [authLoading, user, isAdmin, navigate]);

  const load = async () => {
    setLoading(true);
    const [{ data: recs }, { data: res }] = await Promise.all([
      supabase
        .from("home_recommendations")
        .select("*")
        .order("placement")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("content_resources")
        .select(
          "id, title, slug, location:content_categories!location_id(page)",
        )
        .eq("status", "published")
        .order("title"),
    ]);
    setRows((recs as Row[]) || []);
    const eligible = ((res || []) as Array<
      ResourceOption & { location?: { page?: string } | null }
    >)
      .filter((r) => r.location?.page === "devotion")
      .map(({ id, title, slug }) => ({ id, title, slug }));
    setResources(eligible);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
  };
  const openEdit = (row: Row) => {
    setEditing(row);
    setForm({ ...row });
  };

  const save = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    const hasResource = !!form.resource_id;
    const hasRoute = !!(form.internal_route && form.internal_route.trim());
    if (!hasResource && !hasRoute) {
      toast.error("Pick a resource or provide an internal route");
      return;
    }
    if (hasResource && hasRoute) {
      toast.error("Choose either a linked resource OR an internal route, not both");
      return;
    }
    if (hasRoute) {
      const r = form.internal_route.trim();
      if (
        !r.startsWith("/") ||
        r.startsWith("//") ||
        r.includes("://") ||
        r.toLowerCase().startsWith("javascript:") ||
        r.toLowerCase().startsWith("data:") ||
        !/^\/[A-Za-z0-9/_\-\.\?\=\&\%\:]*$/.test(r)
      ) {
        toast.error("Route must be a single internal path like /decks");
        return;
      }
    }

    setSaving(true);
    const payload = {
      placement: form.placement,
      // Enforce XOR at write-time as well as at the DB check constraint.
      resource_id: hasResource ? form.resource_id : null,
      internal_route: hasResource ? null : form.internal_route?.trim() || null,
      title: form.title.trim(),
      description: form.description?.trim() || null,
      image_url: form.image_url?.trim() || null,
      priority: Number(form.priority) || 0,
      start_at: form.start_at,
      end_at: form.end_at,
      is_active: !!form.is_active,
    };

    const { error } = editing
      ? await supabase
          .from("home_recommendations")
          .update(payload)
          .eq("id", editing.id)
      : await supabase.from("home_recommendations").insert({
          ...payload,
          created_by: user?.id ?? null,
        });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editing ? "Recommendation updated" : "Recommendation created");
    setEditing(null);
    setForm(EMPTY);
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this recommendation?")) return;
    const { error } = await supabase
      .from("home_recommendations")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await load();
  };

  const toggleActive = async (row: Row) => {
    const { error } = await supabase
      .from("home_recommendations")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await load();
  };

  if (authLoading || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-serif">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border">
        <div className="flex items-center justify-between p-4">
          <PageBreadcrumb
            items={[
              { label: "Admin", href: "/admin" },
              { label: "Homepage Recommendations" },
            ]}
          />
          <ProfileDropdown />
        </div>
        <div className="max-w-5xl mx-auto px-6 pb-4">
          <h1 className="text-2xl font-serif text-foreground">
            Homepage Recommendations
          </h1>
          <p className="text-sm text-muted-foreground">
            Curate what appears in the “Recommended for you now” and
            “New or seasonal” sections of the member homepage.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* List */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg">All recommendations</h2>
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" /> New
            </Button>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No recommendations yet. Create one to populate the homepage.
            </p>
          ) : (
            rows.map((r) => (
              <Card key={r.id} className="bg-card/70">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-0.5">
                      <span>{r.placement}</span>
                      <span>·</span>
                      <span>priority {r.priority}</span>
                      {!r.is_active && <span className="text-destructive">· inactive</span>}
                    </div>
                    <p className="font-serif text-base truncate">{r.title}</p>
                    {r.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {r.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={r.is_active}
                      onCheckedChange={() => toggleActive(r)}
                      aria-label="Active"
                    />
                    <Button size="icon" variant="ghost" onClick={() => openEdit(r)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => remove(r.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-serif">
                {editing ? "Edit recommendation" : "New recommendation"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Placement</Label>
                <Select
                  value={form.placement}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      placement: v as Row["placement"],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recommended">Recommended for you now</SelectItem>
                    <SelectItem value="seasonal">New or seasonal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Linked resource (preferred)</Label>
                <Select
                  value={form.resource_id ?? "__none__"}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      resource_id: v === "__none__" ? null : v,
                      // XOR: clear the other target so we never save both.
                      internal_route: v === "__none__" ? f.internal_route : null,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a published resource" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="__none__">— none —</SelectItem>
                    {resources.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Or internal route</Label>
                <Input
                  disabled={!!form.resource_id}
                  placeholder="/decks or /devotion/section/…"
                  value={form.internal_route ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      internal_route: e.target.value,
                      resource_id: e.target.value ? null : f.resource_id,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Must start with a single “/”. External URLs are not allowed.
                  Cannot be combined with a linked resource.
                </p>
              </div>

              <div>
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div>
                <Label>Short description</Label>
                <Textarea
                  rows={3}
                  value={form.description ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Image URL</Label>
                <Input
                  value={form.image_url ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, image_url: e.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Priority</Label>
                  <Input
                    type="number"
                    value={form.priority}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, priority: Number(e.target.value) }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between pt-6">
                  <Label htmlFor="active">Active</Label>
                  <Switch
                    id="active"
                    checked={form.is_active}
                    onCheckedChange={(v) =>
                      setForm((f) => ({ ...f, is_active: v }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={toLocalInput(form.start_at)}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        start_at: fromLocalInput(e.target.value),
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>End (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={toLocalInput(form.end_at)}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        end_at: fromLocalInput(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                {editing && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditing(null);
                      setForm(EMPTY);
                    }}
                  >
                    Cancel
                  </Button>
                )}
                <Button onClick={save} disabled={saving}>
                  {saving ? "Saving…" : editing ? "Save changes" : "Create"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}