# Oracle Journal / Manual-Access Policy Correction — resumable plan

Authoritative policy (per user, this turn): there is now **one** access level for
protected Temple content — full access. A user has full access iff any of:

1. `has_role(auth.uid(),'admin')`
2. `is_active_member(auth.uid())`
3. an unrevoked `public.manual_full_access_grants` row where
   `starts_at <= now() < expires_at`

No Door-scoped selection. No `subscription_status` shortcuts in page code.

## Bounded work already done this turn

- Dropped permissive `Anyone can read active code lookup` policy on
  `public.affiliates` and revoked anon privileges. Security finding
  `affiliates_active_code_lookup_exposure` marked fixed. Referral flow still
  works via `public.track_affiliate_click(_code)`.
- Refreshed `@security-memory` to codify the one-access-level rule and the
  affiliates constraint.

## Remaining work — execute in subsequent bounded passes

### Pass O1 — audit (read-only)

- Enumerate every route/component that currently gates on `subscription_status`,
  `is_active_member`, `entitlements`, `tier_bucket_access`, or
  `manual_access_grants` (legacy). Expected suspects: `DoorOfDevotion`,
  `DoorOfCommunion`, `DoorOfRemembrance` (Temple), lesson/resource/protocol
  pages, `/decks`, `/tools`, `/journal`, `/playlists`, `/live-sessions`,
  `/replays`, `/my-*`, admin-only routes (untouched).
- Confirm every canonical gate reads `useMemberState().hasFullTempleAccess`.
- Confirm `get_member_state()` and `has_active_manual_full_access()` enforce
  self-or-admin (reject queries about other users).

### Pass O2 — code corrections

- Replace any residual non-canonical gates with `hasFullTempleAccess`.
- Fix `ScheduledAccess` runtime crash when `startsAt` is null / mid-render
  (already defensive per component, verify with a null fixture).
- Redeploy `create-manual-user` edge function so probe returns the current
  schema-validation contract.
- Decide on `use_new_entitlement_model` flag: either wire it to gate real
  behaviour or remove it. Current value: OFF.

### Pass O3 — verification

- Rerun `public._phaseC_run_tests()` and `_phase1_run_access_tests()` — expect
  67/67 or better.
- Extend SQL suite with: Australia/Melbourne DST boundary, calendar-month
  arithmetic, scheduled → active transition at exact `starts_at`,
  active → expired transition at exact `expires_at`, revoked mid-window.
- Deploy a temporary admin-guarded `phaseC-fixture-runner`, mint 10 disposable
  users covering: anonymous, member_active, admin, manual_active,
  manual_scheduled, manual_expired, manual_revoked_only, grandfathered
  (legacy converted), uncertain_provenance, entitlement_failure.
- Run the 10 × 4-route × 3-viewport (1440/834/390) rendered browser matrix on
  `/temple`, `/devotion`, `/communion`, `/remembrance`.
- Tear down all synthetic users and the runner. Confirm no residual rows.

### Guardrails

- Do NOT modify Stripe, billing, checkout, webhooks, prices, Founding dates,
  grace rules, or real customer access.
- Do NOT delete legacy `manual_access_grants` history — it stays as audit data.
- Keep `use_new_entitlement_model = false` unless the flag is explicitly
  reworked.
- Do NOT claim production verification without authorised read-only prod
  access.

## Resumption checklist for next turn

1. Read this file.
2. Read `src/hooks/useMemberState.ts`, `src/pages/Temple.tsx`,
   `src/pages/DoorOfDevotion.tsx`, `src/pages/DoorOfCommunion.tsx`.
3. Grep for `subscription_status`, `is_active_member`, `entitlements`,
   `tier_bucket_access` in `src/`.
4. Start Pass O1 (audit only, no writes).