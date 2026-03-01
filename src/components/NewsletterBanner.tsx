import { useState, useEffect } from "react";
import { X, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const BANNER_DISMISSED_KEY = "newsletter-banner-dismissed";

const NewsletterBanner = () => {
  const [visible, setVisible] = useState(false);
  const [optIn, setOptIn] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const check = async () => {
      // Don't show if already dismissed
      if (localStorage.getItem(BANNER_DISMISSED_KEY)) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("newsletter_opt_in")
        .eq("id", session.user.id)
        .single();

      // Don't show if already opted in
      if (profile?.newsletter_opt_in) return;

      setVisible(true);
    };
    check();
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(BANNER_DISMISSED_KEY, "true");
    setVisible(false);
  };

  const handleSubscribe = async () => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from("profiles")
      .update({ newsletter_opt_in: true, updated_at: new Date().toISOString() })
      .eq("id", session.user.id);

    if (!error) {
      try {
        await supabase.functions.invoke("mailerlite-sync", {
          body: { opt_in: true },
        });
      } catch (e) {
        console.error("MailerLite sync error:", e);
      }

      toast({
        title: "Subscribed!",
        description: "You'll receive updates about new content and features.",
      });
      localStorage.setItem(BANNER_DISMISSED_KEY, "true");
      setVisible(false);
    }
    setSaving(false);
  };

  if (!visible) return null;

  return (
    <div className="relative bg-primary/10 border-b border-primary/20">
      <div className="container flex items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Mail className="w-5 h-5 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              Stay in the loop
            </p>
            <p className="text-xs text-muted-foreground">
              Get notified when new features or content drops. You can always change this in your{" "}
              <a href="/profile" className="underline text-primary hover:text-primary/80">
                Profile settings
              </a>.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={handleSubscribe}
            disabled={saving}
            className="text-xs"
          >
            {saving ? "Subscribing..." : "Subscribe"}
          </Button>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewsletterBanner;
