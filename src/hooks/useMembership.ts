import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Plan {
  code: string;
  name: string;
  description: string | null;
}

interface Price {
  id: string;
  plan_code: string;
  cadence: "monthly" | "yearly";
  unit_amount_cents: number;
  currency: string;
  provider: string;
  provider_price_id: string | null;
}

interface Tier {
  code: string;
  name: string;
  rank: number;
  is_active: boolean;
}

interface TierWithPricing extends Tier {
  plan: Plan | null;
  monthlyPrice: Price | null;
  yearlyPrice: Price | null;
  buckets: string[];
}

export function useMembership() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tiers, setTiers] = useState<TierWithPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [currentTier, setCurrentTier] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [pendingPriceId, setPendingPriceId] = useState<string | null>(null);

  useEffect(() => {
    fetchTiersAndPricing();
    if (user) {
      fetchUserMembership();
      // Check if there's a pending checkout after auth
      // Support both keys for compatibility (pendingCheckoutPriceId from direct flow, pendingTrialPriceId from OAuth)
      const storedPriceId = sessionStorage.getItem("pendingCheckoutPriceId") || 
                            sessionStorage.getItem("pendingTrialPriceId");
      if (storedPriceId) {
        sessionStorage.removeItem("pendingCheckoutPriceId");
        sessionStorage.removeItem("pendingTrialPriceId");
        startCheckout(storedPriceId);
      }
    }
  }, [user]);

  const fetchTiersAndPricing = async () => {
    try {
      // Fetch tiers
      const { data: tiersData, error: tiersError } = await supabase
        .from("tiers")
        .select("*")
        .order("display_order");

      if (tiersError) throw tiersError;

      // Fetch plans
      const { data: plansData, error: plansError } = await supabase
        .from("plans")
        .select("*")
        .eq("active", true);

      if (plansError) throw plansError;

      // Fetch prices (Stripe only for now)
      const { data: pricesData, error: pricesError } = await supabase
        .from("prices")
        .select("*")
        .eq("active", true)
        .eq("provider", "stripe");

      if (pricesError) throw pricesError;

      // Fetch tier bucket access
      const { data: bucketAccessData, error: bucketError } = await supabase
        .from("tier_bucket_access")
        .select("tier_code, bucket_key");

      if (bucketError) throw bucketError;

      // Combine data
      const tiersWithPricing: TierWithPricing[] = (tiersData || []).map((tier) => {
        const plan = plansData?.find((p) => p.code === tier.code) || null;
        const tierPrices = pricesData?.filter((p) => p.plan_code === tier.code) || [];
        const buckets = bucketAccessData
          ?.filter((ba) => ba.tier_code === tier.code)
          .map((ba) => ba.bucket_key) || [];

        return {
          ...tier,
          plan,
          monthlyPrice: tierPrices.find((p) => p.cadence === "monthly") || null,
          yearlyPrice: tierPrices.find((p) => p.cadence === "yearly") || null,
          buckets,
        };
      });

      setTiers(tiersWithPricing);
    } catch (error) {
      console.error("Error fetching membership data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserMembership = async () => {
    if (!user) return;

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("member_tier_code, subscription_status")
      .eq("id", user.id)
      .single();

    if (!error && profile) {
      setCurrentTier(profile.member_tier_code);
      setSubscriptionStatus(profile.subscription_status);
    }
  };

  const startCheckout = async (priceId: string) => {
    if (!user) {
      // Store the intended price and redirect to auth with signup mode
      sessionStorage.setItem("pendingCheckoutPriceId", priceId);
      toast({
        title: "Create your account",
        description: "Sign up to start your 7-day free trial.",
      });
      navigate(`/auth?mode=signup&priceId=${priceId}`);
      return;
    }

    setCheckoutLoading(priceId);

    try {
      const { data, error } = await supabase.functions.invoke("stripe-checkout", {
        body: { priceId },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Checkout failed",
        description: "Unable to start checkout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const hasBucketAccess = (bucketKey: string): boolean => {
    if (!currentTier) return false;
    const userTier = tiers.find((t) => t.code === currentTier);
    return userTier?.buckets.includes(bucketKey) || false;
  };

  return {
    tiers,
    loading,
    checkoutLoading,
    currentTier,
    subscriptionStatus,
    startCheckout,
    hasBucketAccess,
    refetch: fetchUserMembership,
  };
}
