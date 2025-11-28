import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // First, get the Sacred Rewrite deck ID
    const { data: deck, error: deckError } = await supabaseClient
      .from('decks')
      .select('id')
      .eq('name', 'The Sacred Rewrite')
      .single();

    if (deckError || !deck) {
      throw new Error('Sacred Rewrite deck not found');
    }

    const deckId = deck.id;

    // Fetch the CSV content from the project
    const csvUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/sacred-rewrite-full-63-cards.csv`;
    
    // For now, we'll parse a hardcoded CSV string since the file is in the repo
    // In production, you'd fetch from storage or read from a file upload
    
    console.log('Starting card import for deck:', deckId);

    // Read CSV file from the repository (this will be replaced with actual file reading)
    const response = await fetch(new URL('../../../sacred-rewrite-full-63-cards.csv', import.meta.url));
    const csvText = await response.text();

    // Parse CSV
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    
    const cards = [];
    
    // Process each row (skip header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      // Parse CSV row (handling quoted fields with commas)
      const values = parseCSVLine(line);
      
      if (values.length < 21) continue; // Skip incomplete rows

      const card = {
        deck_id: deckId,
        deck_name: values[0],
        image_file_name: values[1],
        card_number: parseInt(values[2]),
        card_title: values[3],
        card_details: values[4],
        opening_invocation_heading: values[5],
        opening_invocation_content: values[6],
        spiral_of_inquiry_heading: values[7],
        spiral_of_inquiry_content: values[8],
        acknowledgement_heading: values[9],
        acknowledgement_content: values[10],
        spiral_of_seeing_heading: values[11],
        spiral_of_seeing_content: values[12],
        living_inquiry_heading: values[13],
        living_inquiry_content: values[14],
        guided_audio_heading: values[15],
        guided_audio_content: values[16],
        embodiment_ritual_heading: values[17],
        embodiment_ritual_content: values[18],
        benediction_heading: values[19],
        benediction_content: values[20],
      };

      cards.push(card);
    }

    console.log(`Parsed ${cards.length} cards from CSV`);

    // Delete existing cards for this deck (clean slate)
    const { error: deleteError } = await supabaseClient
      .from('cards')
      .delete()
      .eq('deck_id', deckId);

    if (deleteError) {
      console.error('Error deleting existing cards:', deleteError);
    }

    // Insert all cards
    const { data: insertedCards, error: insertError } = await supabaseClient
      .from('cards')
      .insert(cards)
      .select();

    if (insertError) {
      throw insertError;
    }

    console.log(`Successfully inserted ${insertedCards?.length || 0} cards`);

    return new Response(
      JSON.stringify({
        success: true,
        cardsImported: insertedCards?.length || 0,
        message: `Successfully imported ${insertedCards?.length || 0} cards for The Sacred Rewrite deck`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error importing cards:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// Helper function to parse CSV lines with quoted fields
function parseCSVLine(line: string): string[] {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last field
  result.push(current.trim());
  
  return result;
}
