-- Add image_url column to cards table
ALTER TABLE public.cards
ADD COLUMN image_url TEXT;

-- Update cards 1-20 with their image URLs
UPDATE public.cards
SET image_url = '/src/assets/cards/card-1.png'
WHERE name = 'The Empty Crown' AND deck_id = '85dddf8a-cd5e-4cdd-8ccc-af034052e484';

UPDATE public.cards
SET image_url = '/src/assets/cards/card-2.png'
WHERE name = 'The Golden Scales' AND deck_id = '85dddf8a-cd5e-4cdd-8ccc-af034052e484';

UPDATE public.cards
SET image_url = '/src/assets/cards/card-3.png'
WHERE name = 'The Silent Judge' AND deck_id = '85dddf8a-cd5e-4cdd-8ccc-af034052e484';

UPDATE public.cards
SET image_url = '/src/assets/cards/card-4.png'
WHERE name = 'The Hollow Echo' AND deck_id = '85dddf8a-cd5e-4cdd-8ccc-af034052e484';

UPDATE public.cards
SET image_url = '/src/assets/cards/card-5.png'
WHERE name = 'The Crumbling Mask' AND deck_id = '85dddf8a-cd5e-4cdd-8ccc-af034052e484';

UPDATE public.cards
SET image_url = '/src/assets/cards/card-6.png'
WHERE name = 'The Chained Heart' AND deck_id = '85dddf8a-cd5e-4cdd-8ccc-af034052e484';

UPDATE public.cards
SET image_url = '/src/assets/cards/card-7.png'
WHERE name = 'The Withered Mirror' AND deck_id = '85dddf8a-cd5e-4cdd-8ccc-af034052e484';

UPDATE public.cards
SET image_url = '/src/assets/cards/card-8.png'
WHERE name = 'The Veil of Shame' AND deck_id = '85dddf8a-cd5e-4cdd-8ccc-af034052e484';

UPDATE public.cards
SET image_url = '/src/assets/cards/card-9.png'
WHERE name = 'The Ashes of Desire' AND deck_id = '85dddf8a-cd5e-4cdd-8ccc-af034052e484';

UPDATE public.cards
SET image_url = '/src/assets/cards/card-10.png'
WHERE name = 'The Forgotten Child' AND deck_id = '85dddf8a-cd5e-4cdd-8ccc-af034052e484';

UPDATE public.cards
SET image_url = '/src/assets/cards/card-11.png'
WHERE name = 'The Ashes of Failure' AND deck_id = '85dddf8a-cd5e-4cdd-8ccc-af034052e484';

UPDATE public.cards
SET image_url = '/src/assets/cards/card-12.png'
WHERE name = 'The Hollow Throne' AND deck_id = '85dddf8a-cd5e-4cdd-8ccc-af034052e484';

UPDATE public.cards
SET image_url = '/src/assets/cards/card-13.png'
WHERE name = 'The Fractured Voice' AND deck_id = '85dddf8a-cd5e-4cdd-8ccc-af034052e484';

UPDATE public.cards
SET image_url = '/src/assets/cards/card-14.png'
WHERE name = 'The Severed Thread' AND deck_id = '85dddf8a-cd5e-4cdd-8ccc-af034052e484';

UPDATE public.cards
SET image_url = '/src/assets/cards/card-15.png'
WHERE name = 'The Cracked Coin' AND deck_id = '85dddf8a-cd5e-4cdd-8ccc-af034052e484';

UPDATE public.cards
SET image_url = '/src/assets/cards/card-16.png'
WHERE name = 'The Hollow Cup' AND deck_id = '85dddf8a-cd5e-4cdd-8ccc-af034052e484';

UPDATE public.cards
SET image_url = '/src/assets/cards/card-17.png'
WHERE name = 'The Stained Hands' AND deck_id = '85dddf8a-cd5e-4cdd-8ccc-af034052e484';

UPDATE public.cards
SET image_url = '/src/assets/cards/card-18.png'
WHERE name = 'The Cracked Lens' AND deck_id = '85dddf8a-cd5e-4cdd-8ccc-af034052e484';

UPDATE public.cards
SET image_url = '/src/assets/cards/card-19.png'
WHERE name = 'The Iron Yoke' AND deck_id = '85dddf8a-cd5e-4cdd-8ccc-af034052e484';

UPDATE public.cards
SET image_url = '/src/assets/cards/card-20.png'
WHERE name = 'The Fractured Temple' AND deck_id = '85dddf8a-cd5e-4cdd-8ccc-af034052e484';