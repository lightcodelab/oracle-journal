import { useEffect, useState } from "react";
import { X, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import HomeScreenInstructions, {
  isHandheldDevice,
  isStandaloneDisplay,
  NEW_TEMPLE_ADDRESS,
} from "@/components/temple/HomeScreenInstructions";

const INSTALL_DISMISSED_KEY = "temple-homescreen-install-dismissed";
const MIGRATION_SNOOZE_KEY = "temple-homescreen-migration-snooze-until";
const OLD_ARRIVAL_KEY = "temple-homescreen-old-arrival";
const OLD_DOMAIN = "thetemple.lightcodelab.com";
const SNOOZE_DAYS = 7;

type BannerMode = "migration" | "install";

/**
 * Thin, dismissible Home Screen banner for signed-in members.
 *
 * - migration: member reached The Temple through the old address (detected via
 *   referrer or `?from=old`, remembered locally so guidance recurs).
 * - install: member on the new address, on a phone/tablet, not running the
 *   installed Home Screen app.
 * - nothing: already running as an installed app, on desktop, or dismissed.
 */
const HomeScreenMoveBanner = () => {
  const [mode, setMode] = useState<BannerMode | null>(null);
  const [showHow, setShowHow] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const standalone = isStandaloneDisplay();
    const handheld = isHandheldDevice();

    // Old-address arrival signals. The redirect from the old address keeps the
    // path and query, so a `?from=old` marker survives when present; referrer
    // is only sometimes preserved. Remember the signal so guidance can recur.
    const params = new URLSearchParams(window.location.search);
    const oldSignal =
      params.get("from") === "old" || document.referrer.includes(OLD_DOMAIN);
    if (oldSignal) {
      try {
        localStorage.setItem(OLD_ARRIVAL_KEY, "1");
      } catch {
        /* storage unavailable — banner still works for this visit */
      }
    }

    let rememberedOldArrival = false;
    try {
      rememberedOldArrival = localStorage.getItem(OLD_ARRIVAL_KEY) === "1";
    } catch {
      /* ignore */
    }

    // Installed on the new address: stop all Home Screen prompting, and treat
    // the migration as complete.
    if (standalone) {
      try {
        localStorage.removeItem(OLD_ARRIVAL_KEY);
      } catch {
        /* ignore */
      }
      return;
    }

    const needsMigration = oldSignal || rememberedOldArrival;

    let next: BannerMode | null = null;
    if (needsMigration) {
      let snoozedUntil = 0;
      try {
        snoozedUntil = Number(localStorage.getItem(MIGRATION_SNOOZE_KEY) || 0);
      } catch {
        /* ignore */
      }
      if (Date.now() >= snoozedUntil) next = "migration";
    } else if (handheld) {
      let dismissed = false;
      try {
        dismissed = localStorage.getItem(INSTALL_DISMISSED_KEY) === "1";
      } catch {
        /* ignore */
      }
      if (!dismissed) next = "install";
    }

    if (!next) return;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled || !session) return;
      setMode(next);
      setShowHow(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = () => {
    try {
      if (mode === "migration") {
        localStorage.setItem(
          MIGRATION_SNOOZE_KEY,
          String(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000),
        );
      } else {
        localStorage.setItem(INSTALL_DISMISSED_KEY, "1");
      }
    } catch {
      /* ignore */
    }
    setMode(null);
  };

  if (!mode) return null;

  const migration = mode === "migration";
  const handheld = isHandheldDevice();

  return (
    <div
      role="status"
      className={
        migration
          ? "relative border-b border-primary-foreground/20 bg-primary"
          : "relative border-b border-border bg-card"
      }
    >
      <div className="mx-auto flex max-w-6xl items-start gap-3 px-4 py-2">
        <Home
          className={`mt-0.5 h-4 w-4 shrink-0 ${
            migration ? "text-primary-foreground" : "text-primary"
          }`}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p
            className={`text-xs sm:text-sm ${
              migration ? "text-primary-foreground" : "text-foreground"
            }`}
          >
            <span className="font-medium">
              {migration ? "The Temple has a new home." : "Keep The Temple close."}
            </span>{" "}
            {migration
              ? handheld
                ? "You're entering through our old address. Replace your old Home Screen icon with the new one so The Temple continues to open directly from your phone."
                : `You're entering through our old address. The Temple now lives at ${NEW_TEMPLE_ADDRESS} — please update your saved link.`
              : "Add The Temple to your Home Screen for an easier way back."}{" "}
            {(handheld || !migration) && (
              <button
                type="button"
                onClick={() => setShowHow((v) => !v)}
                aria-expanded={showHow}
                className={`underline ${
                  migration
                    ? "text-primary-foreground/90 hover:text-primary-foreground"
                    : "text-primary hover:text-primary/80"
                }`}
              >
                {showHow ? "Hide instructions" : "Show me how"}
              </button>
            )}
          </p>

          {showHow && (
            <div
              className={`mt-3 rounded-md p-3 ${
                migration ? "bg-background/95" : "bg-background"
              }`}
            >
              <HomeScreenInstructions replacingOldIcon={migration} />
              <button
                type="button"
                onClick={() => setShowHow(false)}
                className="mt-3 text-xs text-primary underline hover:text-primary/80"
              >
                Close instructions
              </button>
            </div>
          )}
        </div>
        <button
          onClick={dismiss}
          className={`shrink-0 rounded-md p-1 transition-colors ${
            migration
              ? "text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
          aria-label="Dismiss Home Screen notice"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default HomeScreenMoveBanner;
