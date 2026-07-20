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
  name: "list_journal_entries",
  title: "List journal entries",
  description:
    "List the signed-in user's recent Digital Journal entries. Returns non-encrypted entries only; entries the user has end-to-end encrypted are omitted from content.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional().describe("Max entries to return (default 20)."),
    context_type: z
      .string()
      .optional()
      .describe("Optional filter: 'lesson', 'reading', 'protocol', 'quick_capture', etc."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, context_type }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = client(ctx);
    let query = supabase
      .from("journal_entries")
      .select("id, title, content_text, context_type, context_title, is_encrypted, is_pinned, captured_at, updated_at")
      .eq("user_id", ctx.getUserId())
      .is("deleted_at", null)
      .order("captured_at", { ascending: false })
      .limit(limit ?? 20);
    if (context_type) query = query.eq("context_type", context_type);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const entries = (data ?? []).map((e) => ({
      ...e,
      title: e.is_encrypted ? "[encrypted]" : e.title,
      content_text: e.is_encrypted ? "[encrypted — unlock in the Temple app]" : e.content_text,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(entries, null, 2) }],
      structuredContent: { entries },
    };
  },
});