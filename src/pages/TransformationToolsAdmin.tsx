import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTransformationTools, useToolFields, TransformationTool, ToolField } from "@/hooks/useTransformationTools";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, ArrowUp, ArrowDown, Copy } from "lucide-react";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import ProfileDropdown from "@/components/ProfileDropdown";
import { useToast } from "@/hooks/use-toast";
import { DynamicFieldRenderer } from "@/components/tools/DynamicFieldRenderer";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const FIELD_TYPES = ["text","textarea","slider","dropdown","multiselect","radio","yes_no","yes_partial_no"] as const;

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const TransformationToolsAdmin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: tools = [], isLoading } = useTransformationTools(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).eq("role", "admin").maybeSingle();
      if (!data) { navigate("/devotion"); return; }
      setIsAdmin(true);
    })();
  }, [navigate]);

  useEffect(() => {
    if (!selectedId && tools.length) setSelectedId(tools[0].id);
  }, [tools, selectedId]);

  const selected = tools.find((t) => t.id === selectedId);

  const refresh = () => qc.invalidateQueries({ queryKey: ["tt-tools"] });

  const createTool = async () => {
    const { data, error } = await supabase.from("transformation_tools").insert({
      slug: `tool-${Date.now()}`, title: "Untitled Tool", display_order: tools.length + 1,
      save_button_label: "Save Entry", score_formula: { type: "none" } as any,
    }).select().single();
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    refresh();
    setSelectedId((data as any).id);
  };

  const duplicateTool = async (t: TransformationTool) => {
    const { data: newTool, error } = await supabase.from("transformation_tools").insert({
      slug: `${t.slug}-copy-${Date.now()}`, title: `${t.title} (copy)`, short_description: t.short_description,
      purpose: t.purpose, when_to_use: t.when_to_use, intro_microcopy: t.intro_microcopy,
      save_button_label: t.save_button_label, icon_name: t.icon_name, display_order: tools.length + 1,
      score_formula: t.score_formula as any, is_published: false,
    }).select().single();
    if (error || !newTool) { toast({ title: "Failed", description: error?.message, variant: "destructive" }); return; }
    const { data: srcFields } = await supabase.from("transformation_tool_fields").select("*").eq("tool_id", t.id);
    if (srcFields?.length) {
      await supabase.from("transformation_tool_fields").insert(srcFields.map((f: any) => {
        const { id, created_at, updated_at, tool_id, ...rest } = f;
        return { ...rest, tool_id: (newTool as any).id };
      }));
    }
    refresh();
    setSelectedId((newTool as any).id);
  };

  const deleteTool = async (id: string) => {
    const { error } = await supabase.from("transformation_tools").delete().eq("id", id);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    setSelectedId(null);
    refresh();
  };

  if (isAdmin === null || isLoading) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <PageBreadcrumb items={[{ label: "Admin", href: "/admin" }, { label: "Transformation Tools" }]} />
        <ProfileDropdown />
      </div>
      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
        <Card className="h-fit">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-serif">Tools</CardTitle>
            <Button size="sm" onClick={createTool}><Plus className="w-4 h-4 mr-1" />New</Button>
          </CardHeader>
          <CardContent className="space-y-1 p-2">
            {tools.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition ${selectedId === t.id ? "bg-primary/15 text-foreground" : "hover:bg-muted/40 text-muted-foreground"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{t.title}</span>
                  {!t.is_published && <Badge variant="outline" className="text-[10px]">draft</Badge>}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {selected ? (
          <ToolEditor key={selected.id} tool={selected} onChanged={refresh} onDuplicate={() => duplicateTool(selected)} onDelete={() => deleteTool(selected.id)} />
        ) : (
          <Card><CardContent className="p-10 text-center text-muted-foreground">Select or create a tool</CardContent></Card>
        )}
      </div>
    </div>
  );
};

/* --------------------- Tool Editor --------------------- */

