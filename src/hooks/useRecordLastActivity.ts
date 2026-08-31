import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type ActivityKind = "lesson" | "resource";

/**
 * Records the member's most recent lesson or resource so the Temple home
 * "Continue your journey" columns can send them straight back to it.
 *
 * Privacy: stores only a neutral pointer (kind, id, system-owned title, route)
 * scoped to the owner by RLS. No notes, answers, or reflection content.
 */
export function useRecordLastActivity(
  kind: ActivityKind,
  ref: { id?: string | null; title?: string | null; href?: string | null }
) {
  const { user } = useAuth();
  const lastKey = useRef<string | null>(null);

  const { id, title, href } = ref;

  useEffect(() => {
    if (!user || !id || !title || !href) return;
    const key = `${kind}:${id}`;
    if (lastKey.current === key) return;
    lastKey.current = key;

    void supabase
      .from("member_last_activity")
      .upsert(
        {
          user_id: user.id,
          kind,
          ref_id: id,
          title,
          href,
          occurred_at: new Date().toISOString(),
        },
        { onConflict: "user_id,kind" }
      );
  }, [user, kind, id, title, href]);
}
