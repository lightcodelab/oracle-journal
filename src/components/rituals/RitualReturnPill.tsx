import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const KEY = "temple.activeRitualVisit";

export type ActiveVisit = { ritualId: string; ritualName: string };

export const setActiveRitualVisit = (v: ActiveVisit | null) => {
  try {
    if (v) sessionStorage.setItem(KEY, JSON.stringify(v));
    else sessionStorage.removeItem(KEY);
  } catch { /* storage unavailable */ }
};

const readActive = (): ActiveVisit | null => {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/** Floating "Return to ritual" link while a visit step is open elsewhere. */
export function RitualReturnPill() {
  const { pathname } = useLocation();
  const [active, setActive] = useState<ActiveVisit | null>(null);
  useEffect(() => setActive(readActive()), [pathname]);
  if (!active || pathname.startsWith("/rituals")) return null;
  return (
    <div className="fixed left-1/2 -translate-x-1/2 z-40" style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}>
      <Link
        to={`/rituals/${active.ritualId}/visit`}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-primary/40 bg-card px-4 text-sm text-foreground shadow-lg hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Return to {active.ritualName}
      </Link>
    </div>
  );
}
