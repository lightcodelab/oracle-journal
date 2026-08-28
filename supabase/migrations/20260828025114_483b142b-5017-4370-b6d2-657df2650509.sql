ALTER TABLE public.living_experiments DROP CONSTRAINT IF EXISTS living_experiments_guide_chk;
ALTER TABLE public.living_experiments ADD CONSTRAINT living_experiments_guide_chk CHECK (
  (guide_key IS NULL AND own_experiment IS NOT NULL)
  OR (guide_key = 'own' AND own_experiment IS NOT NULL)
  OR (guide_key IN (
        'make_it_smaller',
        'meet_one_basic_need',
        'ask_for_space',
        'gather_one_fact',
        'borrow_steadiness',
        'smaller_boundary',
        'hold_second_possibility'
      ))
);