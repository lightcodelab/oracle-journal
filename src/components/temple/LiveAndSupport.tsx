import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Radio, User, Film } from "lucide-react";

const AU_TZ = "Australia/Melbourne";

function formatAU(iso: string): string {
  try {
    const d = new Date(iso);
    const date = d.toLocaleString("en-AU", {
      timeZone: AU_TZ,
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    const time = d.toLocaleString("en-AU", {
      timeZone: AU_TZ,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${date}, ${time} AEST/AEDT`;
  } catch {
    return "";
  }
}

export function LiveAndSupport({ enabled }: { enabled: boolean }) {
  const { data: nextSession } = useQuery({
    queryKey: ["home-next-live-session"],
    enabled,
    queryFn: async () => {
      // Use the safe public view. Session must be scheduled and in the future.
      const { data, error } = await supabase
        .from("live_sessions_public")
        .select("id, title, scheduled_at, session_type, status")
        .eq("status", "scheduled")
        .gt("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return data as
        | { id: string; title: string; scheduled_at: string; session_type: string }
        | null;
    },
    staleTime: 60_000,
  });

  return (
    <section aria-labelledby="live-heading" className="mb-12">
      <h2 id="live-heading" className="font-serif text-2xl text-foreground mb-3">
        Live, community and support
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          to={nextSession ? "/all-live-sessions" : "/all-live-sessions"}
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
        >
          <Card className="h-full bg-card/70 border-border/60 hover:border-primary/40 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-primary mb-2">
                <Calendar className="h-4 w-4" aria-hidden />
                <span className="text-xs uppercase tracking-wider">
                  {nextSession ? "Next live session" : "Live offerings"}
                </span>
              </div>
              {nextSession ? (
                <>
                  <p className="font-serif text-lg text-foreground line-clamp-2">
                    {nextSession.title}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatAU(nextSession.scheduled_at)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Explore upcoming live readings, classes, workshops and meditations.
                </p>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link
          to="/communion/live-replays"
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
        >
          <Card className="h-full bg-card/70 border-border/60 hover:border-primary/40 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-primary mb-2">
                <Film className="h-4 w-4" aria-hidden />
                <span className="text-xs uppercase tracking-wider">Live replays</span>
              </div>
              <p className="font-serif text-lg text-foreground">Watch again</p>
              <p className="text-sm text-muted-foreground mt-1">
                Return to past live gatherings on your own time.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link
          to="/account"
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
        >
          <Card className="h-full bg-card/70 border-border/60 hover:border-primary/40 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-primary mb-2">
                <User className="h-4 w-4" aria-hidden />
                <span className="text-xs uppercase tracking-wider">Account</span>
              </div>
              <p className="font-serif text-lg text-foreground">Your membership</p>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your details, subscription and preferences.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </section>
  );
}