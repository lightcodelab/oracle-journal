import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CreditCard, 
  Sparkles, 
  ArrowUpRight, 
  Check, 
  Loader2, 
  Pause, 
  Play, 
  XCircle,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTierAccess, TIER_NAMES } from "@/hooks/useTierAccess";
import { useMembership } from "@/hooks/useMembership";
import ProfileDropdown from "@/components/ProfileDropdown";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { motion } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

const BUCKET_LABELS: Record<string, string> = {
  remembrance: "Door of Remembrance",
  devotion: "Door of Devotion",
  communion: "Door of Communion",
};

const MyAccount = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { memberTierCode, subscriptionStatus, tierName, loading: tierLoading, isAdmin, bucketAccess, refetch } = useTierAccess();
  const { tiers, loading: tiersLoading, startCheckout, checkoutLoading } = useMembership();
  const [portalLoading, setPortalLoading] = useState(false);
  const [pauseLoading, setPauseLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [billingCadence, setBillingCadence] = useState<"monthly" | "yearly">("monthly");
  const [manualGrants, setManualGrants] = useState<{ bucket_key: string; ends_at: string }[]>([]);

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

  // Fetch manual access grants
  useEffect(() => {
    const fetchManualGrants = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("manual_access_grants")
        .select("bucket_key, ends_at")
        .eq("user_id", session.user.id)
        .gte("ends_at", now);
      if (data) setManualGrants(data);
    };
    fetchManualGrants();
  }, []);

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

  const handlePauseResume = async (action: "pause" | "resume") => {
    setPauseLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-pause-subscription", {
        body: { action },
      });

      if (error) throw error;

      toast({
        title: action === "pause" ? "Membership Paused" : "Membership Resumed",
        description: action === "pause" 
          ? "Your membership has been paused. You can resume anytime."
          : "Welcome back! Your membership is now active.",
      });

      // Refresh the tier access data
      await refetch();
    } catch (error) {
      console.error("Pause/resume error:", error);
      toast({
        title: "Error",
        description: `Unable to ${action} membership. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setPauseLoading(false);
    }
  };

  const handleCancel = async () => {
    setCancelLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-cancel-subscription", {
        body: { immediate: true },
      });

      if (error) throw error;

      toast({
        title: "Membership Canceled",
        description: "Your membership has been canceled. We're sorry to see you go.",
      });

      // Refresh the tier access data
      await refetch();
    } catch (error) {
      console.error("Cancel error:", error);
      toast({
        title: "Error",
        description: "Unable to cancel membership. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCancelLoading(false);
    }
  };

  const handleUpgrade = (priceId: string) => {
    startCheckout(priceId);
  };

  const isActiveMember = subscriptionStatus === "active" || subscriptionStatus === "trialing";
  const isPaused = subscriptionStatus === "paused";
  const hasManualAccess = manualGrants.length > 0;
  const hasSubscription = isActiveMember || isPaused;

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

        {/* Paused Membership Banner */}
        {isPaused && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="bg-amber-500/10 border-amber-500/30">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <Pause className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Membership Paused</p>
                    <p className="text-sm text-muted-foreground">
                      Your access is currently paused. Resume anytime to regain access.
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => handlePauseResume("resume")}
                  disabled={pauseLoading}
                  className="flex-shrink-0"
                >
                  {pauseLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Resume Membership
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

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
              {!isActiveMember && hasManualAccess && (
                <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5">
                  <Check className="w-3 h-3 mr-1" />
                  Active
                </Badge>
              )}
              {isPaused && (
                <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/10">
                  <Pause className="w-3 h-3 mr-1" />
                  Paused
                </Badge>
              )}
              {isAdmin && (
                <Badge variant="secondary">Admin</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {isActiveMember
                ? `You are currently on the ${tierName || "Member"} tier`
                : hasManualAccess
                ? "You have been granted access to selected content"
                : isPaused
                ? `Your ${tierName || "membership"} is paused`
                : "You don't have an active membership"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(isActiveMember || isPaused) && memberTierCode && (
              <>
                <div className={`p-4 rounded-lg border ${isPaused ? 'bg-muted/50 border-muted' : 'bg-primary/5 border-primary/20'}`}>
                  <h3 className="font-medium mb-2">{tierName}</h3>
                  <ul className="space-y-1">
                    {TIER_FEATURES[memberTierCode]?.map((feature) => (
                      <li key={feature} className={`text-sm flex items-center gap-2 ${isPaused ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}>
                        <Check className={`w-4 h-4 ${isPaused ? 'text-muted-foreground/60' : 'text-primary'}`} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {isPaused && (
                    <p className="text-sm text-amber-600 mt-3">
                      Access paused — resume to use these features
                    </p>
                  )}
                </div>
              </>
            )}
            {!hasSubscription && hasManualAccess && !isAdmin && (
              <div className="p-4 rounded-lg border bg-primary/5 border-primary/20">
                <h3 className="font-medium mb-2">Your Access</h3>
                <ul className="space-y-1">
                  {manualGrants.map((grant) => (
                    <li key={grant.bucket_key} className="text-sm flex items-center gap-2 text-muted-foreground">
                      <Check className="w-4 h-4 text-primary" />
                      {BUCKET_LABELS[grant.bucket_key] || grant.bucket_key}
                      <span className="text-xs text-muted-foreground/60 ml-auto">
                        until {new Date(grant.ends_at).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {!hasSubscription && !hasManualAccess && !isAdmin && (
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

        {/* Payment & Billing Section */}
        {hasSubscription && (
          <Card className="mb-8 border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment & Billing
              </CardTitle>
              <CardDescription>
                Update your payment method, view invoices, and manage billing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                    Update Payment Method & View Invoices
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Opens Stripe's secure billing portal where you can update your credit card, view past invoices, and download receipts.
              </p>
            </CardContent>
          </Card>
        )}

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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
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
          </>
        )}

        {/* Pause & Cancel Section */}
        {hasSubscription && (
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">Pause or Cancel</CardTitle>
              <CardDescription>
                Need a break? You can pause or cancel your membership anytime.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Pause Membership */}
              {isActiveMember && (
                <div className="p-4 rounded-lg border border-border bg-background/50">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <Pause className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium mb-1">Pause Membership</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Take a break without losing your account. Your billing will be paused and you can resume anytime. 
                        While paused, you'll keep access to your profile and account but not the Temple content.
                      </p>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" disabled={pauseLoading}>
                            {pauseLoading ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Pause className="w-4 h-4 mr-2" />
                            )}
                            Pause Membership
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Pause your membership?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Your billing will be paused immediately. You'll lose access to Temple content but can still log in and view your account. 
                              Resume anytime to restore full access.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep Membership Active</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handlePauseResume("pause")}>
                              Yes, Pause Membership
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              )}

              {/* Resume Membership (shown when paused) */}
              {isPaused && (
                <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Play className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium mb-1">Resume Membership</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Ready to come back? Resume your membership to restore full access to all Temple content.
                      </p>
                      <Button onClick={() => handlePauseResume("resume")} disabled={pauseLoading}>
                        {pauseLoading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4 mr-2" />
                        )}
                        Resume Membership
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {/* Cancel Membership */}
              <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <XCircle className="w-5 h-5 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium mb-1">Cancel Membership</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Cancel your membership completely. You'll lose access immediately. 
                      You can always rejoin later if you change your mind.
                    </p>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={cancelLoading}>
                          {cancelLoading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4 mr-2" />
                          )}
                          Cancel Membership
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-destructive" />
                            Cancel your membership?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This will cancel your membership immediately. You'll lose access to all Temple content. 
                            Your account will remain active so you can rejoin anytime.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep Membership</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={handleCancel}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Yes, Cancel Membership
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default MyAccount;
