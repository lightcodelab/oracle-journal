-- The Remembrance Letters — member-facing year-long digital pilgrimage

CREATE TABLE public.remembrance_pilgrims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_month INTEGER NOT NULL DEFAULT 0,
  next_letter_due_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  paused_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT remembrance_pilgrims_month_check CHECK (current_month >= 0 AND current_month <= 12),
  CONSTRAINT remembrance_pilgrims_status_check CHECK (status IN ('active','paused','completed'))
);

CREATE TABLE public.remembrance_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  month_number INTEGER NOT NULL,
  theme TEXT NOT NULL,
  card_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
  card_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  content TEXT NOT NULL,
  practices JSONB NOT NULL DEFAULT '[]'::jsonb,
  model_used TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT remembrance_letters_month_check CHECK (month_number >= 1 AND month_number <= 12),
  CONSTRAINT remembrance_letters_unique_month UNIQUE (user_id, month_number)
);

CREATE TABLE public.remembrance_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id UUID NOT NULL REFERENCES public.remembrance_letters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  asking_to_be_seen TEXT NOT NULL DEFAULT '',
  invited_to_shift TEXT NOT NULL DEFAULT '',
  how_i_will_live_it TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT remembrance_reflections_unique_letter UNIQUE (letter_id)
);

CREATE TABLE public.remembrance_job_state (
  job_name TEXT PRIMARY KEY,
  locked_until TIMESTAMPTZ,
  paused_reason TEXT,
  paused_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  last_result JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_remembrance_letters_user ON public.remembrance_letters (user_id, month_number);
CREATE INDEX idx_remembrance_pilgrims_due ON public.remembrance_pilgrims (next_letter_due_at) WHERE status = 'active';

-- Grants: members read their own rows; writes to pilgrims/letters are server-side only.
GRANT SELECT ON public.remembrance_pilgrims TO authenticated;
GRANT ALL ON public.remembrance_pilgrims TO service_role;
GRANT SELECT ON public.remembrance_letters TO authenticated;
GRANT ALL ON public.remembrance_letters TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.remembrance_reflections TO authenticated;
GRANT ALL ON public.remembrance_reflections TO service_role;
GRANT ALL ON public.remembrance_job_state TO service_role;

ALTER TABLE public.remembrance_pilgrims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remembrance_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remembrance_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remembrance_job_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own pilgrimage"
  ON public.remembrance_pilgrims FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Members read own letters"
  ON public.remembrance_letters FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Members read own reflections"
  ON public.remembrance_reflections FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Members write own reflections"
  ON public.remembrance_reflections FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.remembrance_letters l
      WHERE l.id = letter_id AND l.user_id = auth.uid()
    )
  );

CREATE POLICY "Members update own reflections"
  ON public.remembrance_reflections FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_remembrance_pilgrims_updated
  BEFORE UPDATE ON public.remembrance_pilgrims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_remembrance_reflections_updated
  BEFORE UPDATE ON public.remembrance_reflections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Joining the pilgrimage: server-controlled, membership-gated, idempotent.
CREATE OR REPLACE FUNCTION public.remembrance_join()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.remembrance_pilgrims;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.has_full_temple_access(_uid) THEN
    RAISE EXCEPTION 'Membership required';
  END IF;

  SELECT * INTO _row FROM public.remembrance_pilgrims WHERE user_id = _uid;
  IF _row.id IS NOT NULL THEN
    RETURN to_jsonb(_row);
  END IF;

  INSERT INTO public.remembrance_pilgrims (user_id, current_month, next_letter_due_at, status)
  VALUES (_uid, 0, now(), 'active')
  RETURNING * INTO _row;

  RETURN to_jsonb(_row);
END;
$$;

REVOKE ALL ON FUNCTION public.remembrance_join() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remembrance_join() TO authenticated;

-- Saving a private reflection for one of the member's own letters.
CREATE OR REPLACE FUNCTION public.remembrance_save_reflection(
  _letter_id uuid,
  _asking_to_be_seen text,
  _invited_to_shift text,
  _how_i_will_live_it text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.remembrance_reflections;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.remembrance_letters
    WHERE id = _letter_id AND user_id = _uid
  ) THEN
    RAISE EXCEPTION 'Letter not found';
  END IF;

  INSERT INTO public.remembrance_reflections (
    letter_id, user_id, asking_to_be_seen, invited_to_shift, how_i_will_live_it
  )
  VALUES (
    _letter_id, _uid,
    left(coalesce(_asking_to_be_seen, ''), 8000),
    left(coalesce(_invited_to_shift, ''), 8000),
    left(coalesce(_how_i_will_live_it, ''), 8000)
  )
  ON CONFLICT (letter_id) DO UPDATE
    SET asking_to_be_seen = EXCLUDED.asking_to_be_seen,
        invited_to_shift = EXCLUDED.invited_to_shift,
        how_i_will_live_it = EXCLUDED.how_i_will_live_it,
        updated_at = now()
  RETURNING * INTO _row;

  RETURN to_jsonb(_row);
END;
$$;

REVOKE ALL ON FUNCTION public.remembrance_save_reflection(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remembrance_save_reflection(uuid, text, text, text) TO authenticated;