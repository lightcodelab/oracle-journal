import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { captureAffiliateRef } from "@/lib/affiliateTracking";

const AffiliateRedirect = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      if (!code) {
        navigate("/", { replace: true });
        return;
      }
      try {
        const { data, error } = await supabase.rpc("track_affiliate_click", { _code: code });
        if (error || !data || !Array.isArray(data) || data.length === 0) {
          navigate("/", { replace: true });
          return;
        }
        const row = data[0] as any;
        captureAffiliateRef({
          code: row.referral_code ?? code,
          linkCode: code !== row.referral_code ? code : null,
          commissionModel: (row.commission_model as "one_time" | "recurring") || "recurring",
          capturedAt: Date.now(),
        });
        navigate(row.destination_path || "/", { replace: true });
      } catch {
        navigate("/", { replace: true });
      }
    };
    run();
  }, [code, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
      Redirecting…
    </div>
  );
};

export default AffiliateRedirect;