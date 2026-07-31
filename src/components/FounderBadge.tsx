import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface FounderBadgeProps {
  since?: string | null;
  className?: string;
  size?: "sm" | "md";
}

/**
 * Permanent Founder recognition chip.
 *
 * This badge is cosmetic only. It never grants access — access is
 * decided by `is_active_member()` on the server. Show whenever a
 * `founding_members` row exists, regardless of subscription status.
 */
export function FounderBadge({ since, className, size = "sm" }: FounderBadgeProps) {
  const sinceLabel = since
    ? new Date(since).toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium tracking-wide",
        "border-primary/50 bg-primary/15 text-primary",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs",
        className,
      )}
      title={sinceLabel ? `Founding Member since ${sinceLabel}` : "Founding Member"}
      aria-label={sinceLabel ? `Founding Member since ${sinceLabel}` : "Founding Member"}
    >
      <Sparkles className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />
      <span>Founding Member</span>
    </span>
  );
}