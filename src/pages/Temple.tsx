import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMemberState } from "@/hooks/useMemberState";
import NavActions from "@/components/NavActions";
import { Button } from "@/components/ui/button";
import { WelcomeHome } from "@/components/temple/WelcomeHome";
import { ContinueJourney } from "@/components/temple/ContinueJourney";
import { BeginPractice } from "@/components/temple/BeginPractice";
import { ExploreDoors } from "@/components/temple/ExploreDoors";
import { LiveAndSupport } from "@/components/temple/LiveAndSupport";
import { RecommendationGrid } from "@/components/temple/RecommendationGrid";
import { useHomeRecommendations } from "@/hooks/useHomeRecommendations";
import { ExpiredAccess } from "@/components/temple/ExpiredAccess";
import { ScheduledAccess } from "@/components/temple/ScheduledAccess";

/** Wrapper that only mounts recommendation queries once member access is resolved. */
function RecommendedSection({ enabled }: { enabled: boolean }) {
  const { data } = useHomeRecommendations("recommended", enabled);
  if (!data || data.length === 0) return null;
  return (
    <section aria-labelledby="recommended-heading" className="mb-12">
      <h2
        id="recommended-heading"
        className="font-serif text-2xl text-foreground mb-3"
      >
        Recommended for you now
      </h2>
      <RecommendationGrid items={data} />
    </section>
  );
}

function SeasonalSection({ enabled }: { enabled: boolean }) {
  const { data } = useHomeRecommendations("seasonal", enabled);
  if (!data || data.length === 0) return null;
  return (
    <section aria-labelledby="seasonal-heading" className="mb-12">
      <h2
        id="seasonal-heading"
        className="font-serif text-2xl text-foreground mb-3"
      >
        New or seasonal in The Temple
      </h2>
      <RecommendationGrid items={data} />
    </section>
  );
}

const Temple = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const {
    isAdmin,
    founderBadge,
    foundingMemberSince,
    manualFullAccess,
    error: memberError,
    hasFullTempleAccess,
    loading: memberLoading,
  } = useMemberState();

  const [displayName, setDisplayName] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Redirect anonymous users. Do not run any member queries until we know who the user is.
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  // Preferred name: profiles.full_name if present. Never fall back to email.
  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setDisplayName(null);
      setProfileLoaded(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const name = (data?.full_name || "").toString().trim();
      setDisplayName(name ? name.split(/\s+/)[0] : null);
      setProfileLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Access resolution gate. Personal queries do NOT run until this is true.
  const accessResolved = !authLoading && !memberLoading && !!user;
  const hasFullAccess = accessResolved && hasFullTempleAccess;

  if (authLoading || memberLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-serif text-xl">
          Opening The Temple…
        </div>
      </div>
    );
  }

  // Authenticated but not currently entitled. State precedence:
  //   error → scheduled → expired → (revoked_only | none) general no-access.
  //
  // Never show expired copy for revoked-only history, lookup failure, or a
  // user who never held access. Manual access alone does NOT grant Founder,
  // subscriber or billing wording.
  if (!hasFullAccess) {
    // Fail-closed: an access-check RPC failure must be distinguishable
    // from a confirmed no-access result.
    if (memberError) {
      return (
        <div className="min-h-screen bg-background relative">
          <div className="absolute top-4 right-4 z-20">
            <NavActions />
          </div>
          <div
            role="alert"
            className="max-w-xl mx-auto px-4 pt-24 pb-16 text-center"
          >
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
    // Scheduled access takes precedence over expired history for a user
    // who has both an old expired grant and a future scheduled grant —
    // `manualFullAccess.state` is already ordered that way in the RPC.
    if (manualFullAccess.state === "scheduled") {
      return <ScheduledAccess startsAt={manualFullAccess.startsAt} />;
    }
    if (manualFullAccess.state === "expired") {
      return <ExpiredAccess expiresAt={manualFullAccess.expiresAt} />;
    }
    // 'revoked_only' and 'none' both fall through to the general
    // no-access state below. Revoked history never renders the
    // expired/join CTA copy.
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

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute top-4 right-4 z-20">
        <NavActions />
      </div>

      <main className="max-w-6xl mx-auto px-4 py-10 sm:py-14">
        <WelcomeHome
          displayName={profileLoaded ? displayName : null}
          showFounderBadge={!!founderBadge}
          foundingSince={foundingMemberSince}
        />

        <ContinueJourney enabled={hasFullAccess} />
        <BeginPractice />
        <ExploreDoors />
        <RecommendedSection enabled={hasFullAccess} />
        <SeasonalSection enabled={hasFullAccess} />
        <LiveAndSupport enabled={hasFullAccess} />
      </main>
    </div>
  );
};

export default Temple;
