import { createContext, useCallback, useContext, useRef, useState, ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMemberState } from "@/hooks/useMemberState";
import { RitualReturnPill } from "./RitualReturnPill";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Check } from "lucide-react";
import {
  RHYTHMS, RitualAddItem, RitualRhythm, appendRitualStep, itemTypeLabel, useCreateRitual, useRituals,
} from "@/lib/rituals";

type Ctx = { open: (item: RitualAddItem, origin?: HTMLElement | null) => void; canAdd: boolean };
const AddToRitualContext = createContext<Ctx>({ open: () => {}, canAdd: false });
export const useAddToRitual = () => useContext(AddToRitualContext);

export function AddToRitualProvider({ children }: { children: ReactNode }) {
  const [item, setItem] = useState<RitualAddItem | null>(null);
  const origin = useRef<HTMLElement | null>(null);
  const isMobile = useIsMobile();
  const { hasFullTempleAccess, loading } = useMemberState();
  const canAdd = !loading && hasFullTempleAccess;

  const open = useCallback((next: RitualAddItem, el?: HTMLElement | null) => {
    origin.current = el ?? (document.activeElement as HTMLElement | null);
    setItem(next);
  }, []);

  const close = (o: boolean) => {
    if (o) return;
    setItem(null);
    const el = origin.current;
    setTimeout(() => el?.focus?.(), 0);
  };

  const body = item ? <AddFlow key={JSON.stringify(item)} item={item} onDone={() => close(false)} /> : null;
  const title = "Add to Ritual";
  const desc = item ? `${item.name} · ${itemTypeLabel(item.kind)}` : "";

  return (
    <AddToRitualContext.Provider value={{ open, canAdd }}>
      {children}
      <RitualReturnPill />
      {isMobile ? (
        <Drawer open={!!item} onOpenChange={close}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader className="text-left">
              <DrawerTitle className="font-serif">{title}</DrawerTitle>
              <DrawerDescription>{desc}</DrawerDescription>
            </DrawerHeader>
            <div className="overflow-y-auto px-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
              {body}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={!!item} onOpenChange={close}>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-serif">{title}</DialogTitle>
              <DialogDescription>{desc}</DialogDescription>
            </DialogHeader>
            {body}
          </DialogContent>
        </Dialog>
      )}
    </AddToRitualContext.Provider>
  );
}

function AddFlow({ item, onDone }: { item: RitualAddItem; onDone: () => void }) {
  const { data: rituals = [], isLoading } = useRituals();
  const createRitual = useCreateRitual();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selected, setSelected] = useState<string | null>(null);
  const [label, setLabel] = useState(item.name);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRhythm, setNewRhythm] = useState<RitualRhythm>("daily");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<{ id: string; name: string } | null>(null);
  // One request id per deliberate add: retries reuse it, "Add again" makes a new one.
  const requestId = useRef(crypto.randomUUID());

  const showCreate = creating || (!isLoading && rituals.length === 0);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setError(null);
    try {
      const r = await createRitual.mutateAsync({ name: newName, rhythm: newRhythm });
      setSelected(r.id);
      setCreating(false);
      setNewName("");
    } catch (e: any) {
      setError(e?.message ?? "We couldn't create that ritual. Please try again.");
    }
  };

  const handleAdd = async () => {
    if (!selected || saving) return;
    setSaving(true);
    setError(null);
    try {
      await appendRitualStep(selected, item, label, requestId.current);
      qc.invalidateQueries({ queryKey: ["ritual", selected] });
      const name = rituals.find((r) => r.id === selected)?.name ?? "your ritual";
      setAdded({ id: selected, name });
      toast({ title: `Added to ${name}` });
    } catch (e: any) {
      setError(e?.message ?? "We couldn't add this step. Your choices are kept — please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (added) {
    return (
      <div className="space-y-4 pb-2">
        <p className="flex items-center gap-2 text-foreground">
          <Check className="h-4 w-4 text-primary" aria-hidden /> Added to {added.name}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild><Link to={`/rituals/${added.id}`} onClick={onDone}>View Ritual</Link></Button>
          <Button variant="outline" onClick={onDone}>Keep browsing</Button>
          <Button variant="ghost" onClick={() => { requestId.current = crypto.randomUUID(); setAdded(null); }}>
            Add again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-2">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading your rituals…</p>
      ) : (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-foreground mb-1">Choose a ritual</legend>
          {RHYTHMS.map((g) => {
            const list = rituals.filter((r) => r.rhythm === g.value);
            if (!list.length) return null;
            return (
              <div key={g.value}>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{g.label}</p>
                <div className="grid gap-1.5">
                  {list.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelected(r.id)}
                      aria-pressed={selected === r.id}
                      className={`min-h-11 rounded-md border px-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        selected === r.id ? "border-primary bg-primary/10 text-foreground" : "border-border hover:border-primary/40"
                      }`}
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {!showCreate && (
            <Button type="button" variant="outline" size="sm" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4 mr-1" /> Create a Ritual
            </Button>
          )}
        </fieldset>
      )}

      {showCreate && (
        <div className="space-y-3 rounded-md border border-border p-3">
          <p className="text-sm font-medium text-foreground">Create a Ritual</p>
          <div className="space-y-1.5">
            <Label htmlFor="new-ritual-name">Name</Label>
            <Input id="new-ritual-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Morning Ritual" maxLength={120} />
          </div>
          <div className="flex gap-1.5" role="radiogroup" aria-label="Rhythm">
            {RHYTHMS.map((g) => (
              <Button key={g.value} type="button" size="sm" role="radio" aria-checked={newRhythm === g.value}
                variant={newRhythm === g.value ? "default" : "outline"} onClick={() => setNewRhythm(g.value)}>
                {g.label}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handleCreate} disabled={!newName.trim() || createRitual.isPending}>
              {createRitual.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Create
            </Button>
            {rituals.length > 0 && (
              <Button type="button" size="sm" variant="ghost" onClick={() => setCreating(false)}>Back</Button>
            )}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="ritual-step-label">Step label (optional)</Label>
        <Input id="ritual-step-label" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={120} />
        {item.kind === "deck" && <p className="text-xs text-muted-foreground">Each visit draws one fresh card from this deck.</p>}
        {item.kind === "spread" && <p className="text-xs text-muted-foreground">Each visit draws a fresh spread across the decks, as Sacred Spreads does today.</p>}
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button onClick={handleAdd} disabled={!selected || saving}>
          {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Add to Ritual
        </Button>
        <Button variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </div>
  );
}
