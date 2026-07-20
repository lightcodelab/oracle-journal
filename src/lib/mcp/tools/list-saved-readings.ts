import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function client(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_saved_readings",
  title: "List saved oracle readings",
  description: "List the signed-in user's saved oracle card readings from the Sacred Spreads and card decks.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional().describe("Max readings to return (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = client(ctx);
    const { data, error } = await supabase
      .from("saved_readings")
      .select("id, card_title, deck_name, spread_name, spread_type, notes, is_encrypted, saved_at")
      .eq("user_id", ctx.getUserId())
      .order("saved_at", { ascending: false })
      .limit(limit ?? 20);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const readings = (data ?? []).map((r) => ({
      ...r,
      notes: r.is_encrypted ? "[encrypted — unlock in the Temple app]" : r.notes,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(readings, null, 2) }],
      structuredContent: { readings },
    };
  },
});