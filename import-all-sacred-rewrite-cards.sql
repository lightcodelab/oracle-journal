-- Import all 63 Sacred Rewrite cards
-- Deck ID: 85dddf8a-cd5e-4cdd-8ccc-af034052e484

-- Delete existing cards first
DELETE FROM public.cards WHERE deck_id = '85dddf8a-cd5e-4cdd-8ccc-af034052e484';

-- Card 1: The Veil of Shame
INSERT INTO public.cards (
  deck_id, deck_name, image_file_name, card_number, card_title, card_details,
  opening_invocation_heading, opening_invocation_content,
  spiral_of_inquiry_heading, spiral_of_inquiry_content,
  acknowledgement_heading, acknowledgement_content,
  spiral_of_seeing_heading, spiral_of_seeing_content,
  living_inquiry_heading, living_inquiry_content,
  guided_audio_heading, guided_audio_content,
  embodiment_ritual_heading, embodiment_ritual_content,
  benediction_heading, benediction_content
) VALUES (
  '85dddf8a-cd5e-4cdd-8ccc-af034052e484',
  'The Sacred Rewrite',
  'card-1.png',
  1,
  'The Veil of Shame',
  'The Distortion: "I am ashamed of who I am, my very being is stained and unworthy."

The Higher Truth: "I stand radiant in my truth, unashamed, unhidden, holy in every breath."',
  'Opening Invocation & Altar Ritual',
  'Beloved, close your eyes. Feel the floor beneath your feet, the weight of your body, the rhythm of your breath. You are entering a sacred chamber within yourself, the Chamber of Sacred Undoing. Here, nothing is demanded of you; only witnessed.

Breathe once for the body, once for the heart, once for the soul. Let your exhale soften the walls around you. Notice where shame lingers, in the throat, the chest, the belly. Touch that place gently, as if meeting an old friend.

At your altar, light the candle and ask: "Flame, what have I been afraid to see?"

Lift the mirror and let the candlelight fall across your face. Ask softly: "Can I see my soul beyond all masks?"

Hold the stone in your palm. Feel its weight, its history, its endurance. Ask: "What am I still carrying that longs to be set down?"

Dip your fingertips into the water. Touch your brow, your throat, your heart, and ask: "How is this moment already making me new?"

Bow lightly toward your altar and feel your breath return home to your body. You are ready.',
  'Spiral of Inquiry',
  'Mythic Moment: Shame was the first chain. It wrapped around your throat before you had words. You learned to shrink your glow, to flinch at your own reflection, to apologize for existing. The wound became doctrine: Hide your holiness. Keep your voice small. Earn your right to breathe. You have mistaken the bruise for your identity, the cage for safety. But there is gold beneath the soot. The soul waits, burning beneath the grime, whispering: You were never unworthy. Only unfinished in your remembering.

Reflective Transition: Notice where your body tightens when you read those words. That is where the chain still clings. Let''s turn toward it now, not to fight it, but to understand what it once protected.

Inquiry Questions:
- When did I first learn that shame kept me safe?
- What happens in my body when I imagine being fully seen without apology?
- If shame was protection, what truth was it trying to guard?',
  'Acknowledgement of Distortion as Protection',
  'This distortion once protected me. Shame taught me to disappear before I could be hurt. It believed invisibility was safety. I honour the part of me that carried that burden. Beloved protector, what do you need to feel seen, heard, loved, and safe as we transform? You are not being banished, you are being welcomed home.

Take a moment to commune with this protector part of you and ask what it needs, write down the response in your journal.
- "What were you afraid would happen?"
- "What do you need from me to rest?"

Take a slow breath and let these questions land. Feel into the place in your body that responds first, not with words, but with sensation. Perhaps warmth, or ache, or trembling. Offer gratitude to the protector that once believed shame was safety. Let it know: it no longer needs to hide you.',
  'The Spiral of Seeing',
  'The Distortion: "I am ashamed of who I am, my very being is stained and unworthy."

Shame convinces you that your essence itself is the flaw, that there is rot where there is simply tenderness. It keeps you small, apologetic, self-censoring. This distortion was once armour: if you condemned yourself first, no one else could. But armour hardens into prison. What once kept you safe now keeps you separate.

The Higher Truth: "I stand radiant in my truth, unashamed, unhidden, holy in every breath."

Radiance is not denial of darkness; it is the light that pours through it. To stand radiant is to stand naked before your own divinity, flawed, messy, human, and still holy. The shame dissolves not through perfection but through presence. When you refuse to hide, the stain vanishes in the brilliance of your being.

The teaching hidden inside: Shame is not proof of unworthiness; it is the veil stretched across remembrance. Tear it, and you will not find purity, you will find humanity made sacred. Radiance is what happens when you stop running from the parts you swore disqualified you from love.

- What if the stain you fear is not flaw but the mark of your humanity?
- What if the parts you condemned are simply the places where love most longs to live?
- What if holiness was never about purity, but presence, raw and unguarded?',
  'Living Inquiry Prompts',
  '- When shame rises, what story do I tell myself about who I am?
- How does my breath change when I look at myself with softness instead of scrutiny?
- What becomes possible when I stop apologizing for existing?',
  'Guided Audio Journey',
  '[Replace with the relevant audio file once it is provided. This will require an audio player.]',
  'Practical Embodiment Ritual',
  '- Mirror Gaze: Look into your eyes and whisper, "I see the one I once hid."
- Stone Release: Place a stone upon your heart, name one old story of shame, and say, "I set this down."
- Water Anointing: Dip your fingers in water and touch your throat, permission to speak as you are.',
  'Closing Benediction',
  'Beloved, the veil has lifted. The shame that once shielded you has become your sanctifier. You are no longer defined by what you hid from, you are defined by what you dared to meet.

"What if the wound was never the end, but the door back to your own holiness?"'
);

-- NOTE: This file contains only Card 1 as an example.
-- Due to the size of the data (63 cards with extensive content each), 
-- I recommend using the /import-cards page in your app to upload the complete CSV file.
-- Alternatively, I can continue generating SQL for remaining cards in batches.
