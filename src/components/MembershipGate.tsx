import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Loader2 } from "lucide-react";
import NavActions from "@/components/NavActions";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useMemberState } from "@/hooks/useMemberState";
import PreviewLock from "@/components/PreviewLock";

/**
 * Site-wide gate: member content only renders once an active, paid
 * membership (or admin / manual full access) is confirmed. Free-reading
 * accounts and signed-out visitors see the locked screen instead.
 */
const OPEN_EXACT = new Set([
  "/",
  "/membership",
  "/free-reading",
  "/join",
  "/auth",
  "/reset-password",
  "/remembrance/spreads",
  "/readings",
  "/account",
  "/profile",
  "/membership/success",
  "/affiliate",
]);
const OPEN_PREFIXES = ["/r/", "/quiz/", "/.lovable/"];

const isOpenPath = (path: string) =>
  OPEN_EXACT.has(path.replace(/\/+$/, "") || "/") ||
  OPEN_PREFIXES.some((p) => path.startsWith(p));

const PREVIEW_EXACT = new Set(["/temple", "/remembrance", "/devotion", "/becoming", "/communion"]);
const isPreviewPath = (path: string) =>
  PREVIEW_EXACT.has(path.replace(/\/+$/, "")) ||
  /^\/(remembrance|devotion|becoming)\/section\//.test(path);

export const MembershipGate = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { hasFullTempleAccess, loading: memberLoading, refetch } = useMemberState();

  // The gate stays mounted for the whole visit, so a person who was locked
  // out (e.g. just paid, before the payment confirmation landed) must be
  // re-checked as they move around or return to the tab — never cached as locked.
  useEffect(() => {
    if (user && !hasFullTempleAccess && !memberLoading) refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
  useEffect(() => {
    if (!user || hasFullTempleAccess) return;
    const onFocus = () => refetch();
    window.addEventListener("focus", onFocus);
    const t = window.setInterval(refetch, 15000);
    return () => { window.removeEventListener("focus", onFocus); window.clearInterval(t); };
  }, [user, hasFullTempleAccess, refetch]);

  if (isOpenPath(pathname)) return <>{children}</>;

  if (authLoading || (user && memberLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading" />
      </div>
    );
  }

  if (user && hasFullTempleAccess) return <>{children}</>;

  // Free accounts can look around the Temple and the four Doors, but not use them.
  if (user && isPreviewPath(pathname)) return <PreviewLock allowLinks={pathname.replace(/\/+$/, "") === "/temple"}>{children}</PreviewLock>;

  return (
    <div className="min-h-screen bg-background">
      <header className="max-w-3xl mx-auto px-4 pt-4 pb-3 flex items-center justify-between gap-3">
        <Link to="/" className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <Home className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="font-medium truncate">THE TEMPLE of Sustainment</span>
        </Link>
        <NavActions />
      </header>
      <div className="max-w-xl mx-auto px-4 pt-16 pb-16 text-center">
        <h1 className="font-serif text-3xl text-foreground mb-4">THE TEMPLE awaits</h1>
        <p className="text-muted-foreground mb-8">
          An active membership opens THE TEMPLE. Return to the entrance to join us in THE TEMPLE now.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg">
            <Link to="/#membership">Return to the entrance</Link>
          </Button>
          {user ? (
            <Button asChild size="lg" variant="outline">
              <Link to="/readings">Return to your saved reading</Link>
            </Button>
          ) : (
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MembershipGate;
