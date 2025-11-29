// Flexible content structure for different deck types
export interface OracleCard {
  id: string;
  deck_id: string;
  deck_name?: string;
  image_file_name?: string;
  card_number: number;
  card_title: string;
  
  // Flexible JSON content structure - varies by deck type
  content_sections?: { [key: string]: any } | null;
  
  // Legacy fields for backward compatibility (Sacred Rewrite deck)
  card_details?: string;
  opening_invocation_heading?: string;
  opening_invocation_content?: string;
  spiral_of_inquiry_heading?: string;
  spiral_of_inquiry_content?: string;
  acknowledgement_heading?: string;
  acknowledgement_content?: string;
  spiral_of_seeing_heading?: string;
  spiral_of_seeing_content?: string;
  living_inquiry_heading?: string;
  living_inquiry_content?: string;
  guided_audio_heading?: string;
  guided_audio_content?: string;
  embodiment_ritual_heading?: string;
  embodiment_ritual_content?: string;
  benediction_heading?: string;
  benediction_content?: string;
  
  created_at?: string;
  updated_at?: string;
}

// This array is no longer used - cards are fetched from the database
export const oracleCards: OracleCard[] = [];
