-- Mirror Exchange Stage 2 — Task 1B: owner-only RLS + minimum authenticated privileges
-- for public.mirror_capacity. Schema from Task 1A is untouched.

-- Table privileges: authenticated may only SELECT/INSERT/UPDATE.
-- No DELETE, TRUNCATE, REFERENCES, or TRIGGER. No anon/PUBLIC access.
GRANT SELECT, INSERT, UPDATE ON public.mirror_capacity TO authenticated;

-- Owner SELECT: read only own row.
CREATE POLICY "mirror_capacity_owner_select"
  ON public.mirror_capacity
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Owner INSERT: may only insert a row whose user_id is themselves.
CREATE POLICY "mirror_capacity_owner_insert"
  ON public.mirror_capacity
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Owner UPDATE: may update only own row, and may not transfer ownership.
CREATE POLICY "mirror_capacity_owner_update"
  ON public.mirror_capacity
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());