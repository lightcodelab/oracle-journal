import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Loader2, ArrowRight, FlaskConical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const MembershipSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tierName, setTierName] = useState<string | null>(null);

  // Presentation-only Sandbox detection. Stripe issues session IDs with a
  // `cs_test_` prefix in Sandbox and `cs_live_` in Live — this is a
  // server-issued value, not client-injected. It affects copy only and
  // is NEVER used to determine entitlement or access, which are driven
  // exclusively by the server-side membership state.
  const sessionId = searchParams.get("session_id") ?? "";
  const isSandbox = sessionId.startsWith("cs_test_");

  useEffect(() => {
    if (!sessionId) {
      navigate("/membership");
      return;
    }

    // Poll for subscription to be processed
    const checkSubscription = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      // Sandbox checkouts intentionally do not touch legacy profile
      // fields, so polling for them would never succeed. Show the
      // Sandbox confirmation immediately.
      if (isSandbox) {
        setLoading(false);
        return;
      }

      let attempts = 0;
      const maxAttempts = 10;
      
      const poll = async () => {
        attempts++;
        
        const { data: profile } = await supabase
          .from("profiles")
          .select("member_tier_code, subscription_status")
          .eq("id", user.id)
          .single();

        if (profile?.member_tier_code && profile?.subscription_status) {
          // Get tier name
          const { data: tier } = await supabase
            .from("tiers")
            .select("name")
            .eq("code", profile.member_tier_code)
            .single();

          setTierName(tier?.name || profile.member_tier_code);
          setLoading(false);
          return;
        }

        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          setLoading(false);
        }
      };

      poll();
    };

    checkSubscription();
  }, [sessionId, isSandbox, navigate, user]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          {loading ? (
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : isSandbox ? (
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <FlaskConical className="w-8 h-8 text-primary" />
            </div>
          ) : (
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          )}
          <CardTitle className="text-2xl">
            {loading
              ? "Processing..."
              : isSandbox
                ? "Sandbox test completed"
                : "Welcome to the Temple!"}
          </CardTitle>
          <CardDescription>
            {loading 
              ? "Setting up your membership..."
              : isSandbox
                ? "Sandbox test completed — no real member access was granted."
              : tierName 
                ? `You're now a ${tierName}. Welcome to the Temple!`
                : "Your subscription is being processed."
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!loading && (
            <>
              {isSandbox ? (
                <p className="text-sm text-muted-foreground">
                  This was a Stripe Sandbox test checkout. Test entitlements are
                  isolated from Live billing and never grant real membership
                  access or a Live Founder badge.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  You now have full access to your membership benefits. Explore
                  the Temple and begin your journey.
                </p>
              )}
              <div className="flex flex-col gap-2">
                {isSandbox ? (
                  <Button
                    variant="outline"
                    onClick={() => navigate("/admin")}
                    className="w-full"
                  >
                    Return to Admin Dashboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <>
                    <Button onClick={() => navigate("/")} className="w-full">
                      Enter the Temple
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/profile")}>
                      View My Profile
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MembershipSuccess;
