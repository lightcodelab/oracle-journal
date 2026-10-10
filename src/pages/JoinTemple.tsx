import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Loader2 } from "lucide-react";
import Auth from "./Auth";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getStoredAffiliateRef } from "@/lib/affiliateTracking";
import { Button } from "@/components/ui/button";
import { AdminEditableImage } from "@/components/admin/AdminEditableImage";
import heroImage from "@/assets/landing-page-banner-v2.webp";

type Offer = { tier: string; currency: string; unit_amount_cents: number | null; checkout_available: boolean };
const features = [
  "Full access to all four Doors of THE TEMPLE",
  "Digital card decks, Sacred Spreads and saved readings",
  "AreekeerA® healing practices, guided meditations and audio playlists",
  "Personal-development courses and intuitive tracking tools",
  "Living Pattern Lab, My Field Notes and Remembrance Letters",
  "Live gatherings, community and session replays",
];

export default function JoinTemple() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.rpc("get_current_membership_offer").then(({ data }) => {
      if (!active) return;
      const current = data as unknown as Offer | null;
      setOffer(current);
      if (current?.checkout_available && current.unit_amount_cents === 3500 && current.currency.toLowerCase() === "aud") {
        sessionStorage.setItem("pendingCheckoutOffer", current.tier);
        sessionStorage.setItem("pendingCheckoutCadence", "monthly");
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const [wasManual, setWasManual] = useState(false);
  useEffect(() => {
    if (!user) { setWasManual(false); return; }
    let active = true;
    void Promise.all([
      supabase.from("manual_full_access_grants").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("manual_access_grants").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]).then(([a, b]) => { if (active) setWasManual((a.count ?? 0) + (b.count ?? 0) > 0); });
    return () => { active = false; };
  }, [user]);

  const available = offer?.checkout_available && offer.unit_amount_cents === 3500 && offer.currency.toLowerCase() === "aud";
  const checkout = async () => {
    if (!available || checkingOut) return;
    setCheckingOut(true);
    try {
      sessionStorage.removeItem("pendingCheckoutOffer");
      sessionStorage.removeItem("pendingCheckoutCadence");
      const ref = getStoredAffiliateRef();
      const { data, error } = await supabase.functions.invoke("stripe-checkout", {
        body: { cadence: "monthly", affiliateCode: ref?.code ?? null, affiliateLinkCode: ref?.linkCode ?? null, commissionModel: ref?.commissionModel ?? null },
      });
      if (error || !data?.url) throw new Error("Checkout unavailable");
      window.location.assign(data.url);
    } catch {
      toast({ title: "Checkout unavailable", description: "We couldn't open the payment page. Please try again.", variant: "destructive" });
      setCheckingOut(false);
    }
  };

  return (
    <section className="dark-theme min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-3">
        <div className="px-6 py-10 sm:px-10 md:px-6 md:py-12 lg:px-10">
          <p className="mb-3 text-sm text-primary-strong">THE TEMPLE of Sustainment</p>
          <h1 className="font-serif text-3xl leading-tight sm:text-4xl">Join THE TEMPLE</h1>
          <p className="mt-5 font-serif text-3xl">$35 AUD <span className="font-sans text-base text-muted-foreground">per month</span></p>
          <p className="mt-2 text-sm text-muted-foreground">Monthly membership. Full Temple access.</p>
          <ul className="mt-7 space-y-3 text-sm leading-relaxed">
            {features.map(feature => <li key={feature} className="flex items-start gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" /><span>{feature}</span></li>)}
          </ul>
        </div>
        <div className="border-t border-border px-6 py-10 sm:px-10 md:border-l md:border-t-0 md:px-6 md:py-12 lg:px-10">
          {loading || authLoading ? <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading membership" /> : !available ? (
            <div><p className="text-sm text-muted-foreground">The $35 monthly offer is not currently available.</p><Button asChild variant="outline" className="mt-4"><Link to="/#membership">View current membership</Link></Button></div>
          ) : user ? (
            <><p className="mb-5 font-serif text-xl leading-snug">{wasManual ? "We are so happy you love The Temple so much and want to continue using it." : "Welcome back, we can't wait to see you inside The Temple."}</p><Button size="lg" className="w-full" disabled={checkingOut} onClick={checkout}>{checkingOut ? "Opening payment page…" : "Join The Temple"}</Button><p className="mt-3 text-center text-xs text-muted-foreground">Continue to secure payment with Stripe.</p></>
          ) : <Auth membershipSignup />}
        </div>
        <div className="md:flex md:items-center">
          <AdminEditableImage src={heroImage} imageKey="join-page-image" pencilAlwaysVisible alt="An open conservatory doorway overlooking a sunlit garden." fetchPriority="high" wrapperClassName="w-full" className="block h-auto w-full" />
        </div>
      </div>
    </section>
  );
}