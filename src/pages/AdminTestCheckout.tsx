import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FlaskConical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import ProfileDropdown from "@/components/ProfileDropdown";

// Admin-only Sandbox Checkout control (Pass 3.2c).
// - Verifies admin role client-side (server also enforces it).
// - Invokes stripe-checkout with mode="test" and a simulated `as_of`
//   date inside the Founding window. Server selects the Price ID from
//   app_settings; no keys, secrets, or Price IDs are ever exposed here.
// - Cannot create a Live Checkout — the mode flag is fixed to "test".
const FOUNDING_SIMULATED_DATE = "2026-10-01T12:00:00Z"; // inside [2026-09-14, 2026-12-14)

export default function AdminTestCheckout() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!role) {
        navigate("/");
        return;
      }
      setChecking(false);
    })();
  }, [navigate]);

  const startTestCheckout = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-checkout", {
        body: {
          mode: "test",
          as_of: FOUNDING_SIMULATED_DATE,
        },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("No checkout URL returned");
      window.location.href = data.url;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({
        title: "Test checkout failed",
        description: message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-serif text-xl">Verifying admin…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <PageBreadcrumb
          items={[
            { label: "Admin Dashboard", href: "/admin" },
            { label: "Test Checkout" },
          ]}
        />
        <ProfileDropdown />
      </div>

      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <FlaskConical className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="font-serif">Sandbox Test Checkout</CardTitle>
              <CardDescription>
                Admin-only. Simulated time inside the Founding window. Cannot create a Live charge.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-border bg-muted/30 p-4 text-sm space-y-2">
              <p><strong>Environment:</strong> Stripe Sandbox (test mode)</p>
              <p><strong>Simulated date:</strong> 2026-10-01 (inside Founding window)</p>
              <p><strong>Offer:</strong> Founding — resolved server-side from settings</p>
              <p className="text-muted-foreground">
                No API keys, signing secrets, or Price IDs are exposed. This control cannot
                target Live Stripe.
              </p>
            </div>

            <div className="rounded-md border border-border p-4 text-sm space-y-1">
              <p className="font-medium">Use these Sandbox test card details on the Stripe page:</p>
              <ul className="list-disc pl-5 text-muted-foreground">
                <li>Card: <code>4242 4242 4242 4242</code></li>
                <li>Expiry: any future date</li>
                <li>CVC: any 3 digits</li>
                <li>Postcode: any</li>
              </ul>
            </div>

            <Button onClick={startTestCheckout} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Opening Sandbox Checkout…
                </>
              ) : (
                "Start Sandbox Founding Checkout ($35 AUD)"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}