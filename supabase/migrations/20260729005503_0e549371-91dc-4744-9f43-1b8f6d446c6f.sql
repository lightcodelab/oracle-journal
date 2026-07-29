
-- Mirror Exchange Stage 2 — Task 3A
-- Recurring weekly availability schema and database integrity only.

CREATE TABLE public.mirror_availability_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weekday smallint NOT NULL,
  local_start time(0) without time zone NOT NULL,
  local_end   time(0) without time zone NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mirror_availability_windows_weekday_range
    CHECK (weekday BETWEEN 1 AND 7),
  CONSTRAINT mirror_availability_windows_start_boundary
    CHECK (
      EXTRACT(SECOND FROM local_start) = 0
      AND EXTRACT(MINUTE FROM local_start) IN (0, 30)
    ),
  CONSTRAINT mirror_availability_windows_end_boundary
    CHECK (
      EXTRACT(SECOND FROM local_end) = 0
      AND EXTRACT(MINUTE FROM local_end) IN (0, 30)
    ),
  CONSTRAINT mirror_availability_windows_start_before_end
    CHECK (local_start < local_end)
);

COMMENT ON TABLE public.mirror_availability_windows IS
  'Recurring weekly Mirror Exchange availability windows. Timezone is inherited from community_profiles.timezone and is intentionally not stored here. Windows cannot cross midnight; represent overnight availability as two rows on adjacent weekdays.';

CREATE INDEX mirror_availability_windows_user_weekday_idx
  ON public.mirror_availability_windows (user_id, weekday);

-- Integrity trigger function: serialises concurrent writes for the same
-- member and enforces the 14-window cap and same-weekday overlap rule.
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
BEGIN
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

  -- 14-window cap per member (exclude the row itself on UPDATE).
  SELECT count(*) INTO v_count
  FROM public.mirror_availability_windows w
  WHERE w.user_id = NEW.user_id
    AND (TG_OP = 'INSERT' OR w.id <> NEW.id);

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
    AND (TG_OP = 'INSERT' OR w.id <> NEW.id)
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

-- Lock down execution: only service_role and the table owner may execute directly.
REVOKE ALL ON FUNCTION public.mirror_availability_windows_enforce_integrity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mirror_availability_windows_enforce_integrity() FROM anon;
REVOKE ALL ON FUNCTION public.mirror_availability_windows_enforce_integrity() FROM authenticated;

CREATE TRIGGER mirror_availability_windows_enforce_integrity_ins
BEFORE INSERT ON public.mirror_availability_windows
FOR EACH ROW EXECUTE FUNCTION public.mirror_availability_windows_enforce_integrity();

CREATE TRIGGER mirror_availability_windows_enforce_integrity_upd
BEFORE UPDATE ON public.mirror_availability_windows
FOR EACH ROW EXECUTE FUNCTION public.mirror_availability_windows_enforce_integrity();

-- updated_at trigger (reuses existing shared function).
CREATE TRIGGER mirror_availability_windows_touch_updated_at
BEFORE UPDATE ON public.mirror_availability_windows
FOR EACH ROW EXECUTE FUNCTION public.mirror_touch_updated_at();

-- Interim security posture: RLS enabled, zero policies, no member grants.
ALTER TABLE public.mirror_availability_windows ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.mirror_availability_windows FROM PUBLIC;
REVOKE ALL ON TABLE public.mirror_availability_windows FROM anon;
REVOKE ALL ON TABLE public.mirror_availability_windows FROM authenticated;
GRANT ALL ON TABLE public.mirror_availability_windows TO service_role;
