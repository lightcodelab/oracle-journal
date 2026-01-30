-- User Encryption Keys table
-- Stores encrypted master keys for each user
CREATE TABLE public.user_encryption_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_master_key TEXT NOT NULL,
  key_salt TEXT NOT NULL,
  key_iv TEXT NOT NULL,
  recovery_key_hash TEXT,
  key_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_encryption_keys ENABLE ROW LEVEL SECURITY;

-- Users can only access their own encryption keys
CREATE POLICY "Users can view their own encryption keys"
  ON public.user_encryption_keys
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own encryption keys"
  ON public.user_encryption_keys
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own encryption keys"
  ON public.user_encryption_keys
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_encryption_keys_updated_at
  BEFORE UPDATE ON public.user_encryption_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add encrypted columns to journal_entries
ALTER TABLE public.journal_entries
ADD COLUMN IF NOT EXISTS content_json_encrypted JSONB,
ADD COLUMN IF NOT EXISTS content_text_encrypted JSONB,
ADD COLUMN IF NOT EXISTS title_encrypted JSONB,
ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false;

-- Add encrypted columns to healing_conversations
ALTER TABLE public.healing_conversations
ADD COLUMN IF NOT EXISTS messages_encrypted JSONB,
ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false;

-- Add encrypted columns to saved_readings
ALTER TABLE public.saved_readings
ADD COLUMN IF NOT EXISTS notes_encrypted JSONB,
ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false;

-- Add encrypted columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS full_name_encrypted JSONB,
ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false;

-- Index for faster lookups
CREATE INDEX idx_user_encryption_keys_user_id ON public.user_encryption_keys(user_id);