ALTER TABLE public.affiliates
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS instagram_handle text,
  ADD COLUMN IF NOT EXISTS tiktok_handle text,
  ADD COLUMN IF NOT EXISTS facebook_handle text,
  ADD COLUMN IF NOT EXISTS other_social text,
  ADD COLUMN IF NOT EXISTS audience_characteristics text;