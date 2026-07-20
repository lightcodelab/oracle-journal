import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useMemberState } from "@/hooks/useMemberState";
import { supabase } from "@/integrations/supabase/client";
import { getStoredAffiliateRef } from "@/lib/affiliateTracking";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Check,
  Sparkles,
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc(
        "get_current_membership_offer",
      );
      if (!cancelled) {
        if (error) console.error("offer fetch error", error);
        else if (data) setOffer(data as unknown as MembershipOffer);
        setOfferLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!authLoading && !memberLoading && user && isActiveMember) {
      navigate("/temple", { replace: true });
    }
  }, [authLoading, memberLoading, user, isActiveMember, navigate]);

  const startCheckout = async () => {
    if (!offer?.checkout_available) return;
    if (!user) {
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
    if (state === "pre_launch") {
      return (
        <Button size="lg" variant="outline" disabled>
          <CalendarClock className="w-4 h-4 mr-2" />
          Opening {openingDate}
        </Button>
      );
    }
    const label =
      state === "founding"
        ? user
          ? "Become a Founding Member"
          : `Join as a Founding Member — A$${priceAud}/mo`
        : user
          ? "Join The Temple"
          : `Join The Temple — A$${priceAud}/mo`;
    return (
      <Button size="lg" onClick={startCheckout} disabled={checkoutLoading}>
        {checkoutLoading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <DoorOpen className="w-4 h-4 mr-2" />
        )}
        {label}
      </Button>
    );
  };

  return (
    <div className="min-h-screen bg-background">
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

      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-serif mb-10 text-foreground">
            How to begin
          </h2>
          <div className="grid md:grid-cols-3 gap-8 text-left">
            {[
              {
                step: "One",
                title: "Enter",
                body: "Cross the threshold — no assessments, no rush.",
              },
              {
                step: "Two",
                title: "Choose what supports you now",
                body: "A card, a meditation, a template, a live gathering — begin wherever feels honest.",
              },
              {
                step: "Three",
                title: "Continue at your own pace",
                body: "Return as often as you need. Your practice waits for you.",
              },
            ].map((s) => (
              <div key={s.step}>
                <div className="text-sm uppercase tracking-widest text-primary mb-2">
                  {s.step}
                </div>
                <h3 className="font-serif text-xl mb-2 text-foreground">
                  {s.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

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