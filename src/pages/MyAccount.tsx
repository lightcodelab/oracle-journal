import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Sparkles, ArrowUpRight, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTierAccess, TIER_NAMES } from "@/hooks/useTierAccess";
import { useMembership } from "@/hooks/useMembership";
import ProfileDropdown from "@/components/ProfileDropdown";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { motion } from "framer-motion";

const TIER_FEATURES: Record<string, string[]> = {
  T1: [
    "Digital Oracle Decks",
    "Card Readings",
    "Saved Readings",
    "Digital Journal",
  ],
  T2: [
    "All Seeker features",
    "Guided Meditations",
    "AI AreekeerA Guide",
    "Altar Rituals",
    "Energy Hygiene",
    "Healing Templates",
  ],
  T3: [
    "All Devotee features",
    "Live Readings",
    "Live Classes",
    "Live Workshops",
    "Live Meditations",
    "Session Replays",
  ],
};

const MyAccount = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { memberTierCode, subscriptionStatus, tierName, loading: tierLoading, isAdmin } = useTierAccess();
  const { tiers, loading: tiersLoading, startCheckout, checkoutLoading } = useMembership();
  const [portalLoading, setPortalLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [billingCadence, setBillingCadence] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-portal");

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (error) {
      console.error("Portal error:", error);
      toast({
        title: "Error",
        description: "Unable to open billing portal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  const handleUpgrade = (priceId: string) => {
    startCheckout(priceId);
  };

  const isActiveMember = subscriptionStatus === "active" || subscriptionStatus === "trialing";

  if (loading || tierLoading || tiersLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <PageBreadcrumb items={[{ label: "My Account" }]} />
          <ProfileDropdown />
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-4xl px-4 py-12">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <CreditCard className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-serif text-foreground mb-2">My Account</h1>
          <p className="text-muted-foreground">
            Manage your membership and billing
          </p>
        </div>

        {/* Current Membership Status */}
        <Card className="mb-8 border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              Current Membership
              {isActiveMember && (
                <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5">
                  <Sparkles className="w-3 h-3 mr-1" />
                  {subscriptionStatus === "trialing" ? "Trial" : "Active"}
                </Badge>
              )}
              {isAdmin && (
                <Badge variant="secondary">Admin</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {isActiveMember
                ? `You are currently on the ${tierName || "Member"} tier`
                : "You don't have an active membership"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isActiveMember && memberTierCode && (
              <>
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <h3 className="font-medium mb-2">{tierName}</h3>
                  <ul className="space-y-1">
                    {TIER_FEATURES[memberTierCode]?.map((feature) => (
                      <li key={feature} className="text-sm text-muted-foreground flex items-center gap-2">
                        <Check className="w-4 h-4 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                  variant="outline"
                  className="w-full"
                >
                  {portalLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Opening...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Manage Billing & Subscription
                    </>
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Update payment method, view invoices, or cancel subscription
                </p>
              </>
            )}
            {!isActiveMember && !isAdmin && (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">
                  Start your membership to access exclusive content
                </p>
                <Button onClick={() => navigate("/membership")}>
                  View Membership Options
                  <ArrowUpRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upgrade/Downgrade Options */}
        {isActiveMember && (
          <>
            <div className="text-center mb-6">
              <h2 className="text-xl font-serif mb-2">Change Your Plan</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Upgrade or downgrade anytime. Changes are prorated automatically.
              </p>
              
              {/* Billing Toggle */}
              <div className="inline-flex items-center gap-2 p-1 rounded-lg bg-muted">
                <button
                  onClick={() => setBillingCadence("monthly")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    billingCadence === "monthly"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCadence("yearly")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    billingCadence === "yearly"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Yearly
                  <span className="ml-1 text-xs text-primary">(Save 17%)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tiers
                .filter((tier) => tier.is_active)
                .sort((a, b) => (a.rank || 0) - (b.rank || 0))
                .map((tier, index) => {
                  const isCurrentTier = tier.code === memberTierCode;
                  const price = billingCadence === "monthly" ? tier.monthlyPrice : tier.yearlyPrice;
                  const priceAmount = price ? (price.unit_amount_cents / 100).toFixed(0) : "0";

                  return (
                    <motion.div
                      key={tier.code}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card
                        className={`relative h-full ${
                          isCurrentTier
                            ? "border-primary bg-primary/5"
                            : "border-border/50 bg-card/50"
                        }`}
                      >
                        {isCurrentTier && (
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                            <Badge className="bg-primary text-primary-foreground">
                              Current Plan
                            </Badge>
                          </div>
                        )}
                        <CardHeader className="text-center pt-6">
                          <CardTitle className="text-lg">{tier.name}</CardTitle>
                          <div className="mt-2">
                            <span className="text-3xl font-bold">${priceAmount}</span>
                            <span className="text-muted-foreground">
                              /{billingCadence === "monthly" ? "mo" : "yr"}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <ul className="space-y-2 text-sm">
                            {TIER_FEATURES[tier.code]?.slice(0, 4).map((feature) => (
                              <li key={feature} className="flex items-center gap-2 text-muted-foreground">
                                <Check className="w-4 h-4 text-primary flex-shrink-0" />
                                {feature}
                              </li>
                            ))}
                            {(TIER_FEATURES[tier.code]?.length || 0) > 4 && (
                              <li className="text-xs text-muted-foreground">
                                + {TIER_FEATURES[tier.code].length - 4} more features
                              </li>
                            )}
                          </ul>
                          {isCurrentTier ? (
                            <Button variant="outline" disabled className="w-full">
                              Current Plan
                            </Button>
                          ) : (
                            <Button
                              onClick={() => price && handleUpgrade(price.id)}
                              disabled={checkoutLoading === price?.id}
                              variant={tier.rank > (tiers.find((t) => t.code === memberTierCode)?.rank || 0) ? "default" : "outline"}
                              className="w-full"
                            >
                              {checkoutLoading === price?.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Processing...
                                </>
                              ) : tier.rank > (tiers.find((t) => t.code === memberTierCode)?.rank || 0) ? (
                                "Upgrade"
                              ) : (
                                "Downgrade"
                              )}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
            </div>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Need to cancel? Use the "Manage Billing & Subscription" button above.
            </p>
          </>
        )}
      </main>
    </div>
  );
};

export default MyAccount;
