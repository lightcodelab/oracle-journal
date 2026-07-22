import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useMemberState } from "@/hooks/useMemberState";
import NavActions from "@/components/NavActions";
import { Button } from "@/components/ui/button";
import { ScheduledAccess } from "@/components/temple/ScheduledAccess";
import { ExpiredAccess } from "@/components/temple/ExpiredAccess";
import { useEffect } from "react";

/**
 * Shared authorization boundary for every protected Temple route
 * (Temple, Remembrance, Devotion, Communion and their child routes).
 *
 * Canonical rule (single access level):
 *   full access = admin OR active member OR active manual full-access grant.
 *
 * Denied states, in precedence order (from get_member_state):
 *   error       → generic error card (never masquerade as denial)
 *   scheduled   → ScheduledAccess (start date shown, no early access)
 *   expired     → ExpiredAccess ("Join The Temple" CTA to /)
 *   revoked_only / none → general "The Temple awaits" card
 *
 * This component intentionally does NOT know about Doors, tiers, or
 * buckets. Legacy Door-scoped records never gate access here.
 */
export function TempleAccessGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const {
    hasFullTempleAccess,
    manualFullAccess,
    error,
    loading: memberLoading,
  } = useMemberState();

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  if (authLoading || memberLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-serif text-xl">
          Opening The Temple…
        </div>
      </div>
    );
  }

  if (hasFullTempleAccess) return <>{children}</>;

  if (error) {
    return (
      <div className="min-h-screen bg-background relative">
        <div className="absolute top-4 right-4 z-20">
          <NavActions />
        </div>
        <div role="alert" className="max-w-xl mx-auto px-4 pt-24 pb-16 text-center">
          <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-4">
            We couldn't confirm your access
          </h1>
          <p className="text-muted-foreground mb-8">
            Something went wrong while checking your access to The Temple.
            Please try again in a moment.
          </p>
          <Button onClick={() => window.location.reload()} size="lg">
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (manualFullAccess.state === "scheduled") {
    return <ScheduledAccess startsAt={manualFullAccess.startsAt} />;
  }
  if (manualFullAccess.state === "expired") {
    return <ExpiredAccess expiresAt={manualFullAccess.expiresAt} />;
  }

  // revoked_only or none — general no-access. Never reveal expired copy here.
  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute top-4 right-4 z-20">
        <NavActions />
      </div>
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-16 text-center">
        <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-4">
          The Temple awaits
        </h1>
        <p className="text-muted-foreground mb-2">
          An active membership opens the whole Temple — every practice, every
          resource, every live gathering.
        </p>
        <p className="text-muted-foreground mb-8">
          Return to the entrance to see what is currently open.
        </p>
        <Button asChild size="lg">
          <Link to="/">Return to the entrance</Link>
        </Button>
      </div>
    </div>
  );
}