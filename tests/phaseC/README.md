# Pass C automated verification suite

This directory contains the parameterized Playwright matrix and orchestration
scripts for the Pass C manual-full-access verification.

## Files

- `run.mjs` — orchestrator. Provisions fixtures via `phaseC-fixture-runner`,
  runs the Playwright matrix, produces `report.json` + screenshots, and tears
  down all `phaseC:` marked users.
- `matrix.spec.mjs` — parameterized 10 states × 4 routes × 3 viewports plus
  navigation / refresh / back-forward / nested-route / expiry / extension /
  revocation scenarios.
- `db-suite.sql` — expanded `_phaseC_run_tests()` (DST, boundaries, overlap,
  concurrency, audit immutability, precedence).
- `report.json` — machine-readable PASS/FAIL for every cell. Overwritten on
  each run.
- `screenshots/` — the required 33 responsive screenshots only.
- `FIXTURE_MARKERS.md` — records the last active `phaseC:<uuid>` run marker.

## Persistence contract

If a conversational turn ends mid-execution, `FIXTURE_MARKERS.md` records the
active marker so the next turn can call the runner with `{action:"teardown",
marker:"phaseC:<uuid>"}` — no orphaned rows remain.

## Running

```
ADMIN_EMAIL=... ADMIN_PASSWORD=... node tests/phaseC/run.mjs
```

Requires:
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from `.env`.
- Local Vite dev server on `http://localhost:8080`.
- `phaseC-fixture-runner` edge function deployed.
- An administrator account whose credentials are supplied via env.

All fixture rows created here are strictly disposable and tagged with a
`phaseC:` marker. Real customers, Stripe state and Founding records are
never touched.