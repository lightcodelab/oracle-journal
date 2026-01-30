-- Add column to track users who must change their password on first login
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false;

-- Update existing profiles to not require password change
UPDATE public.profiles SET must_change_password = false WHERE must_change_password IS NULL;