import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { z } from "https://esm.sh/zod@3.25.76";
import { ownsInvoice } from "./rules.ts";

const schema = z.object({
  invoiceId: z.string().regex(/^in_[a-zA-Z0-9]+$/).optional(),
  cursors: z.record(z.string().regex(/^in_[a-zA-Z0-9]+$/).nullable()).optional(),
}).strict();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  try {
    const auth = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");
    const { data: { user }, error } = await auth.auth.getUser(authorization.slice(7));
    if (error || !user) return json({ error: "Unauthorized" }, 401);
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "Invalid invoice request" }, 400);
    const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    // Ownership comes from server-maintained subscriptions, never email or caller-supplied customer IDs.
    const { data: subscriptions, error: dbError } = await db.from("subscriptions")
      .select("provider_subscription_id").eq("profile_id", user.id).eq("provider", "stripe").eq("stripe_environment", "live");
    if (dbError) throw new Error("Subscription lookup failed");
    const owned = [...new Set((subscriptions ?? []).map((s) => s.provider_subscription_id).filter((id): id is string => typeof id === "string" && id.startsWith("sub_")))];
    if (!owned.length && !parsed.data.invoiceId) return json({ invoices: [], cursors: null });
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", { apiVersion: "2023-10-16" });
    if (parsed.data.invoiceId) {
      const invoice = await stripe.invoices.retrieve(parsed.data.invoiceId);
      if (!ownsInvoice(invoice, owned)) return json({ error: "Invoice not available" }, 404);
      if (!invoice.invoice_pdf) return json({ error: "Invoice PDF is not ready yet" }, 404);
      const url = new URL(invoice.invoice_pdf);
      if (url.protocol !== "https:" || !url.hostname.endsWith(".stripe.com")) throw new Error("Invalid invoice download URL");
      const pdf = await fetch(url, { redirect: "error" });
      if (!pdf.ok || !pdf.headers.get("content-type")?.includes("application/pdf")) throw new Error("Invoice download failed");
      return new Response(pdf.body, { headers: { ...corsHeaders, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="invoice-${invoice.id}.pdf"`, "Cache-Control": "no-store" } });
    }
    const cursors: Record<string, string | null> = {};
    const batches = await Promise.all(owned.map(async (id) => {
      if (parsed.data.cursors?.[id] === null) { cursors[id] = null; return []; }
      const page = await stripe.invoices.list({ subscription: id, limit: 12, starting_after: parsed.data.cursors?.[id] ?? undefined });
      cursors[id] = page.has_more ? page.data.at(-1)?.id ?? null : null;
      return page.data.filter((i) => i.status !== "draft" && ownsInvoice(i, owned)).map((i) => ({
        id: i.id, number: i.number, created: i.created, amount: i.total, currency: i.currency,
        status: i.status, downloadable: Boolean(i.invoice_pdf),
      }));
    }));
    return json({ invoices: batches.flat().sort((a, b) => b.created - a.created), cursors: Object.values(cursors).some(Boolean) ? cursors : null });
  } catch {
    return json({ error: "Unable to load invoices. Please try again." }, 500);
  }
});