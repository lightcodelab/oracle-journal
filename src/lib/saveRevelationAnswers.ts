import { supabase } from "@/integrations/supabase/client";

let pending: Promise<unknown> = Promise.resolve();

export function saveRevelationAnswers(id: string, answers: Record<string, string | undefined>) {
  const snapshot = { ...answers };
  const result = pending.catch(() => undefined).then(() =>
    supabase.from("revelations_readings").update({ journal_answers: snapshot }).eq("id", id),
  );
  pending = result;
  return result;
}

export async function waitForRevelationSaves() {
  await pending.catch(() => undefined);
}