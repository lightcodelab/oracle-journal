import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

// Daily launch summary for the temple keepers. Triggered by a scheduled job.

const SITE = 'https://inside.thetempleofsustainment.com'
const DASHBOARD_URL = `${SITE}/admin/launch`
const FALLBACK_RECIPIENTS = ['support@lightcodelab.com', 'julie@julielewin.com']

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const expected = Deno.env.get('ADMIN_NOTIFY_SECRET')
  if (!expected || req.headers.get('x-admin-notify-secret') !== expected) {
    return json({ error: 'forbidden' }, 403)
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Yesterday in Brisbane time (UTC+10).
  const nowBrisbane = new Date(Date.now() + 10 * 3600 * 1000)
  const dayStartBrisbane = new Date(Date.UTC(
    nowBrisbane.getUTCFullYear(),
    nowBrisbane.getUTCMonth(),
    nowBrisbane.getUTCDate(),
  ))
  const to = new Date(dayStartBrisbane.getTime() - 10 * 3600 * 1000)
  const from = new Date(to.getTime() - 86400000)

  const { data, error } = await admin.rpc('admin_launch_stats', {
    _from: from.toISOString(),
    _to: to.toISOString(),
  })
  if (error) {
    console.error('admin_launch_stats failed', error)
    return json({ error: error.message }, 500)
  }

  const stats = data as any
  const funnel = stats?.funnel ?? {}
  const ctaClicks =
    (funnel['hero_enter_temple_clicked'] ?? 0) +
    (funnel['midpage_enter_temple_clicked'] ?? 0) +
    (funnel['final_enter_temple_clicked'] ?? 0)
  const currency = (stats?.payments?.currency ?? 'AUD').toUpperCase()
  const revenueCents = stats?.payments?.revenue_cents ?? 0
  const sources: { source: string; views: number }[] = stats?.sources ?? []

  const dayLabel = from.toLocaleDateString('en-AU', {
    timeZone: 'Australia/Brisbane',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const templateData = {
    dayLabel,
    visits: funnel['sales_page_view'] ?? 0,
    uniqueVisitors: stats?.unique_visitors ?? 0,
    ctaClicks,
    checkoutsStarted: funnel['membership_checkout_started'] ?? 0,
    signups: stats?.signups ?? 0,
    payments: stats?.payments?.count ?? 0,
    revenue: `$${(revenueCents / 100).toFixed(2)} ${currency}`,
    activeMemberships: stats?.paying_members ?? 0,
    topSources:
      sources.slice(0, 5).map((s) => `${s.source} (${s.views})`).join(', ') || undefined,
    dashboardUrl: DASHBOARD_URL,
  }

  const { data: settings } = await admin
    .from('app_settings')
    .select('value')
    .eq('key', 'admin_alert_emails')
    .maybeSingle()
  const configured = (settings as any)?.value
  const recipients = Array.isArray(configured)
    ? configured.filter((v: unknown): v is string => typeof v === 'string')
    : []
  const list = recipients.length > 0 ? recipients : FALLBACK_RECIPIENTS

  const results: Record<string, string> = {}
  for (const recipient of list) {
    try {
      const result = await sendTemplateEmail('admin-daily-summary', recipient, {
        templateData,
        idempotencyKey: `admin-daily-summary-${from.toISOString().slice(0, 10)}-${recipient}`,
      })
      results[recipient] = result.sent ? 'sent' : result.reason
    } catch (err) {
      console.error('daily summary failed', recipient, err)
      results[recipient] = 'failed'
    }
  }

  return json({ ok: true, day: dayLabel, results })
})
