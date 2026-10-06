CREATE TYPE public.ritual_rhythm AS ENUM ('daily','weekly','monthly');
CREATE TYPE public.ritual_step_kind AS ENUM ('deck','spread','resource');

CREATE TABLE public.rituals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  intention text,
  rhythm public.ritual_rhythm NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.rituals TO authenticated;
GRANT ALL ON public.rituals TO service_role;
ALTER TABLE public.rituals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage rituals" ON public.rituals FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.has_full_temple_access(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_full_temple_access(auth.uid()));
CREATE INDEX rituals_user_idx ON public.rituals(user_id);

CREATE TABLE public.ritual_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ritual_id uuid NOT NULL REFERENCES public.rituals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  position integer NOT NULL DEFAULT 0,
  kind public.ritual_step_kind NOT NULL,
  deck_id uuid,
  spread_type text,
  resource_source text CHECK (resource_source IN ('content','healing')),
  resource_id uuid,
  label text,
  journal_prompt text,
  client_request_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ritual_id, client_request_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ritual_steps TO authenticated;
GRANT ALL ON public.ritual_steps TO service_role;
ALTER TABLE public.ritual_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage ritual steps" ON public.ritual_steps FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.has_full_temple_access(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_full_temple_access(auth.uid())
    AND EXISTS (SELECT 1 FROM public.rituals r WHERE r.id = ritual_id AND r.user_id = auth.uid()));
CREATE INDEX ritual_steps_ritual_idx ON public.ritual_steps(ritual_id, position);

CREATE OR REPLACE FUNCTION public.ritual_step_validate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.kind = 'deck' THEN
    IF NEW.deck_id IS NULL OR NOT EXISTS (SELECT 1 FROM decks d WHERE d.id = NEW.deck_id AND d.is_published AND NOT COALESCE(d.is_starter,false)) THEN
      RAISE EXCEPTION 'This deck is not available for rituals';
    END IF;
    NEW.spread_type := NULL; NEW.resource_id := NULL; NEW.resource_source := NULL;
  ELSIF NEW.kind = 'spread' THEN
    IF NEW.spread_type IS NULL OR NEW.spread_type NOT IN ('past-present-future','daily-guidance','mind-body-spirit','situation-challenge-advice','shadow-and-light','inner-compass') THEN
      RAISE EXCEPTION 'This spread is not available for rituals';
    END IF;
    NEW.deck_id := NULL; NEW.resource_id := NULL; NEW.resource_source := NULL;
  ELSE
    IF NEW.resource_id IS NULL OR NEW.resource_source IS NULL THEN
      RAISE EXCEPTION 'A resource is required';
    END IF;
    IF TG_OP = 'INSERT' OR NEW.resource_id IS DISTINCT FROM OLD.resource_id THEN
      IF NEW.resource_source = 'content' AND NOT EXISTS (SELECT 1 FROM content_resources c WHERE c.id = NEW.resource_id AND c.status = 'published' AND NOT COALESCE(c.is_course,false)) THEN
        RAISE EXCEPTION 'This resource is not available for rituals';
      ELSIF NEW.resource_source = 'healing' AND NOT EXISTS (SELECT 1 FROM healing_resources h WHERE h.id = NEW.resource_id AND h.status = 'published') THEN
        RAISE EXCEPTION 'This resource is not available for rituals';
      END IF;
    END IF;
    NEW.deck_id := NULL; NEW.spread_type := NULL;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER ritual_step_validate BEFORE INSERT OR UPDATE ON public.ritual_steps
  FOR EACH ROW EXECUTE FUNCTION public.ritual_step_validate();

CREATE TABLE public.ritual_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ritual_id uuid NOT NULL REFERENCES public.rituals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','saved')),
  ritual_name text NOT NULL,
  ritual_rhythm public.ritual_rhythm NOT NULL,
  ritual_intention text,
  closing_reflection text,
  started_at timestamptz NOT NULL DEFAULT now(),
  saved_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ritual_visits_one_open ON public.ritual_visits(ritual_id) WHERE status = 'in_progress';
CREATE INDEX ritual_visits_user_idx ON public.ritual_visits(user_id, started_at DESC);
GRANT SELECT, UPDATE ON public.ritual_visits TO authenticated;
GRANT ALL ON public.ritual_visits TO service_role;
ALTER TABLE public.ritual_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read visits" ON public.ritual_visits FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND public.has_full_temple_access(auth.uid()));
CREATE POLICY "Owners update visits" ON public.ritual_visits FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.has_full_temple_access(auth.uid()))
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.ritual_visit_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES public.ritual_visits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  position integer NOT NULL,
  source_step_id uuid,
  kind public.ritual_step_kind NOT NULL,
  label text,
  journal_prompt text,
  deck_id uuid,
  spread_type text,
  resource_source text,
  resource_id uuid,
  note text,
  marked_done boolean NOT NULL DEFAULT false,
  saved_reading_id uuid,
  drawn_card_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (visit_id, position)
);
GRANT SELECT, UPDATE ON public.ritual_visit_steps TO authenticated;
GRANT ALL ON public.ritual_visit_steps TO service_role;
ALTER TABLE public.ritual_visit_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read visit steps" ON public.ritual_visit_steps FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND public.has_full_temple_access(auth.uid()));
CREATE POLICY "Owners update visit steps" ON public.ritual_visit_steps FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.has_full_temple_access(auth.uid()))
  WITH CHECK (auth.uid() = user_id);

