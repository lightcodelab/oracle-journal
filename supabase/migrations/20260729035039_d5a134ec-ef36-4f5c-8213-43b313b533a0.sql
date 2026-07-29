
-- Task 4C: Mirror Exchange topic-system RLS + privileges (no schema changes, no seeds).

-- === Baseline privilege reset ===
REVOKE ALL ON TABLE public.mirror_topic_catalog FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.mirror_member_topics FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.mirror_topic_notes   FROM PUBLIC, anon, authenticated;

-- === mirror_topic_catalog: privileges ===
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mirror_topic_catalog TO authenticated;

-- === mirror_topic_catalog: policies ===
CREATE POLICY mirror_topic_catalog_authenticated_select
  ON public.mirror_topic_catalog
  FOR SELECT
  TO authenticated
  USING (active = true);

CREATE POLICY mirror_topic_catalog_admin_manage
  ON public.mirror_topic_catalog
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- === mirror_member_topics: privileges ===
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mirror_member_topics TO authenticated;

-- === mirror_member_topics: policies (owner-scoped) ===
CREATE POLICY mirror_member_topics_owner_select
  ON public.mirror_member_topics
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY mirror_member_topics_owner_insert
  ON public.mirror_member_topics
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY mirror_member_topics_owner_update
  ON public.mirror_member_topics
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY mirror_member_topics_owner_delete
  ON public.mirror_member_topics
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- === mirror_topic_notes: privileges ===
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mirror_topic_notes TO authenticated;

-- === mirror_topic_notes: policies (owner-scoped) ===
CREATE POLICY mirror_topic_notes_owner_select
  ON public.mirror_topic_notes
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY mirror_topic_notes_owner_insert
  ON public.mirror_topic_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY mirror_topic_notes_owner_update
  ON public.mirror_topic_notes
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY mirror_topic_notes_owner_delete
  ON public.mirror_topic_notes
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- === Enum USAGE ===
GRANT USAGE ON TYPE public.mirror_topic_axis TO authenticated;
