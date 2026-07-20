import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useMemberState } from "@/hooks/useMemberState";
import { supabase } from "@/integrations/supabase/client";
import { getStoredAffiliateRef } from "@/lib/affiliateTracking";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Sparkles,
  Heart,
  Loader2,
  DoorOpen,
  Mail,
  BookHeart,
  CalendarClock,
} from "lucide-react";
import { motion } from "framer-motion";
import templeBanner from "@/assets/temple-banner.png";
import guidesPhoto from "@/assets/julie-tash-guides.jpg";
import ProfileDropdown from "@/components/ProfileDropdown";

type OfferState = "pre_launch" | "founding" | "standard";

interface MembershipOffer {
  state: OfferState;
  tier: string;
  unit_amount_cents: number | null;
  currency: string;
  cadence: string;
  checkout_available: boolean;
  is_founding_window_open: boolean;
  founding_window_opens_at: string | null;
  founding_window_closes_at: string | null;
  server_time: string;
}

const SHOPIFY_URL = "https://thetemple.lightcodelab.com";

const formatAudDate = (iso: string | null) => {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("en-AU", {
      timeZone: "Australia/Sydney",
      dateStyle: "long",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

const Membership = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const {
    isActiveMember,
    isAdmin,
    loading: memberLoading,
  } = useMemberState();

  const [offer, setOffer] = useState<MembershipOffer | null>(null);
  const [offerLoading, setOfferLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Fetch server-authoritative offer state (public: anon may call)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc(
        "get_current_membership_offer",
      );
      if (!cancelled) {
        if (error) {
          console.error("offer fetch error", error);
        } else if (data) {
          setOffer(data as unknown as MembershipOffer);
        }
        setOfferLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Active members bypass the public page
  useEffect(() => {
    if (!authLoading && !memberLoading && user && isActiveMember) {
      navigate("/temple", { replace: true });
    }
  }, [authLoading, memberLoading, user, isActiveMember, navigate]);

  const startCheckout = async () => {
    if (!offer?.checkout_available) return;
    if (!user) {
      // Route through auth first; membership will resume checkout after login
      sessionStorage.setItem("pendingCheckoutOffer", offer.tier);
      navigate("/auth?mode=signup");
      return;
    }
    setCheckoutLoading(true);
    try {
      const ref = getStoredAffiliateRef();
      const { data, error } = await supabase.functions.invoke(
        "stripe-checkout",
        {
          body: {
            // NB: no priceId, no mode — server selects Live price
            affiliateCode: ref?.code ?? null,
            affiliateLinkCode: ref?.linkCode ?? null,
            commissionModel: ref?.commissionModel ?? null,
          },
        },
      );
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      toast({
        title: "Checkout unavailable",
        description:
          "We couldn't start checkout right now. Please try again shortly.",
        variant: "destructive",
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const state: OfferState = offer?.state ?? "pre_launch";
  const priceAud = useMemo(() => {
    if (!offer?.unit_amount_cents) return null;
    return Math.round(offer.unit_amount_cents / 100);
  }, [offer]);
  const openingDate = formatAudDate(
    offer?.founding_window_opens_at ?? "2026-09-14T00:00:00Z",
  );

  const loading = authLoading || offerLoading || (user && memberLoading);
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const HeroCta = () => {
    if (user && !isActiveMember) {
      // Signed in but not active — offer join/enter based on state
      if (state === "pre_launch") {
        return (
          <Button size="lg" variant="outline" disabled>
            <CalendarClock className="w-4 h-4 mr-2" />
            Opening {openingDate}
          </Button>
        );
      }
      return (
        <Button size="lg" onClick={startCheckout} disabled={checkoutLoading}>
          {checkoutLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <DoorOpen className="w-4 h-4 mr-2" />
          )}
          {state === "founding"
            ? "Become a Founding Member"
            : "Join The Temple"}
        </Button>
      );
    }
    if (state === "pre_launch") {
      return (
        <Button size="lg" variant="outline" disabled>
          <CalendarClock className="w-4 h-4 mr-2" />
          Opening {openingDate}
        </Button>
      );
    }
    return (
      <Button size="lg" onClick={startCheckout} disabled={checkoutLoading}>
        {checkoutLoading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <DoorOpen className="w-4 h-4 mr-2" />
        )}
        {state === "founding"
          ? `Join as a Founding Member — A$${priceAud}/mo`
          : `Join The Temple — A$${priceAud}/mo`}
      </Button>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center gap-3">
          <span className="font-serif text-sm md:text-base text-foreground/80">
            The Temple of Sustainment
          </span>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/admin")}
                  >
                    Admin
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/temple")}
                >
                  Enter Temple
                </Button>
                <ProfileDropdown />
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/auth")}
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-20">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
        <div className="relative max-w-5xl mx-auto px-4 py-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <img
              src={templeBanner}
              alt="The Temple of Sustainment"
              className="w-full max-w-xl mx-auto mb-8"
            />
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif mb-6 text-foreground leading-tight">
              The Temple of Sustainment
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
              A sacred, trauma-informed sanctuary for remembrance, healing, and
              becoming — offered by Julie &amp; Tash Lewin.
            </p>

            {state === "pre_launch" && (
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-sm text-foreground/90">
                <CalendarClock className="w-4 h-4 text-primary" />
                Doors open {openingDate}
              </div>
            )}
            {state === "founding" && (
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-sm text-foreground/90">
                <Sparkles className="w-4 h-4 text-primary" />
                Founding Membership open — A${priceAud} AUD / month
              </div>
            )}
            {state === "standard" && (
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-4 py-2 text-sm text-foreground/80">
                <DoorOpen className="w-4 h-4 text-primary" />
                Membership open — A${priceAud} AUD / month
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-3">
              <HeroCta />
              {!user && (
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => navigate("/auth")}
                >
                  Sign In
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* What membership opens */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-serif mb-3 text-foreground">
              One membership. The whole Temple.
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A single active membership opens every practice, teaching, and
              live gathering inside the app. Enter as often as you need.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                title: "Card decks & readings",
                body: "Draw and save readings from the full library of oracle decks and Sacred Spreads.",
              },
              {
                title: "Meditations & healing practices",
                body: "Guided meditations, energy hygiene practices, and somatic tools you can return to.",
              },
              {
                title: "Healing templates & resources",
                body: "Journal templates, boundary and nervous-system tools, and reference libraries.",
              },
              {
                title: "Courses & learning journeys",
                body: "Short courses and longer paths through Remembrance, Devotion, and Communion.",
              },
              {
                title: "AreekeerA® Protocol Builder",
                body: "Build and follow your own AreekeerA® protocol, gently paced to your capacity.",
              },
              {
                title: "Live offerings each month",
                body: "At least one live class, reading, meditation, or workshop each month — frequency varies with Julie's health and capacity.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-lg border border-border/60 bg-card/40 p-5 flex gap-3"
              >
                <Check className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-serif text-lg text-foreground mb-1">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How to begin */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-serif mb-10 text-foreground">
            How to begin
          </h2>
          <div className="grid md:grid-cols-3 gap-8 text-left">
            <div>
              <div className="text-sm uppercase tracking-widest text-primary mb-2">
                One
              </div>
              <h3 className="font-serif text-xl mb-2 text-foreground">
                Enter
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Cross the threshold — no assessments, no rush.
              </p>
            </div>
            <div>
              <div className="text-sm uppercase tracking-widest text-primary mb-2">
                Two
              </div>
              <h3 className="font-serif text-xl mb-2 text-foreground">
                Choose what supports you now
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A card, a meditation, a template, a live gathering — begin
                wherever feels honest.
              </p>
            </div>
            <div>
              <div className="text-sm uppercase tracking-widest text-primary mb-2">
                Three
              </div>
              <h3 className="font-serif text-xl mb-2 text-foreground">
                Continue at your own pace
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Return as often as you need. Your practice waits for you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Founding invitation — only inside the window */}
      {state === "founding" && (
        <section className="py-20 px-4">
          <div className="max-w-3xl mx-auto rounded-2xl border border-primary/30 bg-gradient-to-b from-primary/10 to-background p-8 md:p-12">
            <div className="flex items-center gap-2 text-primary mb-3">
              <Sparkles className="w-5 h-5" />
              <span className="uppercase text-xs tracking-widest">
                Founding invitation
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-serif mb-4 text-foreground">
              Enter as a Founding Member — A$35 AUD / month
            </h2>
            <ul className="space-y-3 mb-8 text-foreground/90">
              <li className="flex gap-3">
                <Check className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <span>
                  Your A$35 monthly price is retained for as long as your
                  membership remains continuously active.
                </span>
              </li>
              <li className="flex gap-3">
                <Check className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <span>
                  If a payment fails, you receive a 15-day recovery period so
                  your Founding price isn't lost to a missed card.
                </span>
              </li>
              <li className="flex gap-3">
                <Check className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <span>
                  Founding Members carry the Founder badge as a permanent
                  recognition of arriving at the beginning.
                </span>
              </li>
              <li className="flex gap-3">
                <Check className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <span>
                  If you permanently cancel, the Founding price is forfeited.
                  Rejoining later uses the then-current standard price
                  (currently A$50 AUD / month).
                </span>
              </li>
            </ul>
            <HeroCta />
            <p className="text-xs text-muted-foreground mt-4">
              Founding window closes{" "}
              {formatAudDate(offer?.founding_window_closes_at ?? null)}.
            </p>
          </div>
        </section>
      )}

      {/* Physical Temple offerings */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-serif mb-3 text-foreground">
              The Physical Temple
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              For those who wish to hold the work in their hands. These are
              separate, physical offerings ordered from the Temple's shop —
              they are not part of app membership.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Mail,
                title: "Snail Mail",
                body: "Handwritten letters posted to your door, in season.",
              },
              {
                icon: BookHeart,
                title: "The Journal Box",
                body: "A curated box of journaling and healing companions.",
              },
              {
                icon: BookHeart,
                title: "Personalised Journal Box",
                body: "A Journal Box shaped to your season and needs.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-lg border border-border/60 bg-card/40 p-6"
              >
                <Icon className="w-6 h-6 text-primary mb-3" />
                <h3 className="font-serif text-lg mb-2 text-foreground">
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {body}
                </p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Button variant="outline" asChild>
              <a href={SHOPIFY_URL} target="_blank" rel="noreferrer">
                Visit the Temple Shop
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* About Julie and Tash */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-serif mb-10 text-center text-foreground">
            Your Guides
          </h2>
          <div className="grid md:grid-cols-3 gap-8 items-start">
            <div className="flex justify-center">
              <img
                src={guidesPhoto}
                alt="Julie and Tash Lewin"
                className="w-full object-cover grayscale rounded-md"
              />
            </div>
            <div>
              <p className="text-foreground/90 leading-relaxed mb-4">
                <span className="font-semibold text-foreground">
                  Julie Lewin
                </span>{" "}
                is a medical intuitive with over 40 years of experience working
                with the body as an intelligent, communicative system. Her work
                supports the release of long-held survival responses so the
                system can return to safety, repair, and resilience.
              </p>
              <p className="text-foreground/90 leading-relaxed">
                Julie's AreekeerA® Modality was channelled through decades of
                clinical practice and shared with thousands of listeners on
                Insight Timer and beyond.
              </p>
            </div>
            <div>
              <p className="text-foreground/90 leading-relaxed mb-4">
                <span className="font-semibold text-foreground">
                  Tash Lewin
                </span>{" "}
                works at the intersection of trauma, identity, and nervous
                system regulation, helping people understand how protective
                patterns and energetic contracts quietly shape health.
              </p>
              <p className="text-foreground/90 leading-relaxed">
                Through structured, trauma-informed processes, Tash supports
                the rewriting of identity at both psychological and energetic
                levels — without force or bypassing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final context-aware CTA */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-3xl mx-auto text-center">
          {state === "pre_launch" && (
            <>
              <h2 className="text-3xl md:text-4xl font-serif mb-4 text-foreground">
                Doors open {openingDate}
              </h2>
              <p className="text-muted-foreground mb-6">
                Founding Membership opens on this date. If you already have an
                account, you can sign in now.
              </p>
            </>
          )}
          {state === "founding" && (
            <>
              <h2 className="text-3xl md:text-4xl font-serif mb-4 text-foreground">
                Enter The Temple as a Founding Member
              </h2>
              <p className="text-muted-foreground mb-6">
                A$35 AUD / month, retained while your membership remains
                continuously active.
              </p>
            </>
          )}
          {state === "standard" && (
            <>
              <h2 className="text-3xl md:text-4xl font-serif mb-4 text-foreground">
                Enter The Temple
              </h2>
              <p className="text-muted-foreground mb-6">
                A$50 AUD / month. Cancel anytime from your account.
              </p>
            </>
          )}
          <div className="flex flex-wrap justify-center gap-3">
            <HeroCta />
            {!user && (
              <Button
                variant="ghost"
                size="lg"
                onClick={() => navigate("/auth")}
              >
                Sign In
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-8 max-w-2xl mx-auto">
            The Temple offers education, reflection, and self-healing
            practices. It is not a substitute for medical care and makes no
            guarantees of healing outcomes. All prices shown in AUD, billed
            monthly.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Membership;
    <TableCell className="text-muted-foreground">{feature}</TableCell>
    <TableCell className="text-center">
      {t1 ? (
        <Check className="w-5 h-5 text-primary mx-auto" />
      ) : (
        <X className="w-5 h-5 text-muted-foreground/40 mx-auto" />
      )}
    </TableCell>
    <TableCell className="text-center">
      {t2 ? (
        <Check className="w-5 h-5 text-primary mx-auto" />
      ) : (
        <X className="w-5 h-5 text-muted-foreground/40 mx-auto" />
      )}
    </TableCell>
    <TableCell className="text-center">
      {t3 ? (
        <Check className="w-5 h-5 text-primary mx-auto" />
      ) : (
        <X className="w-5 h-5 text-muted-foreground/40 mx-auto" />
      )}
    </TableCell>
  </TableRow>
);

const tierIcons = {
  T1: Sparkles,
  T2: Heart,
  T3: Crown,
};

const tierColors = {
  T1: "from-amber-500/20 to-orange-500/20 border-amber-500/30",
  T2: "from-rose-500/20 to-pink-500/20 border-rose-500/30",
  T3: "from-violet-500/20 to-purple-500/20 border-violet-500/30",
};

const tierBadgeColors = {
  T1: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  T2: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  T3: "bg-violet-500/20 text-violet-300 border-violet-500/30",
};

const bucketLabels: Record<string, string> = {
  remembrance: "Door of Remembrance",
  devotion: "Door of Devotion",
  communion: "Door of Communion",
};

const Membership = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tiers, loading, checkoutLoading, currentTier, subscriptionStatus, startCheckout } = useMembership();
  const [isYearly, setIsYearly] = useState(false);

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  const getYearlySavings = (monthlyPrice: number, yearlyPrice: number) => {
    const yearlyIfMonthly = monthlyPrice * 12;
    const savings = yearlyIfMonthly - yearlyPrice;
    const percent = Math.round((savings / yearlyIfMonthly) * 100);
    return { savings, percent };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-end items-center gap-3">
          {user ? (
            <>
              <Button 
                variant="ghost" 
                onClick={() => navigate('/temple')}
                className="text-sm"
              >
                Enter Temple
              </Button>
              <ProfileDropdown />
            </>
          ) : (
            <Button 
              variant="outline" 
              onClick={() => navigate('/auth')}
              className="text-sm"
            >
              Login
            </Button>
          )}
        </div>
      </header>

      {/* Sales Hero Section */}
      <section className="relative overflow-hidden pt-16">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
        
        <div className="relative max-w-6xl mx-auto px-4 py-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <img 
              src={templeBanner} 
              alt="Temple of Sustainment" 
              className="w-full max-w-2xl mx-auto mb-8"
            />
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif mb-6 text-foreground leading-tight">
              Your Sacred Digital Sanctuary<br />
              <span className="text-primary">for Healing & Transformation</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed">
              Step through the doors of ancient wisdom, reimagined for the modern seeker. 
              Julie & Tash Lewin welcome you to access their powerful proprietary healing protocols, oracle guidance, live ceremonies, and a 
              supportive community — all in one sacred space.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <Badge variant="secondary" className="px-4 py-2 text-sm bg-muted text-muted-foreground">
                Instant Access
              </Badge>
              <Badge variant="secondary" className="px-4 py-2 text-sm bg-muted text-muted-foreground">
                Start when you're ready
              </Badge>
              <Badge variant="secondary" className="px-4 py-2 text-sm bg-muted text-muted-foreground">
                Return when you need
              </Badge>
            </div>
          </motion.div>
        </div>
      </section>


      {/* Social Proof / Trust Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <p className="text-xl md:text-2xl font-serif italic text-foreground/80 mb-6">
              "This is not just an app — it's a living temple. A place to return to again and again 
              for guidance, healing, and remembrance of who you truly are."
            </p>
            <p className="text-muted-foreground">— Tash Lewin, Creator</p>
          </motion.div>
        </div>
      </section>

      {/* AreekeerA Method Section */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center mb-12"
          >
            <p className="text-sm uppercase tracking-widest text-destructive-foreground mb-4">
              Introducing
            </p>
            <h2 className="text-4xl md:text-5xl font-serif mb-6 text-foreground italic">
              The AreekeerA® Method
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              A revolutionary approach to understanding the energetic language of your body — developed over 40 years of clinical practice by Medical Intuitive Julie Lewin.
            </p>
          </motion.div>

          {/* Feature Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="rounded-2xl p-8 md:p-12"
          >
            <div className="grid md:grid-cols-3 gap-8 text-center">
              {/* 40+ Years Proven */}
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-serif mb-2 text-foreground">40+ Years Proven</h3>
                <p className="text-muted-foreground text-sm">
                  Trusted by thousands of clients worldwide
                </p>
              </div>

              {/* Root Cause Focus */}
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mb-4">
                  <Heart className="w-8 h-8 text-destructive-foreground" />
                </div>
                <h3 className="text-xl font-serif mb-2 text-foreground">Guided Creative Visualisations</h3>
                <p className="text-muted-foreground text-sm">
                  A body-based healing modality that works with the energy blueprint beneath physical symptoms
                </p>
              </div>

              {/* Immediate Tools */}
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                  <Zap className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-serif mb-2 text-foreground">Immediate Tools</h3>
                <p className="text-muted-foreground text-sm">
                  Start shifting energy today
                </p>
              </div>
            </div>
          </motion.div>

          {/* Julie Bio Paragraph */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-12 text-center max-w-4xl mx-auto"
          >
            <p className="text-muted-foreground leading-relaxed">
              For over 40 years, Julie Lewin has been a pioneer in Medical Intuition. Her AreekeerA® Modality was channelled through after appearing on the TV Show The Extraordinary twice to international acclaim. With over 1.1 million listens on Insight Timer and a lifetime of clinical practice, she has helped thousands move from chronic pain to extraordinary health. She is excited to finally make her whole body of work available to everyone. It is a paid app because reciprocation is required for true lasting healing to occur.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Benefits Section - Three Doors */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-serif mb-4 text-foreground">
              Three Doors to Your Transformation
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Each door opens to deeper levels of healing, wisdom, and connection. 
              Choose the path that calls to your soul.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Door of Remembrance */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-card border border-amber-500/20 rounded-lg p-6 hover:border-amber-500/40 transition-colors"
            >
              <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7 text-amber-500" />
              </div>
              <h3 className="text-xl font-serif mb-2 text-foreground">The Door of Remembrance</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Reconnect with your inner wisdom through sacred oracle guidance and self-reflection.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground/80">4 Complete Oracle Card Decks with shuffle animations (8 more decks to come)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground/80">Unlimited card readings with deep interpretations</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground/80">Save & revisit meaningful readings</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground/80">Private digital journal for reflections</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground/80">Mini courses to deepen the Remembrance experience</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground/80">Rituals to prepare your spirit and body for healing</span>
                </li>
              </ul>
            </motion.div>

            {/* Door of Devotion */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-card border border-rose-500/20 rounded-lg p-6 hover:border-rose-500/40 transition-colors"
            >
              <div className="w-14 h-14 rounded-full bg-rose-500/10 flex items-center justify-center mb-4">
                <Heart className="w-7 h-7 text-rose-500" />
              </div>
              <h3 className="text-xl font-serif mb-2 text-foreground">The Door of Devotion</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Deepen your practice with personalized healing protocols and sacred rituals.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground/80">Your symptoms automatically mapped to personalised protocols</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground/80">Library of guided meditations</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground/80">Energy hygiene & protection practices</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground/80">Healing templates & somatic tools</span>
                </li>
              </ul>
            </motion.div>

            {/* Door of Communion */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="bg-card border border-violet-500/20 rounded-lg p-6 hover:border-violet-500/40 transition-colors"
            >
              <div className="w-14 h-14 rounded-full bg-violet-500/10 flex items-center justify-center mb-4">
                <Crown className="w-7 h-7 text-violet-500" />
              </div>
              <h3 className="text-xl font-serif mb-2 text-foreground">The Door of Communion</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Join live ceremonies and connect with a global community of seekers.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground/80">Live oracle readings with Julie</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground/80">Weekly healing classes & teachings</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground/80">Interactive workshops & intensives</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground/80">Group meditation ceremonies</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground/80">Full replay library access</span>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Choose Your Path Section */}
      <section className="py-16 px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-serif mb-4 text-foreground">
          Choose Your Path
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Begin your journey of healing and transformation.
          Cancel anytime.
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <Label htmlFor="billing-toggle" className={!isYearly ? "text-foreground" : "text-muted-foreground"}>
            Monthly
          </Label>
          <Switch
            id="billing-toggle"
            checked={isYearly}
            onCheckedChange={setIsYearly}
          />
          <Label htmlFor="billing-toggle" className={isYearly ? "text-foreground" : "text-muted-foreground"}>
            Yearly
          </Label>
          {isYearly && (
            <Badge variant="secondary" className="ml-2 bg-primary/20 text-primary">
              Save up to 17%
            </Badge>
          )}
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 px-4">
        <div className="max-w-6xl mx-auto grid gap-6 md:grid-cols-3">
          {tiers.map((tier) => {
            const TierIcon = tierIcons[tier.code as keyof typeof tierIcons] || Sparkles;
            const colorClass = tierColors[tier.code as keyof typeof tierColors] || tierColors.T1;
            const badgeColor = tierBadgeColors[tier.code as keyof typeof tierBadgeColors] || tierBadgeColors.T1;
            
            const price = isYearly ? tier.yearlyPrice : tier.monthlyPrice;
            const priceAmount = price?.unit_amount_cents || 0;
            
            const isCurrentTier = currentTier === tier.code;
            const isActive = subscriptionStatus === "active" || subscriptionStatus === "trialing";

            const savings = tier.monthlyPrice && tier.yearlyPrice
              ? getYearlySavings(tier.monthlyPrice.unit_amount_cents, tier.yearlyPrice.unit_amount_cents)
              : null;

            return (
              <Card
                key={tier.code}
                className={`relative overflow-hidden border-2 bg-gradient-to-b ${colorClass} transition-all hover:scale-[1.02]`}
              >
                {tier.code === "T2" && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-bl-lg">
                    Most Popular
                  </div>
                )}

                <CardHeader className="text-center pb-2">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-background/50 flex items-center justify-center">
                    <TierIcon className="w-7 h-7 text-foreground" />
                  </div>
                  <Badge className={`mb-2 ${badgeColor} border`}>
                    {tier.name}
                  </Badge>
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {tier.plan?.description || "Access healing content"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="text-center">
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-foreground">
                      {formatPrice(priceAmount)}
                    </span>
                    <span className="text-muted-foreground">
                      /{isYearly ? "year" : "month"}
                    </span>
                    {isYearly && savings && savings.percent > 0 && (
                      <p className="text-sm text-primary mt-1">
                        Save {formatPrice(savings.savings)} ({savings.percent}% off)
                      </p>
                    )}
                  </div>

                  <div className="space-y-3 text-left">
                    <p className="text-sm font-medium text-muted-foreground">Access to the:</p>
                    {tier.buckets.map((bucket) => (
                      <div key={bucket} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm text-foreground">
                          {bucketLabels[bucket] || bucket}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>

                <CardFooter>
                  {isCurrentTier && isActive ? (
                    <Button className="w-full" variant="secondary" disabled>
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => price && startCheckout(price.id)}
                      disabled={!price || checkoutLoading === price?.id}
                    >
                      {checkoutLoading === price?.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        "Subscribe Now"
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-serif mb-8 text-center text-foreground">
            Compare Features
          </h2>
          
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[300px] font-serif text-foreground">Features</TableHead>
                  <TableHead className="text-center font-serif text-foreground">
                    <div className="flex flex-col items-center gap-1">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                      <span>Seeker</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center font-serif text-foreground">
                    <div className="flex flex-col items-center gap-1">
                      <Heart className="w-5 h-5 text-rose-500" />
                      <span>Devotee</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center font-serif text-foreground">
                    <div className="flex flex-col items-center gap-1">
                      <Crown className="w-5 h-5 text-violet-500" />
                      <span>Initiate</span>
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Door of Remembrance Section */}
                <TableRow className="bg-amber-500/10">
                  <TableCell colSpan={4} className="font-serif text-amber-400 font-medium">
                    The Door of Remembrance
                  </TableCell>
                </TableRow>
                <FeatureRow feature="All Digital Card Decks with Shuffle" t1 t2 t3 />
                <FeatureRow feature="Unlimited Card Readings" t1 t2 t3 />
                <FeatureRow feature="Unlimited Spreads" t1 t2 t3 />
                <FeatureRow feature="Save Card Readings & Spreads" t1 t2 t3 />
                <FeatureRow feature="Digital Journal" t1 t2 t3 />
                <FeatureRow feature="Mini Courses" t1 t2 t3 />
                <FeatureRow feature="Rituals" t1 t2 t3 />
                
                {/* Door of Devotion Section */}
                <TableRow className="bg-rose-500/10">
                  <TableCell colSpan={4} className="font-serif text-rose-400 font-medium">
                    The Door of Devotion
                  </TableCell>
                </TableRow>
                <FeatureRow feature="Guided Meditations" t2 t3 />
                <FeatureRow feature="Your AreekeerA® Healing Protocol Builder" t2 t3 />
                
                <FeatureRow feature="Energy Hygiene Practices" t2 t3 />
                <FeatureRow feature="Healing Templates" t2 t3 />
                
                {/* Door of Communion Section */}
                <TableRow className="bg-violet-500/10">
                  <TableCell colSpan={4} className="font-serif text-violet-400 font-medium">
                    The Door of Communion
                  </TableCell>
                </TableRow>
                <FeatureRow feature="Live Readings" t3 />
                <FeatureRow feature="Live Classes" t3 />
                <FeatureRow feature="Live Workshops" t3 />
                <FeatureRow feature="Live Meditation Classes" t3 />
                <FeatureRow feature="All Session Replays" t3 />
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      {/* Your Guides Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-serif mb-12 text-center text-foreground">
              Your Guides
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8 items-start">
              {/* Photo */}
              <div className="flex justify-center">
                <img 
                  src={guidesPhoto}
                  alt="Julie and Tash Lewin"
                  className="w-full object-cover grayscale"
                />
              </div>
              
              {/* Julie's Bio */}
              <div>
                <p className="text-foreground/90 font-sans leading-relaxed mb-4">
                  <span className="font-semibold text-foreground">Julie Lewin</span> is a medical intuitive with over 40 years of experience working with the body as an intelligent, communicative system. Her work focuses on identifying how trauma, stress, and unresolved emotional patterns become stored in the physical body and nervous system — often long before symptoms appear.
                </p>
                <p className="text-foreground/90 font-sans leading-relaxed">
                  Rather than treating symptoms in isolation, Julie tracks chronic pain and illness patterns through time, using the AreekeerA® approach to read the body's energetic and neurological history. Her work supports the release of long-held survival responses so the system can return to safety, repair, and resilience.
                </p>
              </div>
              
              {/* Tash's Bio */}
              <div>
                <p className="text-foreground/90 font-sans leading-relaxed mb-4">
                  <span className="font-semibold text-foreground">Tash Lewin</span> works at the intersection of trauma, identity, and nervous system regulation. Her role within AreekeerA® focuses on helping people understand how subconscious beliefs, protective patterns, and energetic contracts form around unresolved trauma — and how these patterns quietly shape health, relationships, and life outcomes.
                </p>
                <p className="text-foreground/90 font-sans leading-relaxed">
                  Through structured, trauma-informed processes, Tash supports the rewriting of identity at both psychological and energetic levels, allowing new patterns of safety, capacity, and self-trust to emerge without force or bypassing.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ or Trust Signals */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-serif mb-8 text-foreground">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6 text-left">
            <div>
              <h3 className="font-medium text-foreground mb-2">
                How does billing work?
              </h3>
              <p className="text-muted-foreground text-sm">
                You'll be charged immediately when you subscribe. You can cancel anytime and retain access until the end of your billing period.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-2">
                Can I change my plan later?
              </h3>
              <p className="text-muted-foreground text-sm">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect at the next billing cycle.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-muted-foreground text-sm">
                We accept all major credit cards through our secure payment partner Stripe.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Membership;
