import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'
import { reminderFor } from './rules.ts'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)
  const expected = Deno.env.get('ADMIN_NOTIFY_SECRET')
  if (!expected || req.headers.get('x-admin-notify-secret') !== expected) return json({ error: 'forbidden' }, 403)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: subs, error } = await admin
    .from('subscriptions')
    .select('id, profile_id, status, cancel_at_period_end, current_period_start, current_period_end, stripe_environment')
    .in('status', ['active', 'past_due'])
    .eq('provider', 'stripe')
  if (error) return json({ error: error.message }, 500)

  const now = new Date()
  const results: Array<Record<string, unknown>> = []
  for (const sub of subs ?? []) {
    if (sub.stripe_environment && sub.stripe_environment !== 'live') continue
    const r = reminderFor(sub, now)
    if (!r || !sub.profile_id) continue
    const { data: u } = await admin.auth.admin.getUserById(sub.profile_id)
    const email = u?.user?.email
    if (!email) continue
    const { data: profile } = await admin.from('profiles').select('full_name').eq('id', sub.profile_id).maybeSingle()
    const name = typeof profile?.full_name === 'string' ? profile.full_name.trim().split(/\s+/)[0] || undefined : undefined
    const dueDate = new Date(r.dueAt).toLocaleDateString('en-AU', { timeZone: 'Australia/Brisbane', day: 'numeric', month: 'long', year: 'numeric' })
    try {
      const res = await sendTemplateEmail('payment-reminder', email, {
        templateData: { name, kind: r.kind, dueDate, daysOverdue: r.daysOverdue },
        idempotencyKey: `payment-reminder-${sub.id}-${r.kind}-${r.dueAt.slice(0, 10)}-${r.daysOverdue ?? 0}`,
      })
      results.push({ sub: sub.id, kind: r.kind, sent: res.sent })
    } catch (e) {
      console.error('payment reminder failed', sub.id, e)
      results.push({ sub: sub.id, kind: r.kind, error: String(e) })
    }
  }
  return json({ ok: true, results })
})
