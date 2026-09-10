import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Apple, Smartphone } from "lucide-react";

export const NEW_TEMPLE_ADDRESS = "inside.thetempleofsustainment.com";

export type DevicePlatform = "ios" | "android" | "other";

/**
 * Best-effort platform guess. When we cannot tell, we show both sets of
 * instructions side by side (tabs) rather than guessing wrongly.
 */
export function detectPlatform(): DevicePlatform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ reports as Mac with touch support
    (/Macintosh/.test(ua) && (navigator as { maxTouchPoints?: number }).maxTouchPoints! > 1);
  if (isIOS) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

/** True when the current visit is running as an installed home screen app. */
export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
    window.matchMedia?.("(display-mode: fullscreen)")?.matches === true ||
    window.matchMedia?.("(display-mode: minimal-ui)")?.matches === true ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/** True for phones and tablets, where a home screen icon is meaningful. */
export function isHandheldDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const platform = detectPlatform();
  if (platform === "ios" || platform === "android") return true;
  return (
    (navigator as { maxTouchPoints?: number }).maxTouchPoints! > 0 &&
    window.matchMedia?.("(max-width: 1024px)")?.matches === true
  );
}

interface HomeScreenInstructionsProps {
  /** When true, includes the step for removing the previous Temple icon. */
  replacingOldIcon?: boolean;
  className?: string;
}

/**
 * Single source of truth for "add The Temple to your Home Screen" guidance.
 * Used by the top banner and reusable by the Orientation experience.
 */
const HomeScreenInstructions = ({
  replacingOldIcon = false,
  className,
}: HomeScreenInstructionsProps) => {
  const [platform, setPlatform] = useState<DevicePlatform>("other");

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  const defaultTab = platform === "android" ? "android" : "iphone";

  return (
    <div className={className}>
      <Tabs value={undefined} defaultValue={defaultTab} key={defaultTab}>
        <TabsList className="grid w-full max-w-sm grid-cols-2">
          <TabsTrigger value="iphone" className="gap-1.5">
            <Apple className="h-4 w-4" aria-hidden="true" /> iPhone / iPad
          </TabsTrigger>
          <TabsTrigger value="android" className="gap-1.5">
            <Smartphone className="h-4 w-4" aria-hidden="true" /> Android
          </TabsTrigger>
        </TabsList>

        <TabsContent value="iphone" className="mt-4 text-sm">
          <ol className="list-decimal space-y-2 pl-5">
            {replacingOldIcon && (
              <li>
                Press and hold your old Temple icon on your Home Screen, then choose
                <strong> Remove App</strong> and <strong>Delete from Home Screen</strong>.
              </li>
            )}
            <li>
              Open <strong>Safari</strong> and go to{" "}
              <strong>{NEW_TEMPLE_ADDRESS}</strong>.
            </li>
            <li>Tap the <strong>Share</strong> button at the bottom of the screen.</li>
            <li>
              Scroll down and tap <strong>Add to Home Screen</strong>, then tap{" "}
              <strong>Add</strong>.
            </li>
            <li>Open The Temple from your new icon and sign in once if asked.</li>
          </ol>
        </TabsContent>

        <TabsContent value="android" className="mt-4 text-sm">
          <ol className="list-decimal space-y-2 pl-5">
            {replacingOldIcon && (
              <li>
                Press and hold your old Temple icon, then drag it to{" "}
                <strong>Remove</strong>.
              </li>
            )}
            <li>
              Open <strong>Chrome</strong> and go to <strong>{NEW_TEMPLE_ADDRESS}</strong>.
            </li>
            <li>
              Tap the <strong>three-dot menu</strong> in the top right corner.
            </li>
            <li>
              Tap <strong>Add to Home screen</strong> or <strong>Install app</strong>, then
              confirm.
            </li>
            <li>Open The Temple from your new icon and sign in once if asked.</li>
          </ol>
        </TabsContent>
      </Tabs>

      <p className="mt-3 text-xs text-muted-foreground">
        Nothing inside The Temple changes — your membership, courses, Pattern Records,
        Field Notes and saved work all stay exactly as they are.
      </p>
    </div>
  );
};

export default HomeScreenInstructions;
