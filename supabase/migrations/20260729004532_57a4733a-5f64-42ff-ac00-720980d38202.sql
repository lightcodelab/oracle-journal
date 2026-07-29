
GRANT USAGE ON TYPE public.mirror_session_format TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.mirror_session_preferences TO authenticated;

CREATE POLICY "mirror_session_preferences_owner_select"
  ON public.mirror_session_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "mirror_session_preferences_owner_insert"
  ON public.mirror_session_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "mirror_session_preferences_owner_update"
  ON public.mirror_session_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
