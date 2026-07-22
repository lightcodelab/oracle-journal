import { Link } from "react-router-dom";
import NavActions from "@/components/NavActions";
import { Button } from "@/components/ui/button";
import { formatMelbourneLong } from "@/lib/manualAccessDates";

/**
 * Dedicated state shown ONLY when the sole remaining canonical manual
 * full-access grant is naturally expired (revoked_at IS NULL,
 * expires_at <= now()) and the user is NOT an active member or admin.
 *
 * Never shown for revoked-only history, lookup failures, or users who
 * never held access.
 */
export function ExpiredAccess({ expiresAt }: { expiresAt: string | null }) {
  let when: string | null = null;
  if (expiresAt) {
    const d = new Date(expiresAt);
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
          Your Temple access period has ended
        </h1>
        <p className="text-muted-foreground mb-2">
          Your time-limited access to The Temple has now come to a close. If
          you would like to continue exploring the practices, resources and
          gatherings within The Temple, you can join as a member.
        </p>
        {when && (
          <p className="text-xs text-muted-foreground mb-8">
            Access ended {when}.
          </p>
        )}
        <Button asChild size="lg">
          <Link to="/">Join The Temple</Link>
        </Button>
      </main>
    </div>
  );
}