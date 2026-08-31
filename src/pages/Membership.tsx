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
  HeartPulse,
  Layers,
  Compass,
} from "lucide-react";
import { motion } from "framer-motion";
import templeBannerAsset from "@/assets/homepage-banner.webp.asset.json";
const templeBanner = templeBannerAsset.url;
import guidesPhoto from "@/assets/julie-tash-guides.jpg";
import areekeeraThumbnail from "@/assets/areekeera-thumbnail.png.asset.json";
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

// External Shopify storefront URL is not yet configured. When the real
// URL is available, set it here (e.g. https://<store>.myshopify.com or
// a custom shop domain). While null, the "Visit the Temple Shop" link is
// disabled and clearly marked as coming soon — we do not link back to
// the app itself.
const SHOPIFY_URL: string | null = null;

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
    // Any authenticated user landing on the public sales page should be
    // sent into the app. Preserve an explicitly saved intended destination
    // (e.g. a protected route the user tried to open before signing in).
    // The sales page remains reachable to unauthenticated visitors via
    // direct navigation to `/`.
    if (!authLoading && user) {
      const saved = sessionStorage.getItem("postLoginRedirect");
      if (saved && saved.startsWith("/") && saved !== "/") {
        sessionStorage.removeItem("postLoginRedirect");
        navigate(saved, { replace: true });
      } else if (!memberLoading) {
        navigate("/temple", { replace: true });
      }
    }
  }, [authLoading, memberLoading, user, navigate]);

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
      // Pre-launch: intentional launch-state chip (informational, not a
      // disabled control). Sign In remains available alongside via the
      // parent layout.
      return (
        <div
          className="inline-flex items-center gap-2 rounded-full border border-primary/50 bg-primary/10 px-5 py-2.5 text-sm md:text-base text-foreground"
          role="status"
          aria-label={`Doors open ${openingDate}`}
        >
          <CalendarClock className="w-4 h-4 text-primary" aria-hidden />
          <span className="font-serif tracking-wide">
            Doors open {openingDate}
          </span>
        </div>
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
              className="w-full h-40 sm:h-56 object-cover object-center rounded-lg mb-8"
            />
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif mb-6 text-foreground leading-tight">
              The Temple of Sustainment
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
              A sacred, trauma-informed sanctuary for remembrance, healing, and
              becoming — offered by Julie &amp; Tash Lewin.
            </p>

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
                title: "The AreekeerA® Guide",
                body: "Find one small, supported next experiment, gently paced to your capacity.",
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

      {/* AreekeerA® The Method — the philosophy beneath the Temple */}
      <section className="relative py-24 px-4 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-primary/5"
        />
        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 text-primary mb-4">
              <Sparkles className="w-4 h-4" />
              <span className="uppercase text-xs tracking-[0.25em]">
                The philosophy beneath The Temple
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-serif mb-5 text-foreground leading-tight">
              AreekeerA<sup className="text-xl align-super">®</sup> The Method
            </h2>
            <p className="text-lg text-foreground/85 max-w-3xl mx-auto leading-relaxed">
              AreekeerA<sup>®</sup> The Method is Julie Lewin's body-based
              healing modality, channelled and developed through more than
              forty years of practice and client work. It approaches the body
              as an intelligent, communicative system and invites us to listen
              to symptoms in context — not as isolated problems to overpower,
              but as part of the body's physical, emotional, neurological and
              energetic history.
            </p>
            <p className="text-lg text-foreground/85 max-w-3xl mx-auto leading-relaxed mt-5">
              AreekeerA<sup>®</sup> is one of the foundational bodies of work
              within The Temple. Members encounter it most directly through
              The AreekeerA® Guide, guided creative visualisations,
              meditations, somatic and energetic practices, reflective
              processes, and Julie and Tash's teaching.
            </p>
            <p className="text-base text-foreground/80 max-w-3xl mx-auto leading-relaxed mt-5 italic">
              Julie has appeared twice on the television program The
              Extraordinary, and her guided meditations have received more
              than 1.1 million listens on Insight Timer.
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-10 items-center mb-16">
            <div className="lg:col-span-2">
              <div className="relative rounded-2xl overflow-hidden border border-primary/30 shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.4)]">
                <img
                  src={areekeeraThumbnail.url}
                  alt="AreekeerA® — Energy Medicine Codes"
                  className="w-full h-auto object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" />
              </div>
            </div>
            <div className="lg:col-span-3 space-y-6">
              <div>
                <h3 className="font-serif text-2xl text-foreground mb-2">
                  A different way of listening to the body
                </h3>
                <p className="text-foreground/85 leading-relaxed">
                  Rather than approaching a symptom in isolation, AreekeerA<sup>®</sup>{" "}
                  explores how trauma, stress, unresolved emotional
                  experiences and long-held protective responses may be
                  reflected through the body and nervous system.
                </p>
                <p className="text-foreground/85 leading-relaxed mt-4">
                  The Method does not ask the system to push harder than it
                  can safely hold. Practices are approached according to
                  present severity, available capacity and safety — beginning
                  with grounding and stabilisation before moving through
                  processing and integration.
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {[
              {
                icon: <Sparkles className="w-5 h-5" />,
                title: "The body is communicative",
                body: "The body is approached as an intelligent system whose symptoms and patterns can be explored within the wider context of a person's lived experience.",
              },
              {
                icon: <HeartPulse className="w-5 h-5" />,
                title: "Safety before intensity",
                body: "When the system is under strain, AreekeerA® prioritises grounding and stabilisation. The intention is to work gently, without force or bypassing.",
              },
              {
                icon: <Layers className="w-5 h-5" />,
                title: "Body, nervous system and energy",
                body: "The Method considers physical experience alongside emotional, neurological, spiritual and energetic patterns rather than treating each as entirely separate.",
              },
              {
                icon: <Compass className="w-5 h-5" />,
                title: "Grounding → processing → integration",
                body: "Practices follow a considered sequence: create sufficient grounding, meet what is present within available capacity, and allow time for integration.",
              },
            ].map((p) => (
              <div
                key={p.title}
                className="rounded-xl border border-primary/25 bg-card/50 p-6"
              >
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/15 text-primary mb-4">
                  {p.icon}
                </div>
                <h3 className="font-serif text-lg text-foreground mb-2">
                  {p.title}
                </h3>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {p.body}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/40 p-6 md:p-8">
            <h3 className="font-serif text-xl md:text-2xl text-foreground mb-4 text-center">
              How AreekeerA<sup>®</sup> lives inside The Temple
            </h3>
            <p className="text-foreground/85 leading-relaxed max-w-3xl mx-auto text-center">
              The Temple is larger than any one method or tool. It contains
              card decks, courses, meditations, healing templates, journaling
              practices and live experiences that offer different ways to
              reflect, learn and engage.
            </p>
            <p className="text-foreground/85 leading-relaxed max-w-3xl mx-auto text-center mt-4">
              AreekeerA<sup>®</sup> is expressed most directly through the
              Protocol Builder and the practices it draws together. The
              Temple's other resources may be used alongside that work as
              complementary paths of reflection, remembrance and sustainment.
            </p>
          </div>
        </div>
      </section>

      {/* How The AreekeerA® Guide applies the Method */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 text-primary mb-3">
              <Sparkles className="w-4 h-4" />
              <span className="uppercase text-xs tracking-[0.2em]">
                One practical expression of the Method
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-serif mb-4 text-foreground">
              The AreekeerA<sup>®</sup> Guide
            </h2>
            <p className="text-foreground/85 leading-relaxed max-w-3xl mx-auto">
              The AreekeerA® Guide is one practical application of AreekeerA<sup>®</sup>{" "}
              The Method — not the whole Method.
            </p>
            <p className="text-foreground/85 leading-relaxed max-w-3xl mx-auto mt-4">
              You share what you are presently experiencing across the
              Guide's physical, mental, emotional and spiritual domains,
              together with severity, your goals and the time you have
              available. The Guide then assembles a personalised sequence
              from existing Temple practices, following the grounding →
              processing → integration flow and applying trauma-informed
              safety guardrails.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Describe what is present",
                body: "Share your symptoms, their severity, your goals and the time you have. The Guide uses this information to understand your submitted state; it does not diagnose its medical cause.",
              },
              {
                title: "Receive a suggested protocol",
                body: "The Guide assembles a sequence of relevant Temple practices, such as meditations, visualisations, somatic tools, rituals and reflective processes.",
              },
              {
                title: "Practise at your own pace",
                body: "Save your protocol, return to it and adjust your engagement as your capacity changes. The protocol is an educational, self-directed suggestion — not a medical prescription.",
              },
            ].map((s, i) => (
              <div
                key={s.title}
                className="rounded-xl border border-border/60 bg-card/40 p-6"
              >
                <div className="text-xs uppercase tracking-widest text-primary mb-2">
                  Step {i + 1}
                </div>
                <h3 className="font-serif text-lg text-foreground mb-2">
                  {s.title}
                </h3>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {s.body}
                </p>
              </div>
            ))}
          </div>

          <div className="max-w-3xl mx-auto mt-10 rounded-xl border border-border/60 bg-background/60 p-5">
            <p className="text-sm text-muted-foreground leading-relaxed text-center">
              The AreekeerA<sup>®</sup> Guide does not diagnose
              conditions, determine medical causes, prescribe treatment or
              replace professional care. It offers educational and
              self-directed practice suggestions from The Temple's resource
              library. Seek qualified professional assistance for medical
              concerns, emergencies or crises.
            </p>
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

      {(state === "founding" || state === "pre_launch") && (
        <section className="py-16 px-4">
          <div className="max-w-3xl mx-auto rounded-2xl border border-primary/30 bg-gradient-to-b from-primary/10 to-background p-8 md:p-12">
            <div className="flex items-center gap-2 text-primary mb-3">
              <Sparkles className="w-5 h-5" />
              <span className="uppercase text-xs tracking-widest">
                {state === "pre_launch"
                  ? "Founding invitation — opens 14 September 2026"
                  : "Founding invitation"}
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-serif mb-4 text-foreground">
              {state === "pre_launch"
                ? "Founding Membership — A$35 AUD / month"
                : "Enter as a Founding Member — A$35 AUD / month"}
            </h2>
            {state === "pre_launch" && (
              <p className="text-foreground/85 leading-relaxed mb-6">
                Founding Membership opens{" "}
                <span className="text-foreground">
                  14 September 2026 at 10:00am AEST
                </span>
                . Checkout is not available before that time.
              </p>
            )}
            <ul className="space-y-3 mb-8 text-foreground/90">
              <li className="flex gap-3">
                <Check className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <span>
                  Every practice, course, deck, and live gathering inside the
                  app is included in your membership.
                </span>
              </li>
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
                  If a payment fails, a 15-day recovery period keeps your
                  Founding price intact. A successful recovery in that window
                  preserves continuity.
                </span>
              </li>
              <li className="flex gap-3">
                <Check className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <span>
                  Permanent cancellation forfeits the Founding price. Rejoining
                  later uses the then-current standard price (currently A$50
                  AUD / month).
                </span>
              </li>
              <li className="flex gap-3">
                <Check className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <span>
                  Founding Members carry the Founder badge as recognition of
                  arriving at the beginning. It is recognition only and does
                  not change access.
                </span>
              </li>
            </ul>
            <HeroCta />
            {state === "founding" && (
              <p className="text-xs text-muted-foreground mt-4">
                Founding window closes{" "}
                {formatAudDate(offer?.founding_window_closes_at ?? null)}.
              </p>
            )}
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
          <p className="text-xs uppercase tracking-widest text-primary/80 text-center mb-8">
            Every physical piece is handprinted and handmade
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Mail,
                title: "Snail Mail",
                price: "A$20 AUD / month",
                items: [
                  "A letter from Julie & Tash",
                  "A shared three-card collective reading",
                  "One journal page for reflecting on the reading",
                  "Three stickers for each card in the reading",
                ],
              },
              {
                icon: BookHeart,
                title: "Journal Box",
                price: "A$50 AUD / month",
                items: [
                  "Fourteen double-sided journal pages",
                  "Month one: handmade hard front & back cover with binder rings — later months arrive as pages",
                  "One double-sided artwork unique to that month's archetype",
                  "Three random stickers from the monthly artwork",
                  "A letter from Julie & Tash",
                  "A shared three-card collective reading",
                  "Three stickers for each reading card",
                ],
              },
              {
                icon: BookHeart,
                title: "Personalised Journal Box",
                price: "A$200 AUD / month",
                items: [
                  "Fourteen double-sided journal pages",
                  "Month one: handmade hard front and back cover with binder rings; later months arrive as pages",
                  "One double-sided artwork unique to that month's archetype",
                  "Three random stickers from the monthly artwork",
                  "A letter from Julie & Tash",
                  "A personal three-card reading based on your submitted question",
                  "Three stickers for each card in your personal reading",
                  "App access for the month paid",
                ],
              },
            ].map(({ icon: Icon, title, price, items }) => (
              <div
                key={title}
                className="rounded-lg border border-border/60 bg-card/40 p-6 flex flex-col"
              >
                <Icon className="w-6 h-6 text-primary mb-3" aria-hidden />
                <h3 className="font-serif text-lg mb-1 text-foreground">
                  {title}
                </h3>
                <p className="text-sm text-primary font-medium mb-4">
                  {price}
                </p>
                <ul className="space-y-2 text-sm text-foreground/80 leading-relaxed">
                  {items.map((it) => (
                    <li key={it} className="flex gap-2">
                      <Check className="w-4 h-4 text-primary/80 mt-0.5 flex-shrink-0" />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            {SHOPIFY_URL ? (
              <Button variant="outline" asChild>
                <a
                  href={SHOPIFY_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Visit the Temple Shop
                </a>
              </Button>
            ) : (
              <div className="inline-flex flex-col items-center gap-2">
                <Button variant="outline" disabled>
                  Temple Shop — coming soon
                </Button>
                <p className="text-xs text-muted-foreground max-w-md">
                  The physical offerings are ordered from the Temple's
                  external shop, which is being prepared. The link will
                  appear here once it is live.
                </p>
              </div>
            )}
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
                Julie channelled and developed the AreekeerA<sup>®</sup>{" "}
                Modality through more than forty years of practice and client
                work. She has appeared twice on the television program The
                Extraordinary, and her guided meditations have received more
                than 1.1 million listens on Insight Timer.
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