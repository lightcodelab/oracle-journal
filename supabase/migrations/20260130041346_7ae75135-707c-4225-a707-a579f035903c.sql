-- Fix: Add INSERT policy to profiles table for defense in depth
-- This allows users to create their own profile if the handle_new_user() trigger fails

CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);