-- Mirror Exchange Stage 2 — Task 3A.1
-- Correct two Task 3A defects:
--   1. time(0) silently rounds fractional-second input before boundary
--      checks evaluate, so nonzero fractional seconds cannot be rejected.
--   2. The integrity function excluded NEW.id, which does not identify the
--      row being updated when its primary key changes; it must exclude
--      OLD.id.

-- 1. Preserve time precision on both columns.
ALTER TABLE public.mirror_availability_windows
  ALTER COLUMN local_start TYPE time without time zone
    USING local_start::time without time zone,
  ALTER COLUMN local_end TYPE time without time zone
    USING local_end::time without time zone;

-- 2. Replace the integrity function; exclude OLD.id on UPDATE via a
--    dedicated nullable variable. All other logic is preserved verbatim.
CREATE OR REPLACE FUNCTION public.mirror_availability_windows_enforce_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_lock_key_new bigint;
  v_lock_key_old bigint;
  v_lock_first  bigint;
  v_lock_second bigint;
  v_count       integer;
  v_conflict    integer;
  v_exclude_id  uuid;
BEGIN
  -- On UPDATE, the row currently stored in the table has OLD.id, which
  -- may differ from NEW.id if the primary key is being changed. Exclude
  -- the stored row using its stored identity.
  IF TG_OP = 'UPDATE' THEN
    v_exclude_id := OLD.id;
  END IF;

  -- Derive deterministic advisory-lock keys per owner. Using hashtextextended
  -- with a namespaced input avoids collisions with unrelated advisory locks.
  v_lock_key_new := pg_catalog.hashtextextended(
    'mirror_availability_windows:' || NEW.user_id::text, 0
  );

  IF TG_OP = 'UPDATE' AND OLD.user_id IS DISTINCT FROM NEW.user_id THEN
    v_lock_key_old := pg_catalog.hashtextextended(
      'mirror_availability_windows:' || OLD.user_id::text, 0
    );
    -- Acquire both locks in a deterministic order to prevent deadlocks
    -- between two concurrent transactions that swap owners.
    IF v_lock_key_old < v_lock_key_new THEN
      v_lock_first  := v_lock_key_old;
      v_lock_second := v_lock_key_new;
    ELSE
      v_lock_first  := v_lock_key_new;
      v_lock_second := v_lock_key_old;
    END IF;
    PERFORM pg_catalog.pg_advisory_xact_lock(v_lock_first);
    IF v_lock_second <> v_lock_first THEN
      PERFORM pg_catalog.pg_advisory_xact_lock(v_lock_second);
    END IF;
  ELSE
    PERFORM pg_catalog.pg_advisory_xact_lock(v_lock_key_new);
  END IF;

  -- 14-window cap per member (exclude the stored row on UPDATE via OLD.id).
  SELECT count(*) INTO v_count
  FROM public.mirror_availability_windows w
  WHERE w.user_id = NEW.user_id
    AND (v_exclude_id IS NULL OR w.id <> v_exclude_id);

  IF v_count + 1 > 14 THEN
    RAISE EXCEPTION 'mirror_availability_windows: member % already has the maximum of 14 windows', NEW.user_id
      USING ERRCODE = 'check_violation';
  END IF;

  -- Same-member, same-weekday overlap. Half-open interval semantics:
  -- existing.local_start < new.local_end AND new.local_start < existing.local_end.
  -- Adjacent windows (existing.local_end = new.local_start, or vice versa)
  -- do not satisfy strict inequalities and are therefore permitted.
  SELECT count(*) INTO v_conflict
  FROM public.mirror_availability_windows w
  WHERE w.user_id = NEW.user_id
    AND w.weekday = NEW.weekday
    AND (v_exclude_id IS NULL OR w.id <> v_exclude_id)
    AND w.local_start < NEW.local_end
    AND NEW.local_start < w.local_end;

  IF v_conflict > 0 THEN
    RAISE EXCEPTION 'mirror_availability_windows: window overlaps an existing window for member % on weekday %', NEW.user_id, NEW.weekday
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.mirror_availability_windows_enforce_integrity() IS
  'Serialises concurrent writes for the same member via a transaction-scoped advisory lock, then enforces the 14-window cap and same-weekday overlap rule. Used exclusively by mirror_availability_windows integrity triggers.';

-- Re-assert direct-execution revocations (idempotent).
REVOKE ALL ON FUNCTION public.mirror_availability_windows_enforce_integrity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mirror_availability_windows_enforce_integrity() FROM anon;
REVOKE ALL ON FUNCTION public.mirror_availability_windows_enforce_integrity() FROM authenticated;