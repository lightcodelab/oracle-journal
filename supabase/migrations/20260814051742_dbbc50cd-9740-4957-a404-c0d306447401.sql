DO $$
DECLARE
  allow uuid[] := ARRAY[
    '3e0c95e3-bc05-4d27-929a-5ee7f226c680','0cbc7e57-180f-4d03-a106-dfb08c6075f8',
    'cbf19090-98ce-483b-8fd9-80d5c5c715a1','4686138f-90d3-4717-af46-f8edf52aa3ce',
    'cf6bdd62-2b09-435e-a150-b37552bcd7b6','a3462e39-6403-42d6-a592-0a6e6f3eda92',
    '09066b16-6146-4892-bf24-5a92e3dab777','9977b3a7-7bb7-4fe4-9a75-1c2bb213b668',
    '00f33b1d-7bbe-4ae0-ab9d-2701873d7b9c','e2a98fa2-699e-4d0c-8f44-258ec348e92c'
  ]::uuid[];
  n int;
  deleted_grants int;
  deleted_users int;
BEGIN
  -- 1. all ten exist
  SELECT count(*) INTO n FROM auth.users WHERE id = ANY(allow);
  IF n <> 10 THEN RAISE EXCEPTION 'PREFLIGHT 1 FAILED: expected 10 allowlisted users, found %', n; END IF;

  -- 2. all ten are @fixture.test
  SELECT count(*) INTO n FROM auth.users WHERE id = ANY(allow) AND email LIKE '%@fixture.test';
  IF n <> 10 THEN RAISE EXCEPTION 'PREFLIGHT 2 FAILED: only % of 10 allowlisted users have @fixture.test emails', n; END IF;

  -- 3. no additional user matches the deletion predicate
  SELECT count(*) INTO n FROM auth.users WHERE email LIKE '%@fixture.test' AND NOT (id = ANY(allow));
  IF n <> 0 THEN RAISE EXCEPTION 'PREFLIGHT 3 FAILED: % extra @fixture.test users exist outside the allowlist', n; END IF;

  -- 4. exactly 32 phaseC-fixture grants, each orphaned or allowlisted
  SELECT count(*) INTO n FROM public.manual_full_access_grants WHERE notes = 'phaseC-fixture';
  IF n <> 32 THEN RAISE EXCEPTION 'PREFLIGHT 4a FAILED: expected 32 phaseC-fixture grants, found %', n; END IF;

  SELECT count(*) INTO n
  FROM public.manual_full_access_grants g
  WHERE g.notes = 'phaseC-fixture'
    AND NOT (
      g.user_id IS NULL
      OR g.user_id = ANY(allow)
      OR NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = g.user_id)
    );
  IF n <> 0 THEN RAISE EXCEPTION 'PREFLIGHT 4b FAILED: % phaseC-fixture grants reference live non-allowlisted users', n; END IF;

  -- 5. no member-authored content or non-fixture activity
  SELECT
    (SELECT count(*) FROM public.journal_entries WHERE user_id = ANY(allow))
  + (SELECT count(*) FROM public.saved_readings WHERE user_id = ANY(allow))
  + (SELECT count(*) FROM public.deck_purchases WHERE user_id = ANY(allow))
  + (SELECT count(*) FROM public.card_draws WHERE user_id = ANY(allow))
  + (SELECT count(*) FROM public.transformation_entries WHERE user_id = ANY(allow))
  + (SELECT count(*) FROM public.entitlements WHERE user_id = ANY(allow))
  + (SELECT count(*) FROM public.manual_access_grants WHERE user_id = ANY(allow))
  + (SELECT count(*) FROM public.arrival_interactions WHERE user_id = ANY(allow))
  INTO n;
  IF n <> 0 THEN RAISE EXCEPTION 'PREFLIGHT 5 FAILED: % non-fixture activity rows found for allowlisted users', n; END IF;

  -- deletion: grants first, then users
  WITH d AS (
    DELETE FROM public.manual_full_access_grants
    WHERE notes = 'phaseC-fixture'
    RETURNING 1
  ) SELECT count(*) INTO deleted_grants FROM d;

  WITH d AS (
    DELETE FROM auth.users
    WHERE id = ANY(allow) AND email LIKE '%@fixture.test'
    RETURNING 1
  ) SELECT count(*) INTO deleted_users FROM d;

  IF deleted_grants <> 32 THEN RAISE EXCEPTION 'POSTCHECK FAILED: deleted % grants, expected 32', deleted_grants; END IF;
  IF deleted_users <> 10 THEN RAISE EXCEPTION 'POSTCHECK FAILED: deleted % users, expected 10', deleted_users; END IF;

  SELECT count(*) INTO n FROM public.manual_full_access_grants WHERE notes = 'phaseC-fixture';
  IF n <> 0 THEN RAISE EXCEPTION 'POSTCHECK FAILED: % phaseC-fixture grants remain', n; END IF;

  SELECT count(*) INTO n FROM public.manual_full_access_grants WHERE notes <> 'phaseC-fixture';
  IF n <> 13 THEN RAISE EXCEPTION 'POSTCHECK FAILED: non-fixture grant count changed to %, expected 13', n; END IF;

  RAISE NOTICE 'phaseC cleanup OK: % grants, % users deleted', deleted_grants, deleted_users;
END $$;