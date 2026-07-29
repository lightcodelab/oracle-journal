-- Mirror Exchange Stage 2 — Task 2A: session-preferences schema only.
-- No RLS policies, no authenticated/anon grants. Task 1A/1B objects are untouched.

-- Enum: allowed session formats. In-person openness is a separate preference, not a format.
CREATE TYPE public.mirror_session_format AS ENUM ('audio', 'video', 'either');

-- Lock down the enum: only postgres/service_role may reference it until Task 2B opens it up.
REVOKE ALL ON TYPE public.mirror_session_format FROM PUBLIC;
GRANT USAGE ON TYPE public.mirror_session_format TO service_role;

CREATE TABLE public.mirror_session_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  durations integer[] NOT NULL,
  session_format public.mirror_session_format NOT NULL,
  open_to_in_person boolean,
  advance_notice_hours integer NOT NULL,
  perspective_preference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- durations: non-empty, only 30/45/60, no NULL elements, no duplicates,
  -- and stored in strict ascending order so duplicate/ordering rules are enforceable
  -- purely at the database layer.
  CONSTRAINT mirror_session_preferences_durations_nonempty
    CHECK (array_length(durations, 1) >= 1),
  CONSTRAINT mirror_session_preferences_durations_allowed_values
    CHECK (durations <@ ARRAY[30, 45, 60]),
  CONSTRAINT mirror_session_preferences_durations_no_nulls
    CHECK (array_position(durations, NULL) IS NULL),
  -- Because durations is constrained to a subset of {30,45,60}, its length is at most 3.
  -- Requiring strict ascending order across those (up to) three slots guarantees no duplicates
  -- and gives a single canonical ordering, without needing a subquery in the CHECK.
  CONSTRAINT mirror_session_preferences_durations_max_length
    CHECK (array_length(durations, 1) <= 3),
  CONSTRAINT mirror_session_preferences_durations_strict_ascending
    CHECK (
      (array_length(durations, 1) < 2 OR durations[1] < durations[2])
      AND (array_length(durations, 1) < 3 OR durations[2] < durations[3])
    ),

  CONSTRAINT mirror_session_preferences_advance_notice_allowed
    CHECK (advance_notice_hours IN (24, 48, 72)),

  CONSTRAINT mirror_session_preferences_perspective_length
    CHECK (perspective_preference IS NULL OR char_length(perspective_preference) <= 400)
);

COMMENT ON TABLE public.mirror_session_preferences IS
  'Mirror Exchange Stage 2 — per-member session preferences (format, duration, notice, in-person openness, perspective note). Separate from eligibility, participation, capacity, availability, topics, and computed completion.';
COMMENT ON COLUMN public.mirror_session_preferences.open_to_in_person IS
  'NULL means "not answered yet". Explicit true or false is required before computed Stage 2 completion can pass. NULL is not equivalent to false.';
COMMENT ON COLUMN public.mirror_session_preferences.durations IS
  'Set of durations (minutes) the member is willing to hold. At least one of 30/45/60, no duplicates, stored ascending. Not a ranking.';

-- Reuse the existing Stage 1/2 updated_at trigger helper.
CREATE TRIGGER mirror_session_preferences_touch_updated_at
  BEFORE UPDATE ON public.mirror_session_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.mirror_touch_updated_at();

-- Interim security posture: RLS on, no policies, no anon/authenticated grants.
-- service_role retains full access per project convention.
ALTER TABLE public.mirror_session_preferences ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.mirror_session_preferences FROM PUBLIC;
REVOKE ALL ON TABLE public.mirror_session_preferences FROM anon;
REVOKE ALL ON TABLE public.mirror_session_preferences FROM authenticated;
GRANT ALL ON TABLE public.mirror_session_preferences TO service_role;