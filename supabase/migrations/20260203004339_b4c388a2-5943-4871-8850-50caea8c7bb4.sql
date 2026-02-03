-- Fix profiles table RLS policies to require authenticated role
-- First drop and recreate policies with proper role checks

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can insert their own profile" ON public.profiles;

-- Recreate with explicit authenticated role requirement
CREATE POLICY "Authenticated users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Authenticated users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Authenticated users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Fix user_encryption_keys table RLS policies to require authenticated role
-- First drop and recreate policies with proper role checks

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own encryption keys" ON public.user_encryption_keys;
DROP POLICY IF EXISTS "Users can insert their own encryption keys" ON public.user_encryption_keys;
DROP POLICY IF EXISTS "Users can update their own encryption keys" ON public.user_encryption_keys;

-- Recreate with explicit authenticated role requirement
CREATE POLICY "Users can view their own encryption keys"
ON public.user_encryption_keys
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own encryption keys"
ON public.user_encryption_keys
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own encryption keys"
ON public.user_encryption_keys
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);