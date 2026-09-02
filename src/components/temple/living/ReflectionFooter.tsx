import { useMemberState } from "@/hooks/useMemberState";
import ContextualJournal from "@/components/journal/ContextualJournal";
import ResourceFieldNotes from "@/components/temple/living/ResourceFieldNotes";
import EarlierJournalNotes from "@/components/temple/living/EarlierJournalNotes";
import type { LivingResourceFamily } from "@/hooks/useLivingExperiments";

/**
 * TL-1B — the single bottom-of-page reflection footer for eligible Temple
 * resources and cards.
 *
 * TL-2E — public rollout: every member with full Temple access
 * (`hasFullTempleAccess`) sees Field Notes for Your Experiments. Members
 * without full access keep the existing generic Journal Notes surface,
 * unchanged.
 */

interface ReflectionFooterProps {
  /** Canonical resource family used by the owner-only Living Pattern RPCs. */
  resourceFamily: LivingResourceFamily;
  resourceId: string;
  /** Existing generic Journal context, preserved exactly for legacy behaviour. */
  contextType: "card" | "lesson" | "course" | "deck" | "protocol_step" | "resource";
  contextId: string;
  contextTitle: string;
  placeholder?: string;
  /** Optional surface-specific wording for the two voluntary Field Notes actions. */
  startLabel?: string;
  attachLabel?: string;
  /**
   * TL-2C — when the surface has no verified linked resource, show her history
   * read-only instead of any composer. Never invents an origin.
   */
  historyOnlyWhenUnanchored?: boolean;
  className?: string;
}


export default function ReflectionFooter({
  resourceFamily,
  resourceId,
  contextType,
  contextId,
  contextTitle,
  placeholder,
  startLabel,
  attachLabel,
  historyOnlyWhenUnanchored = false,
  className,
}: ReflectionFooterProps) {
  const { hasFullTempleAccess, loading } = useMemberState();

  if (loading) return null;

  if (hasFullTempleAccess) {
    /**
     * TL-2C — an eligible surface with no verified linked resource never gets an
     * invented origin or a Field Notes composer: her history alone is shown,
     * strictly read-only.
     */
    if (!resourceId) {
      if (historyOnlyWhenUnanchored) {
        return (
          <div className={className}>
            <EarlierJournalNotes
              legacyContextType={contextType}
              legacyContextId={contextId}
            />
          </div>
        );
      }
    } else {
      return (
        <ResourceFieldNotes
          resourceFamily={resourceFamily}
          resourceId={resourceId}
          legacyContextType={contextType}
          legacyContextId={contextId}
          startLabel={startLabel}
          attachLabel={attachLabel}
          className={className}
        />
      );
    }
  }



  return (
    <ContextualJournal
      contextType={contextType}
      contextId={contextId}
      contextTitle={contextTitle}
      placeholder={placeholder}
      className={className}
    />
  );
}
