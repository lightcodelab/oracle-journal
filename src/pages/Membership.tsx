import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useMembership } from "@/hooks/useMembership";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, Sparkles, Heart, Crown, Loader2 } from "lucide-react";
import ProfileDropdown from "@/components/ProfileDropdown";
import PageBreadcrumb from "@/components/PageBreadcrumb";

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
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <PageBreadcrumb items={[{ label: "Membership", href: "/membership" }]} />
          {user ? (
            <ProfileDropdown />
          ) : (
            <Button variant="outline" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-serif mb-4 text-foreground">
          Choose Your Path
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Begin your journey of healing and transformation with a 7-day free trial.
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
                    {tier.buckets.map((bucket) => (
                      <div key={bucket} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm text-foreground">
                          {bucketLabels[bucket] || bucket}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-sm text-foreground">7-day free trial</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-sm text-foreground">Cancel anytime</span>
                    </div>
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
                        "Start Free Trial"
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </section>

      {/* FAQ or Trust Signals */}
      <section className="py-16 px-4 border-t border-border/40">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-serif mb-8 text-foreground">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6 text-left">
            <div>
              <h3 className="font-medium text-foreground mb-2">
                What happens after my free trial?
              </h3>
              <p className="text-muted-foreground text-sm">
                After your 7-day trial, you'll be charged the subscription amount. You can cancel anytime before the trial ends to avoid charges.
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
