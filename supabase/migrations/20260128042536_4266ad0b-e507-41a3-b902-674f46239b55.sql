-- Add admin DELETE policy for healing_conversations table
CREATE POLICY "Admins can delete conversations"
ON public.healing_conversations
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));