import { useEffect, useState } from "react";
import { X, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const DISMISSED_KEY = "temple-domain-move-banner-dismissed";
const OLD_DOMAIN = "thetemple.lightcodelab.com";

/**
 * One-time notice asking members to re-add The Temple to their home screen
 * after the move to inside.thetempleofsustainment.com.
 *
 * Shown to signed-in members. Rendered more prominently (with instructions
 * open by default) when we can detect an installed app or an arrival from
 * the old address.
 */
const HomeScreenMoveBanner = () => {
  const [visible, setVisible] = useState(false);
  const [installedCase, setInstalledCase] = useState(false);
  const [showHow, setShowHow] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return;

    // Installed app (standalone display) or arrival from the old address.
    const standalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    const fromOldDomain =
      document.referrer.includes(OLD_DOMAIN) ||
      new URLSearchParams(window.location.search).get("from") === "old";
    const detected = standalone || fromOldDomain;

    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled || !session) return;
      setInstalledCase(detected);
      setShowHow(detected);
      setVisible(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="status"
      className="relative border-b border-primary-foreground/20 bg-primary"
    >
      <div className="mx-auto flex max-w-6xl items-start gap-3 px-4 py-2">
        <Home className="mt-0.5 h-4 w-4 shrink-0 text-primary-foreground" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm text-primary-foreground">
            The Temple now lives at{" "}
            <span className="font-medium">inside.thetempleofsustainment.com</span>.
            {installedCase
              ? " Please re-add it to your home screen so your app icon opens the new address."
              : " If you saved it to your home screen, please re-add it."}{" "}
            <button
              type="button"
              onClick={() => setShowHow((v) => !v)}
              className="underline text-primary-foreground/90 hover:text-primary-foreground"
            >
              {showHow ? "Hide steps" : "How to update"}
            </button>
          </p>
          {showHow && (
            <div className="mt-2 space-y-1 text-xs text-primary-foreground/80">
              <p>
                <span className="text-primary-foreground">iPhone / iPad:</span> delete the old
                Temple icon, open inside.thetempleofsustainment.com in Safari, tap
                Share, then Add to Home Screen.
              </p>
              <p>
                <span className="text-primary-foreground">Android:</span> remove the old icon,
                open inside.thetempleofsustainment.com in Chrome, tap the menu, then
                Add to Home screen or Install app.
              </p>
              <p>Nothing inside The Temple changes — your account and notes stay as they are.</p>
            </div>
          )}
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 rounded-md p-1 text-primary-foreground/80 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground"
          aria-label="Dismiss notice"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default HomeScreenMoveBanner;