const ToolEditor = ({ tool, onChanged, onDuplicate, onDelete }: {
  tool: TransformationTool; onChanged: () => void; onDuplicate: () => void; onDelete: () => void;
}) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: fields = [] } = useToolFields(tool.id);
  const [draft, setDraft] = useState<TransformationTool>(tool);
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(tool), [tool]);

  const numericFields = useMemo(() => fields.filter((f) => f.field_type === "slider"), [fields]);

  const saveDetails = async () => {
    setSaving(true);
    const { error } = await supabase.from("transformation_tools").update({
      slug: draft.slug || slugify(draft.title),
      title: draft.title,
      short_description: draft.short_description,
      purpose: draft.purpose,
      when_to_use: draft.when_to_use,
      intro_microcopy: draft.intro_microcopy,
      save_button_label: draft.save_button_label,
      icon_name: draft.icon_name,
      display_order: draft.display_order,
      is_published: draft.is_published,
      score_formula: draft.score_formula as any,
    }).eq("id", tool.id);
    setSaving(false);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Saved" });
    onChanged();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="font-serif">{draft.title}</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onDuplicate}><Copy className="w-3.5 h-3.5 mr-1" />Duplicate</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm"><Trash2 className="w-3.5 h-3.5 mr-1" />Delete</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this tool?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete the tool, its fields, and ALL user entries linked to it. This cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="fields">Fields ({fields.length})</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 pt-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Title"><Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field>
              <Field label="Slug"><Input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} /></Field>
              <Field label="Icon (lucide name)"><Input value={draft.icon_name || ""} onChange={(e) => setDraft({ ...draft, icon_name: e.target.value })} /></Field>
              <Field label="Display order"><Input type="number" value={draft.display_order} onChange={(e) => setDraft({ ...draft, display_order: Number(e.target.value) })} /></Field>
              <Field label="Save button label"><Input value={draft.save_button_label} onChange={(e) => setDraft({ ...draft, save_button_label: e.target.value })} /></Field>
              <Field label="Published">
                <div className="flex items-center gap-2 pt-2">
                  <Switch checked={draft.is_published} onCheckedChange={(v) => setDraft({ ...draft, is_published: v })} />
                  <span className="text-sm text-muted-foreground">{draft.is_published ? "Live" : "Draft"}</span>
                </div>
              </Field>
            </div>
            <Field label="Short description"><Textarea rows={2} value={draft.short_description || ""} onChange={(e) => setDraft({ ...draft, short_description: e.target.value })} /></Field>
            <Field label="Purpose"><Textarea rows={2} value={draft.purpose || ""} onChange={(e) => setDraft({ ...draft, purpose: e.target.value })} /></Field>
            <Field label="When to use this"><Textarea rows={2} value={draft.when_to_use || ""} onChange={(e) => setDraft({ ...draft, when_to_use: e.target.value })} /></Field>
            <Field label="Intro microcopy (the 'take a breath' line)"><Textarea rows={2} value={draft.intro_microcopy || ""} onChange={(e) => setDraft({ ...draft, intro_microcopy: e.target.value })} /></Field>

            <div className="space-y-2 border-t border-border pt-4">
              <Label className="text-sm font-medium">Score formula</Label>
              <div className="grid sm:grid-cols-3 gap-2">
                <Select
                  value={(draft.score_formula?.type) || "none"}
                  onValueChange={(v) => setDraft({ ...draft, score_formula: { ...(draft.score_formula||{}), type: v as any } })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">none</SelectItem>
                    <SelectItem value="single">single (one slider)</SelectItem>
                    <SelectItem value="average">average of several sliders</SelectItem>
                    <SelectItem value="ordinal">ordinal (dropdown with values)</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="field key (single/ordinal)" value={draft.score_formula?.field || ""} onChange={(e) => setDraft({ ...draft, score_formula: { ...draft.score_formula, field: e.target.value } })} />
                <Input placeholder="comma list of keys (average)" value={(draft.score_formula?.fields || []).join(",")} onChange={(e) => setDraft({ ...draft, score_formula: { ...draft.score_formula, fields: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } })} />
              </div>
              <Input placeholder="max value (chart y-axis)" type="number" value={draft.score_formula?.max ?? ""} onChange={(e) => setDraft({ ...draft, score_formula: { ...draft.score_formula, max: e.target.value ? Number(e.target.value) : undefined } })} />
            </div>

            <Button onClick={saveDetails} disabled={saving}>{saving ? "Saving…" : "Save details"}</Button>
          </TabsContent>

          <TabsContent value="fields" className="pt-4">
            <FieldsEditor toolId={tool.id} fields={fields} onChanged={() => qc.invalidateQueries({ queryKey: ["tt-fields", tool.id] })} />
          </TabsContent>

          <TabsContent value="preview" className="pt-4 space-y-4">
            {tool.intro_microcopy && <p className="italic text-muted-foreground text-center">{tool.intro_microcopy}</p>}
            {fields.map((f) => (
              <Card key={f.id} className="bg-card/60"><CardContent className="pt-6"><DynamicFieldRenderer field={f} value={undefined} onChange={() => {}} /></CardContent></Card>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>{children}</div>
);

/* --------------------- Fields Editor --------------------- */

const FieldsEditor = ({ toolId, fields, onChanged }: { toolId: string; fields: ToolField[]; onChanged: () => void }) => {
  const { toast } = useToast();

  const addField = async () => {
    const { error } = await supabase.from("transformation_tool_fields").insert({
      tool_id: toolId, order_index: fields.length + 1, key: `field_${Date.now()}`,
      label: "New question", field_type: "text", options: [] as any,
    });
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    onChanged();
  };

  const updateField = async (id: string, patch: Partial<ToolField>) => {
    const { error } = await supabase.from("transformation_tool_fields").update(patch as any).eq("id", id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    onChanged();
  };

  const removeField = async (id: string) => {
    await supabase.from("transformation_tool_fields").delete().eq("id", id);
    onChanged();
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const a = fields[idx], b = fields[idx + dir];
    if (!a || !b) return;
    await Promise.all([
      supabase.from("transformation_tool_fields").update({ order_index: b.order_index }).eq("id", a.id),
      supabase.from("transformation_tool_fields").update({ order_index: a.order_index }).eq("id", b.id),
    ]);
    onChanged();
  };

  return (
    <div className="space-y-3">
      <Button size="sm" onClick={addField}><Plus className="w-3.5 h-3.5 mr-1" />Add field</Button>
      {fields.map((f, i) => (
        <Card key={f.id} className="bg-muted/20">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">#{i + 1}</span>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="w-3.5 h-3.5" /></Button>
                <Button size="icon" variant="ghost" onClick={() => move(i, 1)} disabled={i === fields.length - 1}><ArrowDown className="w-3.5 h-3.5" /></Button>
                <Button size="icon" variant="ghost" onClick={() => removeField(f.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-2">
              <Input placeholder="key" defaultValue={f.key} onBlur={(e) => e.target.value !== f.key && updateField(f.id, { key: e.target.value })} />
              <Input placeholder="label" defaultValue={f.label} onBlur={(e) => e.target.value !== f.label && updateField(f.id, { label: e.target.value })} />
              <Select value={f.field_type} onValueChange={(v) => updateField(f.id, { field_type: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Input placeholder="helper text (optional)" defaultValue={f.helper_text || ""} onBlur={(e) => updateField(f.id, { helper_text: e.target.value })} />
            {f.field_type === "slider" && (
              <div className="grid grid-cols-4 gap-2">
                <Input type="number" placeholder="min" defaultValue={f.min ?? 0} onBlur={(e) => updateField(f.id, { min: Number(e.target.value) })} />
                <Input type="number" placeholder="max" defaultValue={f.max ?? 10} onBlur={(e) => updateField(f.id, { max: Number(e.target.value) })} />
                <Input placeholder="min label" defaultValue={f.min_label || ""} onBlur={(e) => updateField(f.id, { min_label: e.target.value })} />
                <Input placeholder="max label" defaultValue={f.max_label || ""} onBlur={(e) => updateField(f.id, { max_label: e.target.value })} />
              </div>
            )}
            {(f.field_type === "dropdown" || f.field_type === "multiselect" || f.field_type === "radio") && (
              <Textarea
                placeholder='Options. One per line. For ordinal dropdowns use JSON: [{"label":"in the moment","value":4}]'
                rows={3}
                defaultValue={Array.isArray(f.options) ? (typeof f.options[0] === "object" ? JSON.stringify(f.options, null, 2) : (f.options as string[]).join("\n")) : ""}
                onBlur={(e) => {
                  const raw = e.target.value.trim();
                  let parsed: any = [];
                  if (raw.startsWith("[")) {
                    try { parsed = JSON.parse(raw); } catch { toast({ title: "Invalid JSON", variant: "destructive" }); return; }
                  } else {
                    parsed = raw.split("\n").map((s) => s.trim()).filter(Boolean);
                  }
                  updateField(f.id, { options: parsed as any });
                }}
              />
            )}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <label className="flex items-center gap-2"><Switch checked={f.is_required} onCheckedChange={(v) => updateField(f.id, { is_required: v })} />Required</label>
              <label className="flex items-center gap-2"><Switch checked={f.contributes_to_score} onCheckedChange={(v) => updateField(f.id, { contributes_to_score: v })} />In score</label>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default TransformationToolsAdmin;