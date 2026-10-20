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
  "DOOR OF REMEMBRANCE:\n- 4x Digital card decks you can shuffle (more will be added as we create them)\n- Companion Courses to go deeper on a card, with Journalling Prompts & Questions, Rituals, and Energy Clearings\n- 6x Sacred Spreads with personalised readings\n- The Remembrance Letters - a 12 month pilgrimage through themed personalised readings\n- Saved Readings so you can return\n- My Field Notes - a Private Journal area to keep track of your experiments and experiences with a tracking of overarching themes and patterns",
  "DOOR OF DEVOTION:\n- 49x AreekeerA® healing practices and guided meditations (more being added) to support physical and energetic wellbeing\n- Create Personal Playlists and Rituals to return to\n- Energy Hygiene Practices to protect, cleanse, and support your energy bodies during close contact with other people (in client work or daily life)",
  "DOOR OF BECOMING:\n- 10x Personal development courses to guide you in stepping into the new version of yourself\n- Transformation Tracking Tools to track your progress in your daily life",
  "",
  "DOOR OF COMMUNION:\n- Live Gatherings\n- Live Readings\n- Live Meditation Classes\n- Open Office Hours if you need guided support or recommendations\n- Connection with likeminded people on the same journey\n",
];

const introText = `THE TEMPLE of Sustainment is a quiet, sacred space for your self-discovery.
A place to listen to your intuition, reconnect with what your body and soul already know, and come home to yourself.
And it is also practical: healing practices for the days that feel heavy, rituals to steady your energy, courses and tracking tools to help you change what you want to be different in your daily life.
Whether you are just beginning to listen inward or have been walking this path for years, The Temple meets you where you are and walks beside you as you boldly step into who you are becoming.`;

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
    <section className="light-theme min-h-screen bg-background text-foreground">
      {/* Banner: the doorway image sits behind the words. The woman is seated at
          the left of the frame, so the words hold the right and the scrim deepens
          toward them, leaving her in clean, unscrimmed light. */}
      <div className="relative isolate overflow-hidden border-b border-border">
        <AdminEditableImage
          src={heroImage}
          imageKey="join-page-image"
          pencilAlwaysVisible
          alt="An open conservatory doorway overlooking a sunlit garden."
          wrapperClassName="absolute inset-0 h-full w-full"
          className="h-full w-full object-cover object-left md:object-center"
        />
        {/* Phone: the crop keeps the woman in frame, so the scrim runs deep from
            the bottom where the words sit and lifts off above her. */}
        <div className="absolute inset-0 bg-gradient-to-t from-image-overlay/95 via-image-overlay/72 to-image-overlay/35 md:hidden" />
        {/* Desktop: she sits at the left, so the deep scrim runs in from the right
            and lifts off before it reaches her. */}
        <div className="absolute inset-0 hidden bg-gradient-to-l from-image-overlay/95 via-image-overlay/70 to-transparent md:block" />
        <div className="relative mx-auto flex min-h-[26rem] w-full max-w-6xl items-end px-6 py-14 sm:px-10 md:min-h-[30rem] md:items-center md:justify-end md:py-16">
          <div className="max-w-xl md:ml-auto">
            <h2 className="font-serif text-2xl leading-snug text-on-image sm:text-3xl">
              A sanctuary for the part of you that knows there is more
            </h2>
            <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-on-image/90">{introText}</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="px-6 py-10 sm:px-10 md:px-10 md:py-12">
          <p className="mb-3 text-sm text-primary-strong">THE TEMPLE of Sustainment</p>
          <h1 className="font-serif text-3xl leading-tight sm:text-4xl">Join THE TEMPLE</h1>
          <p className="mt-5 font-serif text-3xl">$35 AUD <span className="font-sans text-base text-muted-foreground">per month</span></p>
          <p className="mt-2 text-sm text-muted-foreground">Monthly membership. Full Temple access.</p>
          <ul className="mt-7 space-y-3 text-sm leading-relaxed">
            {features.filter(Boolean).map(feature => (
              <li key={feature} className="flex items-start gap-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span className="whitespace-pre-line">
                  {feature.includes("\n") ? (
                    <>
                      <span className="font-semibold">{feature.slice(0, feature.indexOf("\n"))}</span>
                      {feature.slice(feature.indexOf("\n"))}
                    </>
                  ) : (
                    <span className="font-semibold">{feature.trimEnd()}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t border-border px-6 py-10 sm:px-10 md:grid md:content-center md:border-l md:border-t-0 md:px-10 md:py-12">
          {loading || authLoading ? <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading membership" /> : !available ? (
            <div><p className="text-sm text-muted-foreground">The $35 monthly offer is not currently available.</p><Button asChild variant="outline" className="mt-4"><Link to="/#membership">View current membership</Link></Button></div>
          ) : user ? (
            <><p className="mb-5 font-serif text-xl leading-snug">{wasManual ? "We are so happy you love The Temple so much and want to continue using it." : "Welcome back, we can't wait to see you inside The Temple."}</p><Button size="lg" className="w-full" disabled={checkingOut} onClick={checkout}>{checkingOut ? "Opening payment page…" : "Join The Temple"}</Button><p className="mt-3 text-center text-xs text-muted-foreground">Continue to secure payment with Stripe.</p></>
          ) : <Auth membershipSignup />}
        </div>
      </div>
    </section>
  );
}