-- Snapshot/link columns may only be set via RPCs: protect them on direct update.
CREATE OR REPLACE FUNCTION public.ritual_visit_step_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_setting('ritual.rpc', true) = 'on' THEN RETURN NEW; END IF;
  NEW.visit_id := OLD.visit_id; NEW.user_id := OLD.user_id; NEW.position := OLD.position;
  NEW.source_step_id := OLD.source_step_id; NEW.kind := OLD.kind; NEW.label := OLD.label;
  NEW.journal_prompt := OLD.journal_prompt; NEW.deck_id := OLD.deck_id; NEW.spread_type := OLD.spread_type;
  NEW.resource_source := OLD.resource_source; NEW.resource_id := OLD.resource_id;
  NEW.saved_reading_id := OLD.saved_reading_id; NEW.drawn_card_id := OLD.drawn_card_id;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER ritual_visit_step_guard BEFORE UPDATE ON public.ritual_visit_steps
  FOR EACH ROW EXECUTE FUNCTION public.ritual_visit_step_guard();

CREATE OR REPLACE FUNCTION public.ritual_visit_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.ritual_id := OLD.ritual_id; NEW.user_id := OLD.user_id; NEW.ritual_name := OLD.ritual_name;
  NEW.ritual_rhythm := OLD.ritual_rhythm; NEW.ritual_intention := OLD.ritual_intention; NEW.started_at := OLD.started_at;
  IF NEW.status = 'saved' AND OLD.status = 'in_progress' THEN NEW.saved_at := now(); END IF;
  IF OLD.status = 'saved' THEN NEW.status := 'saved'; NEW.saved_at := OLD.saved_at; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER ritual_visit_guard BEFORE UPDATE ON public.ritual_visits
  FOR EACH ROW EXECUTE FUNCTION public.ritual_visit_guard();

CREATE OR REPLACE FUNCTION public.start_or_resume_ritual_visit(_ritual_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _r rituals; _vid uuid;
BEGIN
  IF _uid IS NULL OR NOT has_full_temple_access(_uid) THEN RAISE EXCEPTION 'Membership required'; END IF;
  SELECT * INTO _r FROM rituals WHERE id = _ritual_id AND user_id = _uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ritual not found'; END IF;
  SELECT id INTO _vid FROM ritual_visits WHERE ritual_id = _ritual_id AND status = 'in_progress';
  IF _vid IS NOT NULL THEN RETURN _vid; END IF;
  IF NOT EXISTS (SELECT 1 FROM ritual_steps WHERE ritual_id = _ritual_id) THEN RAISE EXCEPTION 'Add at least one step first'; END IF;
  BEGIN
    INSERT INTO ritual_visits (ritual_id, user_id, ritual_name, ritual_rhythm, ritual_intention)
    VALUES (_r.id, _uid, _r.name, _r.rhythm, _r.intention) RETURNING id INTO _vid;
  EXCEPTION WHEN unique_violation THEN
    SELECT id INTO _vid FROM ritual_visits WHERE ritual_id = _ritual_id AND status = 'in_progress';
    RETURN _vid;
  END;
  INSERT INTO ritual_visit_steps (visit_id, user_id, position, source_step_id, kind, label, journal_prompt, deck_id, spread_type, resource_source, resource_id)
  SELECT _vid, _uid, row_number() OVER (ORDER BY position, created_at) - 1, id, kind, label, journal_prompt, deck_id, spread_type, resource_source, resource_id
  FROM ritual_steps WHERE ritual_id = _ritual_id;
  RETURN _vid;
END $$;

CREATE OR REPLACE FUNCTION public.attach_ritual_visit_experience(_visit_step_id uuid, _saved_reading_id uuid, _drawn_card_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _s ritual_visit_steps;
BEGIN
  SELECT * INTO _s FROM ritual_visit_steps WHERE id = _visit_step_id AND user_id = _uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Step not found'; END IF;
  IF _saved_reading_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM saved_readings WHERE id = _saved_reading_id AND user_id = _uid) THEN
    RAISE EXCEPTION 'Reading not found';
  END IF;
  PERFORM set_config('ritual.rpc','on', true);
  UPDATE ritual_visit_steps SET
    saved_reading_id = COALESCE(saved_reading_id, _saved_reading_id),
    drawn_card_id = COALESCE(drawn_card_id, _drawn_card_id),
    updated_at = now()
  WHERE id = _visit_step_id RETURNING * INTO _s;
  PERFORM set_config('ritual.rpc','off', true);
  RETURN jsonb_build_object('saved_reading_id', _s.saved_reading_id, 'drawn_card_id', _s.drawn_card_id);
END $$;

REVOKE ALL ON FUNCTION public.start_or_resume_ritual_visit(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.attach_ritual_visit_experience(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_or_resume_ritual_visit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.attach_ritual_visit_experience(uuid, uuid, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.ritual_step_validate() FROM PUBLIC, anon, authenticated;