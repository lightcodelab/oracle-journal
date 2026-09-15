import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3.23.8'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

// Internal notifier: alerts the temple keepers when a new account is created
// or a membership payment succeeds. Called by a database trigger (sign-ups)
// and by the Stripe webhook (payments). Never called from the browser.

const SITE = 'https://inside.thetempleofsustainment.com'
const DASHBOARD_URL = `${SITE}/admin/launch`

const BodySchema = z.object({
  kind: z.enum(['signup', 'payment']),
  user_id: z.string().uuid().optional(),
  email: z.string().email().optional(),
  name: z.string().max(200).optional(),
  amount_cents: z.number().int().nonnegative().optional(),
  currency: z.string().max(10).optional(),
  plan_code: z.string().max(60).optional(),
  cadence: z.string().max(20).optional(),
  event_ref: z.string().max(120).optional(),
})

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const FALLBACK_RECIPIENTS = ['support@lightcodelab.com', 'julie@julielewin.com']

async function adminRecipients(admin: ReturnType<typeof createClient>): Promise<string[]> {
  const { data } = await admin
    .from('app_settings')
    .select('value')
    .eq('key', 'admin_alert_emails')
    .maybeSingle()
  const value = (data as { value?: unknown } | null)?.value
  const list = Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
  return list.length > 0 ? list : FALLBACK_RECIPIENTS
}

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const expected = Deno.env.get('ADMIN_NOTIFY_SECRET')
  if (!expected || req.headers.get('x-admin-notify-secret') !== expected) {
    return json({ error: 'forbidden' }, 403)
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400)
  const body = parsed.data

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  let memberEmail = body.email ?? null
  let memberName = body.name ?? null
  let referredBy: string | null = null

  if (body.user_id) {
    const { data: profile } = await admin
      .from('profiles')
      .select('email, full_name')
      .eq('id', body.user_id)
      .maybeSingle()
    memberEmail = memberEmail ?? (profile as any)?.email ?? null
    memberName = memberName ?? (profile as any)?.full_name ?? null

    const { data: referral } = await admin
      .from('affiliate_referrals')
      .select('affiliates(display_name, referral_code)')
      .eq('referred_user_id', body.user_id)
      .maybeSingle()
    const aff = (referral as any)?.affiliates
    if (aff) referredBy = aff.display_name || aff.referral_code || null
  }

  const recipients = await adminRecipients(admin)
  const template = body.kind === 'signup' ? 'admin-new-signup' : 'admin-new-payment'
  const ref = body.event_ref ?? body.user_id ?? crypto.randomUUID()

  const templateData =
    body.kind === 'signup'
      ? {
          memberName,
          memberEmail,
          joinedAt: new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' }),
          referredBy,
          dashboardUrl: DASHBOARD_URL,
        }
      : {
          memberName,
          memberEmail,
          amount:
            typeof body.amount_cents === 'number'
              ? `$${(body.amount_cents / 100).toFixed(2)} ${(body.currency ?? 'AUD').toUpperCase()}`
              : undefined,
          plan: body.plan_code,
          cadence: body.cadence,
          referredBy,
          dashboardUrl: DASHBOARD_URL,
        }

  const results: Record<string, string> = {}
  for (const recipient of recipients) {
    try {
      const result = await sendTemplateEmail(template, recipient, {
        templateData,
        idempotencyKey: `${template}-${ref}-${recipient}`,
      })
      results[recipient] = result.sent ? 'sent' : result.reason
    } catch (err) {
      console.error('admin notification failed', recipient, err)
      results[recipient] = 'failed'
    }
  }

  return json({ ok: true, results })
})
