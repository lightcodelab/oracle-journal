-- Account deletion: match the existing Living Pattern tables so removing an
-- auth user removes her Pattern Records (and their Returns, via cascade).
ALTER TABLE public.pattern_records
  ADD CONSTRAINT pattern_records_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
