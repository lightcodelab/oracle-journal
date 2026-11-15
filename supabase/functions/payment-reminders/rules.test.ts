import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { reminderFor } from './rules.ts'

const now = new Date('2026-11-15T22:00:00Z') // 8am 16 Nov Brisbane
const active = (end: string) => ({ status: 'active', cancel_at_period_end: false, current_period_start: null, current_period_end: end })
const pastDue = (start: string) => ({ status: 'past_due', cancel_at_period_end: false, current_period_start: start, current_period_end: null })

Deno.test('2 days before', () => assertEquals(reminderFor(active('2026-11-18T03:00:00Z'), now)?.kind, 'two_days'))
Deno.test('day of', () => assertEquals(reminderFor(active('2026-11-16T05:00:00Z'), now)?.kind, 'today'))
Deno.test('no reminder 7 days before (Stripe sends it)', () => assertEquals(reminderFor(active('2026-11-23T03:00:00Z'), now), null))
Deno.test('no reminder if cancelling', () => assertEquals(reminderFor({ ...active('2026-11-18T03:00:00Z'), cancel_at_period_end: true }, now), null))
Deno.test('overdue every 3 days', () => {
  assertEquals(reminderFor(pastDue('2026-11-13T03:00:00Z'), now)?.daysOverdue, 3)
  assertEquals(reminderFor(pastDue('2026-11-10T03:00:00Z'), now)?.daysOverdue, 6)
  assertEquals(reminderFor(pastDue('2026-11-14T03:00:00Z'), now), null)
})
