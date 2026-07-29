ALTER TABLE public.mirror_session_preferences
  DROP CONSTRAINT mirror_session_preferences_durations_nonempty,
  DROP CONSTRAINT mirror_session_preferences_durations_max_length,
  ADD CONSTRAINT mirror_session_preferences_durations_cardinality
    CHECK (cardinality(durations) BETWEEN 1 AND 3),
  ADD CONSTRAINT mirror_session_preferences_durations_one_dimensional
    CHECK (array_ndims(durations) = 1),
  ADD CONSTRAINT mirror_session_preferences_durations_one_based
    CHECK (array_lower(durations, 1) = 1);