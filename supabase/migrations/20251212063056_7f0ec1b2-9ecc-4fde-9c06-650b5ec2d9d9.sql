-- Add DELETE policy for users to delete their own starter cards
CREATE POLICY "Users can delete their own starter cards"
ON public.user_starter_deck_cards
FOR DELETE
USING (auth.uid() = user_id);

-- Add DELETE policy for admins to delete any starter cards
CREATE POLICY "Admins can delete any starter cards"
ON public.user_starter_deck_cards
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));