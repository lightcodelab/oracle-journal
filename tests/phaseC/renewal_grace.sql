-- Run via a read-only database query; every row must pass.
SELECT label, public.renewal_window_open(status, starts_at, ends_at, cancels, at_time) = expected AS passed
FROM (VALUES
 ('active renewal retains 24 hours', 'active', '2026-11-01Z'::timestamptz, '2026-11-20Z'::timestamptz, false, '2026-11-20 23:59:59Z'::timestamptz, true),
 ('active renewal expires at 24 hours', 'active', '2026-11-01Z'::timestamptz, '2026-11-20Z'::timestamptz, false, '2026-11-21Z'::timestamptz, false),
 ('failed renewal retains 24 hours', 'past_due', '2026-11-20Z'::timestamptz, '2026-12-20Z'::timestamptz, false, '2026-11-20 23:59:59Z'::timestamptz, true),
 ('failed renewal expires at 24 hours', 'past_due', '2026-11-20Z'::timestamptz, '2026-12-20Z'::timestamptz, false, '2026-11-21Z'::timestamptz, false),
 ('cancellation is not extended', 'active', '2026-11-01Z'::timestamptz, '2026-11-20Z'::timestamptz, true, '2026-11-20Z'::timestamptz, false)
) AS cases(label,status,starts_at,ends_at,cancels,at_time,expected);