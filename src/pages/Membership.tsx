import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useMemberState } from "@/hooks/useMemberState";
import { supabase } from "@/integrations/supabase/client";
import { getStoredAffiliateRef } from "@/lib/affiliateTracking";
import { useToast } from "@/hooks/use-toast";
import { trackSalesEvent } from "@/lib/salesAnalytics";
import { Button } from "@/components/ui/button";
import { DoorOpen, Home, Loader2 } from "lucide-react";
import { SalesHero } from "@/components/sales/SalesHero";
import { RecognitionSection } from "@/components/sales/RecognitionSection";
import { TempleDoorPanel } from "@/components/sales/TempleDoorPanel";
import { TestimonialCard } from "@/components/sales/TestimonialCard";
import type { Testimonial } from "@/components/sales/TestimonialCard";
import { MembershipCard } from "@/components/sales/MembershipCard";
import { FAQAccordion } from "@/components/sales/FAQAccordion";
import type { FaqItem } from "@/components/sales/FAQAccordion";
import { StickyMobileCTA } from "@/components/sales/StickyMobileCTA";
import ProfileDropdown from "@/components/ProfileDropdown";
import finalThreshold from "@/assets/sales-final-threshold.jpg";
import guidesPhoto from "@/assets/julie-tash-guides.webp";
import areekeeraThumbnail from "@/assets/areekeera-guide-sigil.webp";
import livingPatternImage from "@/assets/living-pattern-banner.webp";
import doorRemembrance from "@/assets/door-of-remembrance-4.webp";
import doorDevotion from "@/assets/door-of-devotion-temple-thumbnail.webp.asset.json";
import doorCommunion from "@/assets/door-of-communion-temple-thumbnail.webp.asset.json";
import relationshipBanner from "@/assets/relationship-with-life-banner-v2.webp";
import appMockupGif from "@/assets/app-mockup-v3.gif.asset.json";
import whatItCostsImage from "@/assets/what-it-costs.png.asset.json";
import whatItCostsHorizontal from "@/assets/what-it-costs-h.png.asset.json";

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

/**
 * Real member testimonials only. This list is intentionally empty until real
 * words are supplied — the public page must never show fabricated or
 * placeholder quotes. While it is empty, the section renders for admins only
 * as a reminder that it is awaiting real content.
 */
