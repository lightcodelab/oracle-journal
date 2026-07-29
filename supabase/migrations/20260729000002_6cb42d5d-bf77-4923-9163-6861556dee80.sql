-- Mirror Exchange Stage 2 — Task 1A: energetic-capacity schema (schema only).
-- Interim access posture: RLS enabled, NO policies, NO GRANTs to
-- anon/authenticated. The dedicated RLS/grants task will follow separately.

-- 1. Enum
CREATE TYPE public.mirror_capacity_state AS ENUM (
  'available',
  'limited',
  'unavailable'
);

-- 2. Table — follows Stage 1 owner convention (see public.mirror_participations):
--    user_id is PK and the auth.users FK with ON DELETE CASCADE.
CREATE TABLE public.mirror_capacity (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state public.mirror_capacity_state NOT NULL,
  weekly_session_max INTEGER NOT NULL,
  current_openings INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mirror_capacity_weekly_session_max_range
    CHECK (weekly_session_max BETWEEN 1 AND 7),
  CONSTRAINT mirror_capacity_current_openings_nonneg
    CHECK (current_openings IS NULL OR current_openings >= 1),
  CONSTRAINT mirror_capacity_state_openings_invariant CHECK (
    (state = 'limited'    AND current_openings IS NOT NULL AND current_openings >= 1)
    OR (state = 'available'   AND current_openings IS NULL)
    OR (state = 'unavailable' AND current_openings IS NULL)
  )
);

-- Reuse the Stage 1 updated_at trigger function public.mirror_touch_updated_at().
CREATE TRIGGER mirror_capacity_touch
  BEFORE UPDATE ON public.mirror_capacity
  FOR EACH ROW EXECUTE FUNCTION public.mirror_touch_updated_at();

-- 3. Interim access posture: enable RLS with NO policies and NO grants
--    to anon/authenticated. Data API cannot read or write until the
--    dedicated RLS/grants task ships. service_role retains admin bypass.
ALTER TABLE public.mirror_capacity ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.mirror_capacity FROM PUBLIC;
REVOKE ALL ON public.mirror_capacity FROM anon;
REVOKE ALL ON public.mirror_capacity FROM authenticated;
GRANT ALL ON public.mirror_capacity TO service_role;