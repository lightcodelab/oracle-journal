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
  name: "create_quick_capture",
  title: "Create quick capture journal entry",
  description: "Create a new unencrypted quick-capture entry in the user's Digital Journal.",
  inputSchema: {
    title: z.string().trim().min(1).max(200).describe("Short title for the entry."),
    content: z.string().trim().min(1).describe("Body of the entry (plain text)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ title, content }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = client(ctx);
    const { data, error } = await supabase
      .from("journal_entries")
      .insert({
        user_id: ctx.getUserId(),
        title,
        content_text: content,
        content_json: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: content }] }] },
        is_quick_capture: true,
        is_encrypted: false,
        context_type: "quick_capture",
      })
      .select("id, title, captured_at")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Saved entry ${data.id}` }],
      structuredContent: { entry: data },
    };
  },
});