const TESTIMONIALS: Testimonial[] = [];

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "What if I do not know where to begin?",
    answer:
      "Begin with the AreekeerA® Guide. You can describe what life feels like right now, and it will help you choose a small, supported next experiment.",
  },
  {
    question: "Do I need to be spiritual to belong here?",
    answer:
      "No. THE TEMPLE makes room for intuitive, emotional, embodied, relational, and practical ways of knowing. You decide what is meaningful and useful in your own life.",
  },
  {
    question: "What if I am already overwhelmed?",
    answer:
      "You do not need to do everything. THE TEMPLE is designed for return. Start with one small resource, one card, one reflection, or one practice that meets the moment you are in.",
  },
  {
    question: "Is this medical or mental-health treatment?",
    answer:
      "No. THE TEMPLE offers self-directed reflective, spiritual, and restorative practices. It does not diagnose, treat, or replace medical, mental-health, emergency, or crisis care.",
  },
  {
    question: "Can I cancel?",
    answer:
      "Yes. You can pause or cancel your membership at any time from your account. Pausing stops your billing and holds your account while you take a break; cancelling ends your membership and your access to Temple content immediately, and you can rejoin later. Membership is billed monthly or yearly in AUD.",
  },
];

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
  const { isAdmin, loading: memberLoading } = useMemberState();

  const foundingDeadlinePassed =
    new Date() > new Date("2026-12-15T00:00:00+10:00");

  const [offer, setOffer] = useState<MembershipOffer | null>(null);
  const [offerLoading, setOfferLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    trackSalesEvent("sales_page_view");
  }, []);

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
    // sent into the app, preserving a saved intended destination.
    if (authLoading || !user) return;

    // A visitor who clicked "Enter THE TEMPLE" before registering returns
    // here after signup — resume their Stripe checkout straight away. Only
    // this case needs the offer lookup, so an ordinary signed-in member is
    // never held on this page while pricing loads.
    const pendingOffer = sessionStorage.getItem("pendingCheckoutOffer");
    if (pendingOffer) {
      if (offerLoading) return;
      sessionStorage.removeItem("pendingCheckoutOffer");
      const pendingCadence =
        sessionStorage.getItem("pendingCheckoutCadence") === "yearly"
          ? "yearly"
          : "monthly";
      sessionStorage.removeItem("pendingCheckoutCadence");
      if (offer?.checkout_available) {
        void startCheckout("pricing", pendingCadence);
        return;
      }
    }

    const saved = sessionStorage.getItem("postLoginRedirect");
    if (saved && saved.startsWith("/") && saved !== "/") {
      sessionStorage.removeItem("postLoginRedirect");
      navigate(saved, { replace: true });
    } else {
      navigate("/temple", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, offerLoading, offer, user, navigate]);

  const state: OfferState = offer?.state ?? "pre_launch";
  const priceAud = useMemo(() => {
    if (!offer?.unit_amount_cents) return null;
    return Math.round(offer.unit_amount_cents / 100);
  }, [offer]);
  const openingDate = formatAudDate(
    offer?.founding_window_opens_at ?? "2026-09-14T00:00:00Z",
  );

  const startCheckout = async (
    placement: "hero" | "midpage" | "final" | "pricing",
    cadence: "monthly" | "yearly" = billing,
  ) => {
    if (placement === "hero") trackSalesEvent("hero_enter_temple_clicked");
    if (placement === "midpage") trackSalesEvent("midpage_enter_temple_clicked");
    if (placement === "final") trackSalesEvent("final_enter_temple_clicked");

    if (!offer?.checkout_available) return;
    trackSalesEvent("membership_checkout_started", { placement, cadence });

    if (!user) {
      sessionStorage.setItem("pendingCheckoutOffer", offer.tier);
      sessionStorage.setItem("pendingCheckoutCadence", cadence);
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
            cadence,
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

  const loading = authLoading || offerLoading || (user && memberLoading);
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const EnterTemple = ({
    placement,
    size = "lg",
    className,
  }: {
    placement: "hero" | "midpage" | "final" | "pricing";
    size?: "default" | "lg";
    className?: string;
  }) => {
    return (
      <Button
        size={size}
        className={className}
        onClick={() => {
          if (state === "pre_launch") {
            if (placement === "hero") trackSalesEvent("hero_enter_temple_clicked");
            if (placement === "midpage") trackSalesEvent("midpage_enter_temple_clicked");
            if (placement === "final") trackSalesEvent("final_enter_temple_clicked");
            sessionStorage.setItem("pendingCheckoutOffer", offer?.tier ?? "founding");
            navigate("/auth?mode=signup");
            return;
          }
          startCheckout(placement);
        }}
        disabled={checkoutLoading}
        aria-describedby={state === "pre_launch" ? "opening-date" : undefined}
      >
        {checkoutLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <DoorOpen className="mr-2 h-4 w-4" aria-hidden />
        )}
        Enter THE TEMPLE
      </Button>
    );
  };

  const showFounding = state !== "standard";
  const standardPrice =
    state === "standard" && priceAud ? `$${priceAud} AUD` : "$50 AUD";

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      {/* Quiet threshold header — no site navigation on this page. */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-3 md:px-8">
          <a
            href="#top"
            className="flex items-center gap-1.5 text-sm text-muted-foreground"
          >
            <Home className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="font-medium hover:text-foreground transition-colors">
              THE TEMPLE of Sustainment
            </span>
          </a>
          <div className="flex items-center gap-4">
            {user ? (
              <ProfileDropdown />
            ) : (
              <button
                type="button"
                onClick={() => navigate("/auth")}
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Sign in
              </button>
            )}
            <EnterTemple placement="hero" size="default" className="hidden sm:inline-flex" />
          </div>
        </div>
      </header>

      <main id="top">
        {/* 1. Hero — the threshold */}
        <SalesHero cta={<EnterTemple placement="hero" />} />

        {/* 2. The real promise */}
        <section
          aria-labelledby="promise-heading"
          className="px-5 py-8 md:px-8 md:py-14"
        >
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-stretch gap-10 lg:grid-cols-[1fr_400px] lg:gap-16">
            <div className="space-y-6">
              <h2
                id="promise-heading"
                className="font-serif text-[1.9rem] leading-tight text-foreground sm:text-4xl"
              >
                Not more information. A different relationship with your life.
              </h2>
              <p className="text-base leading-relaxed text-foreground/85">
                THE TEMPLE does not ask you to transcend what hurts, think
                positively, or become endlessly self-aware.
              </p>
              <p className="text-base leading-relaxed text-foreground/85">
                It gives you a private and living place to recognise what is true,
                receive support that meets the moment, try something small enough
                to be real, and return to the evidence of your own life.
              </p>

              <p className="max-w-2xl text-base italic leading-relaxed text-foreground/90">
                You do not need to become someone else. You need a place where
                what is true can be witnessed and tended.
              </p>
              <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
                Recognition comes before integration. Integration comes before
                congruent action.
              </p>
            </div>

            <div className="h-full min-h-[320px] lg:min-h-0">
              <div className="h-full w-full overflow-hidden rounded-sm border border-border/50 bg-muted shadow-2xl">
                <img
                  src={relationshipBanner}
                  alt="A woman looking into an old mirror, meeting her own reflection with quiet presence."
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 3. Recognition */}
        <RecognitionSection />

        {/* 4. Notice / Meet / Choose / Record / Return */}
        <section aria-labelledby="process-heading" className="border-y border-border/60 bg-muted/30 px-5 py-8 md:px-8 md:py-12">
          <div className="mx-auto max-w-6xl">
            <p className="mb-5 text-[0.7rem] uppercase tracking-[0.32em] text-primary">OUR SIGNATURE METHOD</p>
            <h2 id="process-heading" className="max-w-3xl font-serif text-[1.9rem] leading-tight text-foreground sm:text-4xl">Living an ordinary life in an extraordinary way begins with what you recognise in the moment.</h2>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
              {[
                ["Notice", "What is here in your body, emotions, relationships, and inner world?"],
                ["Meet", "What story, protection, pattern, or old learning may be shaping this moment?"],
                ["Choose", "What is one supported, workable action you can take from here?"],
                ["Record", "What happened when you tried the small thing that felt possible?"],
                ["Return", "Come back without judgement, and let the evidence of your life teach you."],
              ].map(([title, body], index) => (
                <div key={title} className="border-t border-primary/45 pt-5">
                  <p className="font-serif text-sm text-primary">0{index + 1}</p>
                  <h3 className="mt-3 text-[0.72rem] uppercase tracking-[0.28em] text-foreground">{title}</h3>
                  <p className="mt-4 text-sm leading-relaxed text-foreground/80">{body}</p>
                </div>
              ))}
            </div>
            <p className="mt-12 max-w-3xl font-serif text-lg italic text-foreground/90">Record what happened and return—not to judge yourself, but to learn.</p>
          </div>
        </section>

        {/* 5. What awaits inside */}
        <section
          aria-labelledby="inside-heading"
          className="border-y border-border/60 bg-muted/30 px-5 py-8 md:px-8 md:py-14"
        >
          <div className="mx-auto max-w-6xl">
            <div className="max-w-3xl">
              <p className="mb-5 text-[0.7rem] uppercase tracking-[0.32em] text-primary">
                What awaits inside
              </p>
              <h2
                id="inside-heading"
                className="font-serif text-[1.9rem] leading-tight text-foreground sm:text-4xl"
              >
                A Temple with many doors. One living practice.
              </h2>
            </div>

            <div className="mt-10">
              <img
                src={appMockupGif.url}
                alt="Screen recording of THE TEMPLE member experience on a phone"
                loading="lazy"
                className="w-full rounded-2xl"
              />
            </div>

            <div className="mt-14 space-y-16 md:mt-20 md:space-y-24">
              <TempleDoorPanel
                eyebrow="The AreekeerA® Guide"
                title="Not sure what you need today?"
                body="Tell The AreekeerA® Guide what life feels like right now. It provides you a small, sequenced pathway through THE TEMPLE resources — what to try, in what order, and why it may meet this particular moment."
                image={areekeeraThumbnail}
                imageAlt="The AreekeerA Guide inside THE TEMPLE, where a member describes what life feels like right now."
                contain
              />
              <TempleDoorPanel
                reverse
                eyebrow="The Living Pattern Lab"
                title="A private laboratory to experiment with life"
                body="A private place to notice what is true, become curious about the meaning being made, practise a different choice, and gather evidence from what happens next."
                steps={["Pause", "Perceive", "Practice"]}
                image={livingPatternImage}
                imageAlt="The Living Pattern Lab inside THE TEMPLE, with its Pause, Perceive and Practice lenses."
              />
              <TempleDoorPanel
                eyebrow="The Door of Remembrance"
                title="Rituals, card decks, and courses"
                body="For exploring the patterns, stories, beliefs, inherited meanings, and protector roles shaping your life."
                image={doorRemembrance}
                imageAlt="The Door of Remembrance, holding rituals, card decks and courses."
              />
              <TempleDoorPanel
                reverse
                eyebrow="The Door of Devotion"
                title="Returning to your body"
                body="Guided meditations, energy-medicine practices, somatic rituals, recipes, and restorative resources for returning to your body, regulating your nervous system, and maintaining inner steadiness."
                note="These are self-directed reflective and restorative practices. They do not diagnose, treat, or cure any health condition, and they do not replace medical or mental-health care."
                image={doorDevotion.url}
                imageAlt="The Door of Devotion, holding guided meditations and restorative practices."
              />
              <TempleDoorPanel
                eyebrow="The Door of Communion"
                title="Live gatherings and the Mirror Exchange"
                body="Live readings, classes, workshops, replays, and the Mirror Exchange: a peer-held space where another member can hold the mirror while you listen for your own revelation."
                image={doorCommunion.url}
                imageAlt="The Door of Communion, holding live readings, classes, workshops and replays."
              />
            </div>

            <div className="mt-16 text-center">
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  trackSalesEvent("midpage_enter_temple_clicked");
                  document
                    .getElementById("membership")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                See what awaits inside
              </Button>
            </div>
          </div>
        </section>

        {/* 5. The cost of waiting */}
        <section
          aria-labelledby="cost-heading"
          className="px-5 py-8 md:px-8 md:py-14"
        >
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 lg:grid-cols-[1fr_400px] lg:gap-16">
            <div>
              <h2
                id="cost-heading"
                className="font-serif text-[1.9rem] leading-tight text-foreground sm:text-4xl"
              >
                The cost of waiting
              </h2>
              <p className="mt-6 text-sm leading-relaxed text-foreground/85 sm:text-base">
                You do not need another dramatic beginning.
              </p>
              <p className="mt-6 text-sm leading-relaxed text-foreground/85 sm:text-base">
                But you cannot keep living like this.
              </p>
              <p className="mt-6 text-sm leading-relaxed text-foreground/85 sm:text-base">
                You cannot keep losing another evening to a reaction you only understand after the damage is done—after the text you sent, the argument you escalated, the boundary you abandoned, the work you avoided, the thing you swallowed, the person you pushed away, or the way you turned against yourself again.
              </p>
              <p className="mt-6 text-sm leading-relaxed text-foreground/85 sm:text-base">
                You cannot keep treating every flare, conflict, shutdown, spiral, and difficult decision as an isolated emergency.
              </p>
              <p className="mt-6 text-sm leading-relaxed text-foreground/85 sm:text-base">
                Because it is not isolated.
              </p>
              <p className="mt-6 text-sm leading-relaxed text-foreground/85 sm:text-base">
                It is a pattern.
              </p>
              <p className="mt-6 text-sm leading-relaxed text-foreground/85 sm:text-base">
                And every time you are too exhausted, activated, frightened, busy, or unsure to meet it, the old story gets to make the choice for you.
              </p>
              <ul className="mt-8 space-y-5">
                {[
                  "It chooses whether you speak or stay silent.",
                  "Whether you rest or push until your body forces you to stop.",
                  "Whether you ask for what you need or make yourself smaller to keep the peace.",
                  "Whether you believe the fear, obey the prediction, and call it intuition.",
                  "Whether another day becomes evidence that this is simply who you are.",
                ].map((line) => (
                  <li
                    key={line}
                    className="border-l border-primary/40 pl-6 text-sm leading-relaxed text-foreground/85 sm:text-base"
                  >
                    {line}
                  </li>
                ))}
              </ul>
              <p className="mt-10 text-sm leading-relaxed text-foreground/85 sm:text-base">
                You may have spent years collecting insight—books, practices, courses, readings, breakthroughs, language for every wound—while still having no structure to catch the moment before the old pattern takes the wheel.
              </p>
              <p className="mt-6 text-sm leading-relaxed text-foreground/85 sm:text-base">
                And then you promise yourself: next time.
              </p>
              <p className="mt-6 text-sm leading-relaxed text-foreground/85 sm:text-base">
                Next time, I will pause.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-foreground/85 sm:text-base">
                Next time, I will not send the message.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-foreground/85 sm:text-base">
                Next time, I will say no.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-foreground/85 sm:text-base">
                Next time, I will listen to my body.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-foreground/85 sm:text-base">
                Next time, I will choose differently.
              </p>
              <p className="mt-6 text-sm leading-relaxed text-foreground/85 sm:text-base">
                But next time keeps arriving with the same nervous system, the same history, the same automatic protections—and no place to put the moment while it is happening.
              </p>
              <p className="mt-6 text-sm leading-relaxed text-foreground/85 sm:text-base">
                This is what THE TEMPLE is for.
              </p>
              <p className="mt-6 text-sm leading-relaxed text-foreground/85 sm:text-base">
                Not to rescue you from your life.
              </p>
              <p className="mt-6 text-sm leading-relaxed text-foreground/85 sm:text-base">
                To help you stop handing it over to the patterns that have already taken enough from you.
              </p>
              <div className="mt-10">
                <EnterTemple placement="midpage" />
              </div>
            </div>
            <div className="flex items-start justify-center">
              <img
                src={whatItCostsImage.url}
                alt="A woman sitting quietly at a wooden table, writing, with tall arched doors open to olive trees and distant hills"
                loading="lazy"
                className="w-full rounded-2xl"
              />
            </div>
          </div>
        </section>

        {/* 6. Why this is different */}
        <section
          aria-labelledby="different-heading"
          className="px-5 py-8 md:px-8 md:py-14"
        >
          <div className="mx-auto max-w-4xl">
            <h2
              id="different-heading"
              className="font-serif text-[1.9rem] leading-tight text-foreground sm:text-4xl"
            >
              You do not need to heal perfectly to live differently.
            </h2>
            <p className="mt-6 text-base leading-relaxed text-foreground/85 sm:text-lg">
              THE TEMPLE is not built around the fantasy that one insight, one
              card, one meditation, or one decision will solve a life.
            </p>
            <p className="mt-6 font-serif text-2xl text-foreground">
              It is built around return.
            </p>
            <ul className="mt-8 space-y-5">
              {[
                "Return when the same reaction appears.",
                "Return when a symptom or season asks for more care.",
                "Return when your old certainty has made the present feel smaller than it is.",
                "Return when you want to remember that a feeling can be information without becoming a verdict.",
              ].map((line) => (
                <li
                  key={line}
                  className="border-l border-primary/40 pl-6 text-base leading-relaxed text-foreground/85 sm:text-lg"
                >
                  {line}
                </li>
              ))}
            </ul>
            <p className="mt-10 text-base leading-relaxed text-foreground/85 sm:text-lg">
              Over time, you begin to see what steadies you, what narrows your
              choices, what your life is asking for, and what becoming more like
              yourself actually looks like in practice.
            </p>
            <p className="mt-10 max-w-2xl font-serif text-lg italic text-foreground/90">
              Change becomes possible when the conditions around a woman change.
            </p>
          </div>
        </section>

        {/* The women and Method behind THE TEMPLE */}
        <section
          aria-labelledby="guides-heading"
          className="px-5 py-8 md:px-8 md:py-12"
        >
          <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-3">
            <div>
              <h2
                id="guides-heading"
                className="mb-6 font-serif text-[1.7rem] leading-tight text-foreground sm:text-3xl"
              >
                The women and Method behind THE TEMPLE
              </h2>
              <img
                src={guidesPhoto}
                alt="Julie and Tash Lewin, the guides of THE TEMPLE of Sustainment"
                loading="lazy"
                className="w-full rounded-2xl object-cover grayscale"
              />
            </div>
            <div className="text-base leading-relaxed text-foreground/85">
              <p className="mb-4">
                <span className="font-semibold text-foreground">
                  Julie Lewin
                </span>{" "}
                is a medical intuitive with over 40 years of experience working
                with the body as an intelligent, communicative system. Julie
                channelled and developed the AreekeerA<sup>®</sup> Modality
                through decades of practice and client work.
              </p>
              <p>
                The AreekeerA<sup>®</sup> Method listens to symptoms and patterns
                in the context of a woman's physical, emotional, relational,
                neurological and energetic history—without reducing her to a
                problem that needs to be overpowered.
              </p>
            </div>
            <div className="text-base leading-relaxed text-foreground/85">
              <p className="mb-4">
                <span className="font-semibold text-foreground">Tash Lewin</span>{" "}
                works at the intersection of trauma, identity, and nervous
                system regulation, helping women understand how protective
                patterns and old meanings quietly shape the choices available
                in the present.
              </p>
              <p>
                Together, Julie and Tash hold intuitive, embodied and practical
                ways of knowing alongside ordinary human life. Their work asks
                for curiosity, safety and evidence—not force or bypassing.
              </p>
            </div>
          </div>
        </section>

        {/* 7. Proof — real testimonials only */}
        {(TESTIMONIALS.length > 0 || isAdmin) && (
          <section
            aria-labelledby="proof-heading"
            className="px-5 py-8 md:px-8 md:py-14"
          >
            <div className="mx-auto max-w-5xl">
              <h2
                id="proof-heading"
                className="font-serif text-[1.9rem] leading-tight text-foreground sm:text-4xl"
              >
                Women are finding their way back to themselves.
              </h2>
              {TESTIMONIALS.length > 0 ? (
                <div className="mt-10 grid gap-6 md:grid-cols-2">
                  {TESTIMONIALS.map((t) => (
                    <TestimonialCard key={t.quote} testimonial={t} />
                  ))}
                </div>
              ) : (
                <div className="mt-8 rounded-2xl border border-dashed border-primary/50 bg-card/40 p-7">
                  <p className="text-[0.68rem] uppercase tracking-[0.28em] text-primary">
                    Visible to admins only
                  </p>
                  <p className="mt-3 text-base leading-relaxed text-foreground/85">
                    This section is waiting for real member testimonials. It
                    stays hidden from visitors until three to five real quotes
                    are added — each one foregrounding a lived shift, such as
                    having language for a reaction before acting from it,
                    feeling less alone with a difficult pattern, returning to a
                    practice during a hard week, moving from self-punishment to
                    curiosity, or making one clearer boundary or choice.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 8. Membership invitation */}
        <section
          id="membership"
          aria-labelledby="membership-heading"
          className="scroll-mt-20 border-y border-border/60 bg-muted/30 px-5 py-8 md:px-8 md:py-14"
        >
          <div className="mx-auto max-w-5xl">
            {TESTIMONIALS.length > 0 && (
              <TestimonialCard
                testimonial={TESTIMONIALS[0]}
                className="mb-12 mx-auto max-w-2xl"
              />
            )}
            <h2
              id="membership-heading"
              className="font-serif text-[1.9rem] leading-tight text-foreground sm:text-4xl"
            >
              Enter THE TEMPLE.
            </h2>
            <p className="mt-6 max-w-3xl text-base leading-relaxed text-foreground/85 sm:text-lg">
              Your membership gives you full access to every Door, every
              practice, every course, the Living Pattern Lab, card decks, live
              offerings and replays, and the support available for the season you
              are actually in.
            </p>
            <p className="mt-5 font-serif text-xl italic text-foreground/90">
              A living place to return to.
            </p>
            {state === "pre_launch" && (
              <p id="opening-date" className="mt-4 text-sm text-muted-foreground">
                The founding invitation opens {openingDate}. Create your account now and your invitation will be waiting.
              </p>
            )}

            <div
              className="mt-12 inline-flex items-center rounded-full border border-border/60 bg-card/40 p-1"
              role="group"
              aria-label="Billing period"
            >
              {(["monthly", "yearly"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setBilling(option)}
                  aria-pressed={billing === option}
                  className={`rounded-full px-5 py-2 text-sm transition-colors ${
                    billing === option
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {option === "monthly" ? "Monthly" : "Yearly"}
                </button>
              ))}
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <MembershipCard
                label="Membership"
                price={
                  foundingDeadlinePassed ? (
                    billing === "yearly"
                      ? "$500 AUD / year"
                      : `${standardPrice} / month`
                  ) : (
                    <span className="line-through opacity-60">
                      {billing === "yearly"
                        ? "$500 AUD / year"
                        : `${standardPrice} / month`}
                    </span>
                  )
                }
                cadence={
                  billing === "yearly"
                    ? "Billed yearly in AUD"
                    : "Billed monthly in AUD"
                }
                savings={
                  billing === "yearly" ? "Save $100/year" : undefined
                }
                lines={[
                  "Full access to every Door and every practice inside THE TEMPLE.",
                  "The AreekeerA® Guide, the Living Pattern Lab, courses, card decks and readings.",
                  "Live readings, classes, workshops and replays.",
                  "Pause or cancel at any time from your account.",
                ]}
                cta={
                  foundingDeadlinePassed ? (
                    <EnterTemple placement="pricing" />
                  ) : undefined
                }
              />
              {showFounding && (
                <MembershipCard
                  highlight
                  label="Founding Member"
                  price={
                    billing === "yearly"
                      ? "$350 AUD / year"
                      : "$35 AUD / month"
                  }
                  cadence={
                    billing === "yearly"
                      ? "Billed yearly in AUD"
                      : "Billed monthly in AUD"
                  }
                  savings={
                    billing === "yearly" ? "Save $70/year" : undefined
                  }
                  lines={[
                    "Available until 14 December 2026.",
                    "Your founding rate remains while your membership stays active.",
                    "If a payment fails, a 15-day recovery period keeps your founding rate intact.",
                    "Cancelling permanently forfeits the founding rate; rejoining later uses the then-current standard price.",
                    "Founding members carry the Founder badge as recognition only; it does not change access.",
                  ]}
                  footnote={
                    state === "pre_launch"
                      ? `Founding membership opens ${openingDate}.`
                      : undefined
                  }
                  cta={<EnterTemple placement="pricing" />}
                />
              )}
            </div>

            <p className="mt-8 font-serif text-sm italic text-muted-foreground">
              Begin where life is asking you to begin.
            </p>
          </div>
        </section>

        {/* 10. FAQ */}
        <section
          aria-labelledby="faq-heading"
          className="px-5 py-8 md:px-8 md:py-14"
        >
          <div className="mx-auto max-w-3xl">
            <h2
              id="faq-heading"
              className="mb-8 font-serif text-[1.9rem] leading-tight text-foreground sm:text-4xl"
            >
              Questions before you begin
            </h2>
            <FAQAccordion
              items={FAQ_ITEMS}
              onOpen={(question) =>
                trackSalesEvent("faq_opened", { question })
              }
            />
            <p className="mt-12 text-xs leading-relaxed text-muted-foreground">
              THE TEMPLE offers self-directed reflective, spiritual, and
              restorative practices. It does not diagnose, treat, or replace
              medical, mental-health, emergency, or crisis care, and makes no
              promise of cure or guaranteed relief. All prices shown in AUD,
              billed monthly or yearly.
            </p>
          </div>
        </section>
        {/* 11. Final threshold */}
        <section
          aria-labelledby="final-heading"
          className="relative isolate overflow-hidden"
        >
          <img
            src={finalThreshold}
            alt="An open weathered timber gate in a sandstone wall, opening onto a gravel path through an olive and eucalyptus garden in late afternoon light."
            loading="lazy"
            width={1920}
            height={1088}
            className="absolute inset-0 -z-10 h-full w-full object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-[hsl(22_24%_8%/0.86)]" aria-hidden />
          <div className="mx-auto max-w-3xl px-5 py-12 text-center md:px-8 md:py-18">
            <h2
              id="final-heading"
              className="font-serif text-[1.9rem] leading-tight text-on-image sm:text-4xl"
            >
              You do not need certainty before you live differently.
            </h2>
            <p className="mt-7 text-base leading-relaxed text-on-image/90 sm:text-lg">
              You need enough curiosity to try one small thing,
              <br />
              and enough tenderness to learn from what happens.
            </p>
            <div className="mt-10 flex justify-center">
              <EnterTemple placement="final" />
            </div>
          </div>
        </section>

      </main>

      <StickyMobileCTA>
        <EnterTemple placement="final" className="w-full" />
      </StickyMobileCTA>
    </div>
  );
};

export default Membership;
