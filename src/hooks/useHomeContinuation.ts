import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type ContinuationKind = "card" | "lesson" | "resource";

export interface Continuation {
  kind: ContinuationKind;
  label: string;
  title: string;
  href: string;
  timestamp: string | null;
  available: boolean;
  emptyHint: string;
  fallbackHref: string;
}

export interface HomeContinuations {
  card: Continuation;
  lesson: Continuation;
  resource: Continuation;
}

const EMPTY: HomeContinuations = {
  card: {
    kind: "card",
    label: "Return to your recent card draw",
    title: "No card drawn yet",
    href: "/readings",
    timestamp: null,
    available: false,
    emptyHint: "Draw your first card",
    fallbackHref: "/remembrance",
  },
  lesson: {
    kind: "lesson",
    label: "Return to the last course lesson you began",
    title: "No lesson opened yet",
    href: "/courses",
    timestamp: null,
    available: false,
    emptyHint: "Explore the courses",
    fallbackHref: "/courses",
  },
  resource: {
    kind: "resource",
    label: "Return to the last resource you used",
    title: "No resource opened yet",
    href: "/search",
    timestamp: null,
    available: false,
    emptyHint: "Search the Temple",
    fallbackHref: "/search",
  },
};

/**
 * Returns three RLS-scoped return paths for the member: their most recent card
 * draw, the last course lesson they opened, and the last resource they used.
 *
 * Privacy: never reads or exposes protocol intake, journal contents,
 * lesson form responses, symptom data, or reading notes. Only neutral
 * pointers and system-owned titles are surfaced.
 */
export function useHomeContinuation(enabled: boolean) {
  const { user } = useAuth();

  return useQuery<HomeContinuations>({
    queryKey: ["home-continuation", user?.id],
    enabled: enabled && !!user,
    queryFn: async () => {
      if (!user) return EMPTY;

      const [cardRes, activityRes] = await Promise.allSettled([
        supabase
          .from("card_draws")
          .select("card_id, deck_id, drawn_at, decks(name)")
          .eq("user_id", user.id)
          .order("drawn_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("member_last_activity")
          .select("kind, ref_id, title, href, occurred_at")
          .eq("user_id", user.id),
      ]);

      const result: HomeContinuations = {
        card: { ...EMPTY.card },
        lesson: { ...EMPTY.lesson },
        resource: { ...EMPTY.resource },
      };

      if (cardRes.status === "fulfilled" && cardRes.value.data) {
        const row = cardRes.value.data as {
          drawn_at: string;
          card_id: string | null;
          deck_id: string | null;
          decks: { name: string | null } | null;
        };
        let cardTitle: string | undefined;
        if (row.card_id) {
          const { data: card } = await supabase
            .from("cards")
            .select("card_title")
            .eq("id", row.card_id)
            .maybeSingle();
          cardTitle = card?.card_title?.trim() || undefined;
        }
        const deckName = row.decks?.name?.trim();
        result.card = {
          ...result.card,
          title: cardTitle
            ? deckName
              ? `${cardTitle} — ${deckName}`
              : cardTitle
            : "Your recent card draw",
          href:
            row.card_id && row.deck_id
              ? `/remembrance?deck=${row.deck_id}&card=${row.card_id}`
              : "/remembrance",
          timestamp: row.drawn_at,
          available: true,
        };
      }

      if (activityRes.status === "fulfilled" && activityRes.value.data) {
        for (const row of activityRes.value.data as Array<{
          kind: string;
          title: string;
          href: string;
          occurred_at: string;
        }>) {
          if (row.kind !== "lesson" && row.kind !== "resource") continue;
          result[row.kind] = {
            ...result[row.kind],
            title: row.title,
            href: row.href,
            timestamp: row.occurred_at,
            available: true,
          };
        }
      }

      return result;
    },
    staleTime: 60_000,
  });
}
