GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.mirror_availability_windows
  TO authenticated;

CREATE POLICY "mirror_availability_windows_owner_select"
  ON public.mirror_availability_windows
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "mirror_availability_windows_owner_insert"
  ON public.mirror_availability_windows
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "mirror_availability_windows_owner_update"
  ON public.mirror_availability_windows
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "mirror_availability_windows_owner_delete"
  ON public.mirror_availability_windows
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());