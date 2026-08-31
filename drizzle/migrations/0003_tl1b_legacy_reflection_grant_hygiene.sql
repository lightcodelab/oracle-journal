-- TL-1B hygiene: remove redundant anonymous DML on the legacy private
-- reflection tables and make owner WITH CHECK predicates explicit.
-- Owner behaviour and historical rows are unchanged.

REVOKE SELECT, INSERT, UPDATE, DELETE ON public.journal_entries FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.lesson_journal_entries FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.transformation_entries FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_journal_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transformation_entries TO authenticated;
GRANT ALL ON public.journal_entries TO service_role;
GRANT ALL ON public.lesson_journal_entries TO service_role;
GRANT ALL ON public.transformation_entries TO service_role;

DROP POLICY IF EXISTS "Users can update their own entries" ON public.journal_entries;
CREATE POLICY "Users can update their own entries"
  ON public.journal_entries FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own journal entries" ON public.lesson_journal_entries;
CREATE POLICY "Users can update their own journal entries"
  ON public.lesson_journal_entries FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users CRUD own entries" ON public.transformation_entries;
CREATE POLICY "Users CRUD own entries"
  ON public.transformation_entries FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
