import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Sparkles, Printer, Mail } from "lucide-react";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import ProfileDropdown from "@/components/ProfileDropdown";

const MONTH_TITLES: Record<number, string> = {
  1: "The Echo", 2: "The Inheritance", 3: "The Body Remembers", 4: "The Threshold",
  5: "The Soft Animal", 6: "The Midpoint Mirror", 7: "The Voice", 8: "The Boundary",
  9: "The Longing", 10: "The Offering", 11: "The Gratitude", 12: "The Becoming",
};

type Subscriber = {
  id: string; full_name: string; email: string | null; postal_address: string;
  current_month: number; status: string; started_at: string; notes: string | null;
};

type Letter = {
  id: string; subscriber_id: string; month_number: number; theme: string;
  card_snapshot: any; draft_content: string | null; final_content: string | null;
  status: string; generated_at: string | null;
};

const SnailMailAdmin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [letters, setLetters] = useState<Record<string, Letter[]>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [newSub, setNewSub] = useState({ full_name: "", email: "", postal_address: "", current_month: 1 });
  const [editingLetter, setEditingLetter] = useState<Letter | null>(null);
  const [editingSubName, setEditingSubName] = useState<string>("");
  const [generating, setGenerating] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).eq("role", "admin").maybeSingle();
      if (!role) { navigate("/devotion"); return; }
      await loadAll();
      setLoading(false);
    })();
  }, [navigate]);

  const loadAll = async () => {
    const { data: s } = await supabase.from("snail_mail_subscribers").select("*").order("created_at", { ascending: false });
    setSubs((s ?? []) as Subscriber[]);
    const { data: l } = await supabase.from("snail_mail_letters").select("*").order("month_number", { ascending: true });
    const grouped: Record<string, Letter[]> = {};
    (l ?? []).forEach((row: any) => {
      grouped[row.subscriber_id] = grouped[row.subscriber_id] ?? [];
      grouped[row.subscriber_id].push(row);
    });
    setLetters(grouped);
  };

  const addSubscriber = async () => {
    if (!newSub.full_name.trim() || !newSub.postal_address.trim()) {
      toast({ title: "Name and postal address required", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("snail_mail_subscribers").insert(newSub);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    setAddOpen(false);
    setNewSub({ full_name: "", email: "", postal_address: "", current_month: 1 });
    await loadAll();
    toast({ title: "Subscriber added" });
  };

  const generateLetter = async (sub: Subscriber, month: number) => {
    setGenerating(`${sub.id}-${month}`);
    try {
      const { data, error } = await supabase.functions.invoke("generate-snail-mail-letter", {
        body: { subscriber_id: sub.id, month_number: month },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: `Letter ${month} drafted`, description: "Open to refine before printing." });
      await loadAll();
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(null);
    }
  };

  const openLetter = (letter: Letter, subName: string) => {
    setEditingLetter(letter);
    setEditingSubName(subName);
    setEditContent(letter.final_content ?? letter.draft_content ?? "");
  };

  const saveLetter = async (status?: string) => {
    if (!editingLetter) return;
    const patch: any = { final_content: editContent };
    if (status) patch.status = status;
    const { error } = await supabase.from("snail_mail_letters").update(patch).eq("id", editingLetter.id);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: status ? `Marked ${status}` : "Saved" });
    await loadAll();
    if (status) setEditingLetter(null);
  };

  const printLetter = () => {
    const w = window.open("", "_blank");
    if (!w || !editingLetter) return;
    const body = (editContent || "").replace(/\n/g, "<br/>");
    w.document.write(`<!doctype html><html><head><title>The Remembrance Letters — Month ${editingLetter.month_number}</title>
      <style>
        @page { margin: 1in; }
        body { font-family: 'Georgia', serif; background: #f5efe3; color: #2b1d12; max-width: 6.5in; margin: 0 auto; padding: 1in; line-height: 1.7; font-size: 13pt; }
        h1 { font-family: 'Playfair Display', Georgia, serif; font-size: 22pt; text-align: center; color: #6b4423; margin-bottom: 4pt; }
        .meta { text-align: center; font-style: italic; color: #8b6f4e; margin-bottom: 36pt; font-size: 11pt; }
        .cards { margin-top: 28pt; padding-top: 16pt; border-top: 1pt solid #c9a877; font-size: 10pt; color: #6b4423; }
      </style></head><body>
      <h1>The Remembrance Letters</h1>
      <div class="meta">Month ${editingLetter.month_number} — ${editingLetter.theme}<br/>for ${editingSubName}</div>
      <div>${body}</div>
      <div class="cards">Cards drawn: ${(editingLetter.card_snapshot ?? []).map((c: any) => `${c.title} (${c.deck})`).join(" • ")}</div>
      </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-primary font-serif">Loading…</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <PageBreadcrumb items={[{ label: "Admin", href: "/admin" }, { label: "The Remembrance Letters" }]} />
        <ProfileDropdown />
      </div>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif text-foreground">The Remembrance Letters</h1>
            <p className="text-muted-foreground text-sm mt-1">12-month snail mail series. Draw 4 cards per month, refine, print, post.</p>
          </div>
          <Button onClick={() => setAddOpen(true)}><Plus className="w-4 h-4 mr-2" /> Add Subscriber</Button>
        </div>

        {subs.length === 0 && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No subscribers yet. Add your first soul.</CardContent></Card>
        )}

        {subs.map(sub => {
          const subLetters = letters[sub.id] ?? [];
          const byMonth: Record<number, Letter> = {};
          subLetters.forEach(l => byMonth[l.month_number] = l);
          return (
            <Card key={sub.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="font-serif">{sub.full_name}</CardTitle>
                    <p className="text-xs text-muted-foreground whitespace-pre-line mt-1">{sub.postal_address}</p>
                    {sub.email && <p className="text-xs text-muted-foreground">{sub.email}</p>}
                  </div>
                  <Badge variant={sub.status === "active" ? "default" : "secondary"}>{sub.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                    const letter = byMonth[m];
                    const isGen = generating === `${sub.id}-${m}`;
                    return (
                      <div key={m} className="border border-border rounded-md p-3 space-y-2 bg-card/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs text-muted-foreground">Month {m}</div>
                            <div className="text-sm font-serif">{MONTH_TITLES[m]}</div>
                          </div>
                          {letter && <Badge variant="outline" className="text-xs">{letter.status}</Badge>}
                        </div>
                        <div className="flex gap-1">
                          {!letter && (
                            <Button size="sm" variant="outline" className="w-full text-xs" disabled={isGen} onClick={() => generateLetter(sub, m)}>
                              {isGen ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Sparkles className="w-3 h-3 mr-1" /> Draft</>}
                            </Button>
                          )}
                          {letter && (
                            <>
                              <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => openLetter(letter, sub.full_name)}>Open</Button>
                              <Button size="sm" variant="ghost" className="text-xs" disabled={isGen} onClick={() => generateLetter(sub, m)} title="Redraft">
                                {isGen ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add subscriber dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Subscriber</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Full name</Label><Input value={newSub.full_name} onChange={e => setNewSub({ ...newSub, full_name: e.target.value })} /></div>
            <div><Label>Email (optional)</Label><Input type="email" value={newSub.email} onChange={e => setNewSub({ ...newSub, email: e.target.value })} /></div>
            <div><Label>Postal address</Label><Textarea rows={4} value={newSub.postal_address} onChange={e => setNewSub({ ...newSub, postal_address: e.target.value })} placeholder={"Street\nCity, State Postcode\nCountry"} /></div>
            <div>
              <Label>Starting month</Label>
              <Select value={String(newSub.current_month)} onValueChange={v => setNewSub({ ...newSub, current_month: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <SelectItem key={m} value={String(m)}>Month {m} — {MONTH_TITLES[m]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addSubscriber}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit letter dialog */}
      <Dialog open={!!editingLetter} onOpenChange={o => !o && setEditingLetter(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {editingLetter && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif">
                  Month {editingLetter.month_number} — {editingLetter.theme}
                </DialogTitle>
                <p className="text-xs text-muted-foreground">For {editingSubName}</p>
              </DialogHeader>
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground border border-border rounded p-2 bg-muted/30">
                  <strong>Cards drawn:</strong>{" "}
                  {(editingLetter.card_snapshot ?? []).map((c: any, i: number) => (
                    <span key={i}>{i > 0 && " • "}{c.title} <em className="opacity-70">({c.deck})</em></span>
                  ))}
                </div>
                <Textarea
                  rows={24}
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  className="font-serif text-sm leading-relaxed"
                />
              </div>
              <DialogFooter className="flex-wrap gap-2">
                <Button variant="outline" onClick={() => saveLetter()}>Save draft</Button>
                <Button variant="outline" onClick={() => saveLetter("approved")}>Mark approved</Button>
                <Button variant="outline" onClick={printLetter}><Printer className="w-4 h-4 mr-2" />Print</Button>
                <Button onClick={() => saveLetter("sent")}><Mail className="w-4 h-4 mr-2" />Mark sent</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SnailMailAdmin;