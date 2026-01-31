import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const MembershipSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tierName, setTierName] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    
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
  }, [searchParams, navigate, user]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          {loading ? (
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          )}
          <CardTitle className="text-2xl">
            {loading ? "Processing..." : "Welcome to the Temple!"}
          </CardTitle>
          <CardDescription>
            {loading 
              ? "Setting up your membership..."
              : tierName 
                ? `You're now a ${tierName}. Your 7-day free trial has begun.`
                : "Your subscription is being processed."
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!loading && (
            <>
              <p className="text-sm text-muted-foreground">
                You now have full access to your membership benefits. Explore the Temple and begin your journey.
              </p>
              <div className="flex flex-col gap-2">
                <Button onClick={() => navigate("/")} className="w-full">
                  Enter the Temple
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button variant="outline" onClick={() => navigate("/profile")}>
                  View My Profile
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MembershipSuccess;
