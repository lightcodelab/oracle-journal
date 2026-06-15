ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS form_questions jsonb;

ALTER TABLE public.lesson_journal_entries
  ADD COLUMN IF NOT EXISTS form_responses jsonb;