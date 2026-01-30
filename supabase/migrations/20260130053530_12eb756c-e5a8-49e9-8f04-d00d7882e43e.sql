-- Add session_type column to live_sessions table
ALTER TABLE public.live_sessions 
ADD COLUMN session_type text NOT NULL DEFAULT 'class' 
CHECK (session_type IN ('reading', 'class', 'workshop'));