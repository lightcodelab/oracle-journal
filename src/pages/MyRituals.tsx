import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Plus, Loader2, Flame } from "lucide-react";
import NavActions from "@/components/NavActions";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RHYTHMS, RitualRhythm, useCreateRitual, useRituals, useRitualVisits } from "@/lib/rituals";
import RitualVisitHistory from "@/components/rituals/RitualVisitHistory";

export function RitualsShell({ crumbs, children }: { crumbs: { label: string; href?: string }[]; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 pt-4 pb-3 flex items-center justify-between gap-3">
        <PageBreadcrumb items={[{ label: "THE TEMPLE", href: "/temple" }, ...crumbs]} />
        <NavActions />
      </div>
      <div className="max-w-5xl mx-auto px-4 pb-24">{children}</div>
    </div>
  );
}

const MyRituals = () => {
  const navigate = useNavigate();
  const { data: rituals = [], isLoading, error } = useRituals();
  const { data: visits = [] } = useRitualVisits();
  const create = useCreateRitual();
  const [creatingIn, setCreatingIn] = useState<RitualRhythm | null>(null);
  const [name, setName] = useState("");
  const [intention, setIntention] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const openVisit = new Set(visits.filter((v) => v.status === "in_progress").map((v) => v.ritual_id));

  const submit = async () => {
    if (!creatingIn || !name.trim()) return;
    setFormError(null);
    try {
      const r = await create.mutateAsync({ name, rhythm: creatingIn, intention });
      navigate(`/rituals/${r.id}`);
    } catch (e: any) {
      setFormError(e?.message ?? "We couldn't save that ritual. Please try again.");
    }
  };

  return (
    <RitualsShell crumbs={[{ label: "My Rituals" }]}>
      <header className="text-center pt-6 pb-10">
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-3">My Rituals</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Gather cards, spreads and resources into rituals of your own. Return to them in your own rhythm — there is nothing to keep up with.
        </p>
      </header>

      {error && <p role="alert" className="text-destructive text-center mb-6">We couldn't load your rituals. Please refresh to try again.</p>}

      <div className="grid gap-6 md:grid-cols-3">
        {RHYTHMS.map((g) => {
          const list = rituals.filter((r) => r.rhythm === g.value);
          return (
            <section key={g.value} aria-labelledby={`rhythm-${g.value}`} className="bg-card border border-border rounded-lg p-5">
              <h2 id={`rhythm-${g.value}`} className="font-serif text-2xl text-foreground mb-4">{g.label}</h2>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (
                <ul className="space-y-2 mb-4">
                  {list.map((r) => (
                    <li key={r.id}>
                      <Link to={`/rituals/${r.id}`} className="block rounded-md border border-border px-3 py-3 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <span className="font-medium text-foreground">{r.name}</span>
                        {openVisit.has(r.id) && <span className="ml-2 text-xs text-primary">Visit in progress</span>}
                        {r.intention && <span className="block text-sm text-muted-foreground line-clamp-2">{r.intention}</span>}
                      </Link>
                    </li>
                  ))}
                  {list.length === 0 && <li className="text-sm text-muted-foreground">No {g.label.toLowerCase()} rituals yet.</li>}
                </ul>
              )}
              {creatingIn === g.value ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor={`name-${g.value}`}>Name</Label>
                    <Input id={`name-${g.value}`} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoFocus />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`int-${g.value}`}>Intention (optional)</Label>
                    <Textarea id={`int-${g.value}`} value={intention} onChange={(e) => setIntention(e.target.value)} rows={2} />
                  </div>
                  {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={submit} disabled={!name.trim() || create.isPending}>
                      {create.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Create
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setCreatingIn(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => { setCreatingIn(g.value); setName(""); setIntention(""); setFormError(null); }}>
                  <Plus className="h-4 w-4 mr-1" /> Create a Ritual
                </Button>
              )}
            </section>
          );
        })}
      </div>

      <section aria-labelledby="visit-history" className="mt-12">
        <h2 id="visit-history" className="font-serif text-2xl text-foreground mb-4 flex items-center gap-2">
          <Flame className="h-5 w-5 text-primary" aria-hidden /> Visit history
        </h2>
        <RitualVisitHistory visits={visits} rituals={rituals} showFilter />
      </section>
    </RitualsShell>
  );
};

export default MyRituals;
export { format };
