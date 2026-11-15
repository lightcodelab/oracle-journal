// Which reminder (if any) a membership gets today. Dates are calendar days in Brisbane time.
// 7-day notice is sent by Stripe itself; the Temple sends 2 days before, day of, and every 3 days overdue.
export type ReminderKind = 'two_days' | 'today' | 'overdue'

const DAY = 86400000
export const brisbaneDay = (d: Date) => Math.floor((d.getTime() + 10 * 3600 * 1000) / DAY)

export function reminderFor(
  sub: { status: string; cancel_at_period_end: boolean | null; current_period_start: string | null; current_period_end: string | null },
  now: Date,
): { kind: ReminderKind; dueAt: string; daysOverdue?: number } | null {
  const today = brisbaneDay(now)
  if (sub.status === 'past_due' && sub.current_period_start) {
    const overdue = today - brisbaneDay(new Date(sub.current_period_start))
    if (overdue > 0 && overdue % 3 === 0) return { kind: 'overdue', dueAt: sub.current_period_start, daysOverdue: overdue }
    return null
  }
  if (sub.status === 'active' && !sub.cancel_at_period_end && sub.current_period_end) {
    const until = brisbaneDay(new Date(sub.current_period_end)) - today
    if (until === 2) return { kind: 'two_days', dueAt: sub.current_period_end }
    if (until === 0) return { kind: 'today', dueAt: sub.current_period_end }
  }
  return null
}
