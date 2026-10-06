import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Ritual, RitualVisit, RHYTHMS } from "@/lib/rituals";

/** Dated list of ritual visits; optional filter by one ritual. */
export default function RitualVisitHistory({
  visits, rituals = [], showFilter = false,
}: { visits: RitualVisit[]; rituals?: Ritual[]; showFilter?: boolean }) {
  const [filter, setFilter] = useState("all");
  const shown = filter === "all" ? visits : visits.filter((v) => v.ritual_id === filter);

  return (
    <div>
      {showFilter && rituals.length > 1 && (
        <div className="mb-4">
          <label htmlFor="ritual-filter" className="text-sm text-muted-foreground mr-2">Show</label>
          <select id="ritual-filter" value={filter} onChange={(e) => setFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">All rituals</option>
            {rituals.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
      )}
      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">No visits yet. When you begin a ritual, your visits will gather here.</p>
      ) : (
        <ul className="space-y-2">
          {shown.map((v) => (
            <li key={v.id}>
              <Link
                to={v.status === "in_progress" ? `/rituals/${v.ritual_id}/visit` : `/rituals/visits/${v.id}`}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-border bg-card px-4 py-3 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span>
                  <span className="font-medium text-foreground">{v.ritual_name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {RHYTHMS.find((r) => r.value === v.ritual_rhythm)?.label}
                  </span>
                </span>
                <span className="text-sm text-muted-foreground">
                  {v.status === "in_progress"
                    ? `In progress · started ${format(new Date(v.started_at), "d MMM yyyy")}`
                    : format(new Date(v.saved_at ?? v.started_at), "d MMM yyyy")}
                </span>
                {v.closing_reflection && (
                  <span className="basis-full text-sm text-muted-foreground line-clamp-2">{v.closing_reflection}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
