import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type ContinuationKind =
  | "lesson"
  | "protocol"
  | "reading"
  | "card"
  | "none";

export interface Continuation {
  kind: ContinuationKind;
  label: string;
  title: string;
  href: string;
  timestamp: string | null;
}

const KIND_ORDER: Record<ContinuationKind, number> = {
  lesson: 4,
  protocol: 3,
  reading: 2,
  card: 1,
  none: 0,
};

/**
 * Selects one meaningful, RLS-scoped recent activity for the member.
 *
 * Privacy: never reads or exposes protocol intake, journal contents,
 * lesson form responses, symptom data, or reading notes. Only neutral
 * pointers and system-owned titles are surfaced.
 */
export function useHomeContinuation(enabled: boolean) {
  const { user } = useAuth();

  return useQuery<Continuation>({
    queryKey: ["home-continuation", user?.id],
    enabled: enabled && !!user,
    queryFn: async () => {
      if (!user) return { kind: "none", label: "", title: "", href: "", timestamp: null };

      // Fire minimal, RLS-scoped queries in parallel. Each returns at most one row.
      const [lessonRes, protocolRes, readingRes, cardRes] = await Promise.allSettled([
        // Unfinished lesson: journal entry NOT completed
        supabase
          .from("lesson_journal_entries")
          .select("lesson_id, updated_at, completed_at")
          .eq("user_id", user.id)
          .is("completed_at", null)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        // Saved AreekeerA protocol
        supabase
          .from("user_areekeera_protocols")
          .select("id, protocol_id, saved_at")
          .eq("user_id", user.id)
          .order("saved_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        // Saved reading — expose only system-owned fields
        supabase
          .from("saved_readings")
          .select("id, card_title, deck_name, saved_at")
          .eq("user_id", user.id)
          .order("saved_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        // Recent card draw
        supabase
          .from("card_draws")
          .select("card_id, deck_id, drawn_at")
          .eq("user_id", user.id)
          .order("drawn_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const candidates: Continuation[] = [];

      if (lessonRes.status === "fulfilled" && lessonRes.value.data) {
        const row = lessonRes.value.data as { lesson_id: string; updated_at: string };
        // Look up the course id for this lesson so the link is a real destination.
        const { data: lesson } = await supabase
          .from("lessons")
          .select("id, course_id, title")
          .eq("id", row.lesson_id)
          .maybeSingle();
        if (lesson?.course_id) {
          candidates.push({
            kind: "lesson",
            label: "Continue your journey",
            title: lesson.title || "Continue your lesson",
            href: `/devotion/course/${lesson.course_id}/lesson/${lesson.id}`,
            timestamp: row.updated_at,
          });
        }
      }

      if (protocolRes.status === "fulfilled" && protocolRes.value.data) {
        const row = protocolRes.value.data as { id: string; saved_at: string };
        candidates.push({
          kind: "protocol",
          label: "Return to your protocol",
          // Deliberately generic. Do NOT surface protocol title or intake content.
          title: "Your saved AreekeerA® protocol",
          href: `/devotion/protocols`,
          timestamp: row.saved_at,
        });
      }

      if (readingRes.status === "fulfilled" && readingRes.value.data) {
        const row = readingRes.value.data as {
          card_title: string | null;
          deck_name: string | null;
          saved_at: string;
        };
        candidates.push({
          kind: "reading",
          label: "Revisit your reading",
          // card_title and deck_name are system-owned card metadata, not user notes.
          title: row.card_title
            ? `${row.card_title}${row.deck_name ? ` — ${row.deck_name}` : ""}`
            : "Your saved reading",
          href: `/readings`,
          timestamp: row.saved_at,
        });
      }

      if (cardRes.status === "fulfilled" && cardRes.value.data) {
        const row = cardRes.value.data as { drawn_at: string };
        candidates.push({
          kind: "card",
          label: "Return to your recent card",
          title: "Your recent card draw",
          href: `/readings`,
          timestamp: row.drawn_at,
        });
      }

      if (!candidates.length) {
        return { kind: "none", label: "", title: "", href: "", timestamp: null };
      }

      candidates.sort((a, b) => {
        const ta = a.timestamp ? Date.parse(a.timestamp) : 0;
        const tb = b.timestamp ? Date.parse(b.timestamp) : 0;
        if (tb !== ta) return tb - ta;
        return KIND_ORDER[b.kind] - KIND_ORDER[a.kind];
      });

      return candidates[0];
    },
    staleTime: 60_000,
  });
}
