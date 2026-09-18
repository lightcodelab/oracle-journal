-- Allow signed-in members to create their own personalised protocol from the AreekeerA guide
CREATE POLICY "Members can create protocols" ON public.areekeera_protocols
  FOR INSERT TO authenticated
  WITH CHECK (true);

GRANT INSERT ON public.areekeera_protocols TO authenticated;

-- Allow members to add steps to protocols they have saved to themselves
CREATE POLICY "Members can add steps to their saved protocols" ON public.areekeera_protocol_steps
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_areekeera_protocols up
      WHERE up.protocol_id = areekeera_protocol_steps.protocol_id
        AND up.user_id = auth.uid()
    )
  );

GRANT INSERT ON public.areekeera_protocol_steps TO authenticated;