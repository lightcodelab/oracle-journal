import { Link } from "react-router-dom";
import NavActions from "@/components/NavActions";
import { Button } from "@/components/ui/button";
import { formatMelbourneLong } from "@/lib/manualAccessDates";

/**
 * Distinct state for a user whose manual full-access window has not yet
 * started. Displays the exact scheduled start (local timezone) but grants
 * no early access to protected content.
 */
export function ScheduledAccess({ startsAt }: { startsAt: string | null }) {
  let when: string | null = null;
  if (startsAt) {
    const d = new Date(startsAt);
    if (!Number.isNaN(d.getTime())) {
      try {
        when = formatMelbourneLong(d);
      } catch {
        when = null;
      }
    }
  }
  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute top-4 right-4 z-20">
        <NavActions />
      </div>
      <main className="max-w-2xl mx-auto px-4 pt-24 pb-16 text-center">
        <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-4">
          Your Temple access is scheduled
        </h1>
        <p className="text-muted-foreground mb-2">
          Your time-limited access to The Temple has not yet begun. Please
          return at the scheduled start to enter.
        </p>
        {when && (
          <p className="text-foreground font-medium mb-8">Starts {when}</p>
        )}
        <Button asChild variant="outline" size="lg">
          <Link to="/">Return to the entrance</Link>
        </Button>
      </main>
    </div>
  );
}