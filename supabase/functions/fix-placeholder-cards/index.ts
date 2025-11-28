import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CardSection {
  seeing?: string
  living_inquiry?: string
  embodiment_ritual?: string
  benediction?: string
  acknowledgement?: string
  inquiry?: string
}

const CARD_UPDATES: Record<number, CardSection> = {
  8: {
    seeing: `"I must prove my worth before I can be seen, loved, or honoured."

This distortion ties love to labour and value to visibility. It teaches that rest is weakness and recognition is survival. It builds an empire on exhaustion, forever building, never belonging. You cannot rest because rest feels like erasure. You cannot stop because stopping feels like death. But the race is unwinnable; the finish line does not exist.`,
    
    living_inquiry: `- What fears surface when I let go of performance and productivity?
- How does my body change when I am loved for simply existing?
- What happens in my relationships when I stop over-giving to prove my place?`,
    
    embodiment_ritual: `- Candle Offering: Light your candle and whisper, "I lay down the need to prove."
- Mirror Affirmation: Look into your reflection and say, "I am worthy because I exist."
- Water Blessing: Wash your hands in your water bowl and whisper, "I release the weight of proving."`,
    
    benediction: `Beloved, the crown has melted. The throne stands empty, but your radiance fills the room. You no longer need to ascend to be seen, worth was never above you, only within.

"What if the crown was never a prize, but the proof that you were born divine?"`,
    
    acknowledgement: `This distortion once protected me. It made achievement a shield, if I could prove my worth, perhaps I could avoid rejection or ridicule. It kept me busy enough to outrun the ache of not feeling enough. I honour the part of me that worked so hard to earn safety through perfection. Take a moment to commune with this protector part of you and ask what it needs, write down the response in your journal.

- "What were you afraid would happen if I stopped proving myself?"
- "What do you need from me to rest?"

Picture your inner protector, the perfectionist, the achiever, the tireless one. Let them finally sit beside you. Whisper, "You don't have to hold up the crown anymore. I remember who I am."`,
    
    inquiry: `Mythic Moment: You have worn yourself raw building thrones from other people's approval. Every act of worthiness another brick, every success another plea: See me now? You crowned yourself in exhaustion, thinking achievement would sanctify your existence. But the crown was always empty, forged from fear, heavy with expectation. You have mistaken proving for presence. The soul does not audition for belonging. Your worth was never up for debate; only your memory of it was lost. Set down the crown. You were born royal.`
  },
  
  11: {
    seeing: `"Passion is a dying fire, destined to cool to ash until nothing of love remains."

This distortion tells you to fear the natural ebb of intensity. It calls change decay, and stillness death. It teaches you to mistake maintenance for magic, that only the first spark matters. So you chase the blaze and abandon the hearth. But fire doesn't fade because it's weak; it fades because it was never fed.`,
    
    living_inquiry: `- Where have I mistaken desire for danger?
- How does my body respond when I allow longing to feel safe?
- What becomes possible when I let love refine instead of consume me?`,
    
    embodiment_ritual: `- Candle Flame: Watch the flame of your candle and whisper, "I burn with devotion, not destruction."
- Stone Anchor: Hold your stone over your heart and say, "I am tempered, not consumed."
- Water Blessing: Dip your fingers in water and anoint your lips, whispering, "My love is holy fire."`,
    
    benediction: `Beloved, the ashes have become altar. The fire was never meant to consume you, only consecrate you. You are not the burn, you are the light.

"What if desire was never destruction, but devotion waiting to be tended?"`,
    
    acknowledgement: ``
  },
  
  14: {
    seeing: `"I am fated for solitude, destined never to be chosen, never to be held."

This distortion tells you that love is something doled out to the worthy, a prize for the lucky, a privilege you somehow missed. It binds you to isolation, making self-sufficiency a badge of honour. It whispers that needing love makes you weak. But it is not need that wounds, it is the belief that you are unworthy of being met.`,
    
    living_inquiry: `- Where have I mistaken withdrawal for wisdom?
- What sensations arise in my body when I imagine being truly connected?
- What changes when I let love exist without control?`,
    
    embodiment_ritual: `- Candle Connection: Light your candle and whisper, "Every flame is one flame."
- Stone Anchor: Hold your stone and imagine a golden thread linking your heart to all hearts.
- Water Blessing: Place a drop of water on your palms and whisper, "Love moves through all that I touch."`,
    
    benediction: `Beloved, the thread was never cut, only unseen. You are not alone. You never were. You are the song the universe hums to itself.

"What if separation was only the illusion love created to find itself again?"`,
    
    acknowledgement: ``
  },
  
  19: {
    embodiment_ritual: `- Candle Clarity: Light your candle and whisper, "I am willing to see clearly."
- Stone Grounding: Hold your stone to your heart and say, "My world is abundant, and I belong within it."
- Water Benediction: Dip your fingers into the water and trace a circle on your brow, whispering, "May my sight return to truth."`,
    
    benediction: `Beloved, the world was never empty, only the lens was. You are not fighting for scraps. You are standing in a field that has been growing for you all along.

"What if abundance wasn't something you chased, but something you finally allowed yourself to see?"`
  },
  
  23: {
    seeing: `"My body is broken stone, a ruined structure that cannot hold life's flame."

This distortion is the fatigue of the wounded, the belief that damage means disqualification. It teaches that the scars of the past have hollowed you beyond repair. It makes you look at your body as a burden, not a companion. But what breaks you also forges you. The cracks are not proof of failure, they are the map of your endurance.`,
    
    living_inquiry: `- When do I override my body's truth to meet expectation?
- How does my body communicate yes and no?
- What happens when I treat pain as a conversation instead of a curse?`,
    
    embodiment_ritual: `- Candle Listening: Light your candle and whisper, "This body speaks truth."
- Stone Anchor: Hold your stone against your chest and feel its vibration echo your heartbeat.
- Water Blessing: Dip your fingers in water and trace over any place of pain, whisper, "I am listening."`,
    
    benediction: `Beloved, the temple is no longer fractured, it sings. Every sensation is sacred language, every breath an offering.

"What if your body never betrayed you, it was only begging to be heard?"`,
    
    acknowledgement: `This distortion once protected me. It made detachment feel safer than disappointment. It softened the ache of pain by naming me broken before anyone else could. I honour the part of me that tried to survive by surrendering my vitality. Take a moment to commune with this protector part of you and ask what it needs, write down the response in your journal.

- "What were you afraid would happen if I trusted my body again?"
- "What do you need from me to rest?"

Your protector may appear as the perfectionist, rigid, vigilant, desperate to keep order. Thank it softly: "You protected me from vulnerability. But I am safe now to listen."`,
    
    inquiry: `Mythic Moment: There are days you feel like rubble, bones aching, breath shallow, spirit thin. You touch your skin and feel absence where aliveness used to live. You call yourself broken, a ruin beyond repair. But ruins still echo with prayers. Even shattered temples remember the songs once sung within their walls. The cracks do not mean collapse, they are proof that light has entered. Your body has carried you through fire, through grief, through all that tried to end you. It is not the grave of your soul, it is the sanctuary that kept the flame alive.`
  },
  
  26: {
    seeing: `"My reflection is my enemy, casting back only hatred, mocking me with proof of ugliness."

This distortion turns the mirror into a battlefield. It teaches you to see your image through the lens of comparison, punishment, and cultural distortion. It convinces you that the body you inhabit is unworthy of admiration, that reflection is proof of imperfection. But hatred is not truth; it's the residue of unhealed shame. When you gaze through shame, even the divine looks distorted.`,
    
    living_inquiry: `- How does my body change when I greet my reflection with softness?
- What daily ritual would teach my nervous system that I am safe to be seen?
- Where can I practice bringing a loving tone before I bring a judgment?`,
    
    embodiment_ritual: `- Candle Coronation: Light your candle and whisper, "Flame, show me the truth beneath my judgment."
- Mirror Benediction: Look into your eyes and say, "I am worthy of my own adoration."
- Water Anointing: With damp fingertips, trace your brow, cheeks, lips, "I bless the face that carries me."`,
    
    benediction: `Beloved, the mirror is no longer a blade, it is a candle. May your gaze become your gentlest touch, and your reflection your favourite altar.

"What if the glass was never against you, only waiting to echo the love you bring?"`,
    
    acknowledgement: `This distortion once protected me. It kept me braced for rejection so I wouldn't flinch when it came. If I rejected myself first, perhaps no one else could. It believed that hating my reflection was safer than hoping to be loved. I honour the part of me that believed survival required self-condemnation. Take a moment to commune with this protector part of you and ask what it needs, write down the response in your journal.

- "What were you afraid would happen if I loved myself first?"
- "What do you need from me to rest?"

Your protector might appear as the perfectionist, scanning for flaws before anyone else could name them. Thank it. Whisper: "You don't have to guard the mirror anymore. I am safe to be adored."`,
    
    inquiry: `Mythic Moment: Every time you looked into the glass, you learned to flinch. The mirror became a weapon turned inward, proof of all the ways you fell short. You dissected your face like a battlefield: too much here, too little there, wrong in every unmarked place. You believed the world saw you the way you saw yourself, with disgust. But the mirror was never the enemy; it was only reflecting the harshness you brought to your own gaze. Your reflection was never the problem, your perception was. When you bring love to the mirror, the mirror becomes a portal.`
  },
  
  29: {
    seeing: `"I am doomed to serve, trapped forever as giver while everyone else gets to receive."

This distortion arises when service becomes a cage, when generosity curdles into resentment. It tells you that you are indispensable but invisible, needed but unseen. It binds you to over-giving until emptiness feels like identity. You have mistaken depletion for devotion, exhaustion for honour. But martyrdom is not service; it is self-abandonment.`,
    
    living_inquiry: `- Where does resentment show up in my over-giving?
- What happens in my relationships when I stop rescuing and start receiving?
- What would I create if I believed rest was sacred, not selfish?`,
    
    embodiment_ritual: `- Candle Rest: Light your candle and whisper, "I am allowed to rest."
- Mirror Tenderness: Look into your reflection and say, "You are worthy of care."
- Water Blessing: Wash your hands and whisper, "I release all that is not mine to carry."`,
    
    benediction: `Beloved, the throne of martyrdom has collapsed. You are no longer defined by your service. You are free to receive, to rest, to be held.

"What if devotion was not about disappearing, but about showing up whole?"`,
    
    acknowledgement: `This distortion once protected me. It kept me useful when I feared being unworthy. If I gave endlessly, perhaps I would never be abandoned. It taught me that my value lived in my service, that to rest was to lose worth. I honour the part of me that believed I had to earn my place by giving until empty. Take a moment to commune with this protector part of you and ask what it needs, write down the response in your journal.

- "What were you afraid would happen if I stopped over-giving?"
- "What do you need from me to rest?"

Your protector appears as the caretaker, tireless, vigilant, martyred. Thank it for its devotion. Let it know: "You can rest now. I am enough without the giving."`,
    
    inquiry: `Mythic Moment: You learned to give until your hands were empty, until there was nothing left to offer but your bones. Every act of service became proof of your worth, every time someone needed you, you felt seen. But over time, the throne of generosity became a cage. You could not stop giving without fear of abandonment, could not receive without guilt. The distortion whispered: You are only valuable when you are useful. But the divine never asked for your depletion. You were worthy before your first act of service, and you will remain worthy even in stillness.`
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get deck ID
    const { data: deck, error: deckError } = await supabaseClient
      .from('decks')
      .select('id')
      .eq('name', 'The Sacred Rewrite')
      .single()

    if (deckError || !deck) {
      throw new Error('Deck not found')
    }

    const updates = []
    for (const [cardNum, sections] of Object.entries(CARD_UPDATES)) {
      const cardNumber = parseInt(cardNum)
      
      const updateData: any = {}
      if (sections.seeing) updateData.spiral_of_seeing_content = sections.seeing
      if (sections.living_inquiry) updateData.living_inquiry_content = sections.living_inquiry
      if (sections.embodiment_ritual) updateData.embodiment_ritual_content = sections.embodiment_ritual
      if (sections.benediction) updateData.benediction_content = sections.benediction
      if (sections.acknowledgement) updateData.acknowledgement_content = sections.acknowledgement
      if (sections.inquiry) updateData.spiral_of_inquiry_content = sections.inquiry
      
      const { error: updateError } = await supabaseClient
        .from('cards')
        .update(updateData)
        .eq('deck_id', deck.id)
        .eq('card_number', cardNumber)
      
      if (updateError) {
        console.error(`Error updating card ${cardNumber}:`, updateError)
        updates.push({ cardNumber, success: false, error: updateError.message })
      } else {
        updates.push({ cardNumber, success: true })
      }
    }

    return new Response(
      JSON.stringify({ success: true, updates }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
