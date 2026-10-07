import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays } from "lucide-react";

const AU_TZ = "Australia/Melbourne";

type EventRow = { id: string; title: string; scheduled_at: string; session_type: string };

const dayKey = (d: Date) =>
  d.toLocaleDateString("en-CA", { timeZone: AU_TZ }); // YYYY-MM-DD

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("en-AU", {
    timeZone: AU_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

/** Calendar of upcoming live gatherings, shown when the focus is Communion. */
export function CommunionEventsCalendar({ enabled }: { enabled: boolean }) {
  const [selected, setSelected] = useState<Date | undefined>();

  const { data: events = [] } = useQuery({
    queryKey: ["communion-events-calendar"],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("live_sessions_public")
        .select("id, title, scheduled_at, session_type, status")
        .in("status", ["scheduled", "live"])
        .gt("scheduled_at", new Date(Date.now() - 3 * 3600_000).toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(50);
      if (error) return [];
      return (data ?? []) as EventRow[];
    },
  });

  const eventDays = useMemo(
    () => events.map((e) => new Date(e.scheduled_at)),
    [events],
  );

  const shown = selected
    ? events.filter((e) => dayKey(new Date(e.scheduled_at)) === dayKey(selected))
    : events.slice(0, 5);

  return (
    <section aria-labelledby="events-calendar-heading" className="mb-12">
      <h2 id="events-calendar-heading" className="font-serif text-2xl text-foreground mb-3">
        Calendar of Events
      </h2>
      <div className="grid gap-4 md:grid-cols-[auto_1fr] rounded-lg border border-border/50 bg-card/50 p-4">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={setSelected}
          modifiers={{ hasEvent: eventDays }}
          modifiersClassNames={{
            hasEvent: "font-semibold text-primary underline decoration-primary underline-offset-4",
          }}
          className="mx-auto md:mx-0"
        />
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-primary-strong mb-3">
            {selected
              ? selected.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })
              : "Upcoming gatherings"}
          </p>
          {shown.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {selected ? "No gatherings on this day." : "No gatherings are scheduled yet — check back soon."}
            </p>
          ) : (
            <ul className="space-y-2">
              {shown.map((e) => (
                <li key={e.id}>
                  <Link
                    to="/all-live-sessions"
                    className="flex items-start gap-3 rounded-md border border-border/40 p-3 hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <CalendarDays className="h-4 w-4 mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-sm text-foreground truncate">{e.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {fmtTime(e.scheduled_at)} AEST/AEDT · <span className="capitalize">{e.session_type}</span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link to="/all-live-sessions" className="mt-3 inline-block text-sm text-primary hover:underline">
            See all live sessions →
          </Link>
        </div>
      </div>
    </section>
  );
}
