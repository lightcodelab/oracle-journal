-- Add audio_position column to lesson_journal_entries
ALTER TABLE public.lesson_journal_entries 
ADD COLUMN audio_position numeric DEFAULT 0;