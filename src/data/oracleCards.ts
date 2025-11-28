// Database structure matching the 21-column spreadsheet
export interface OracleCard {
  id: string;
  deck_id: string;
  deck_name?: string;
  image_file_name?: string;
  card_number: number;
  card_title: string;
  card_details?: string;
  
  // Opening Invocation section
  opening_invocation_heading?: string;
  opening_invocation_content?: string;
  
  // Spiral of Inquiry section
  spiral_of_inquiry_heading?: string;
  spiral_of_inquiry_content?: string;
  
  // Acknowledgement section
  acknowledgement_heading?: string;
  acknowledgement_content?: string;
  
  // Spiral of Seeing section
  spiral_of_seeing_heading?: string;
  spiral_of_seeing_content?: string;
  
  // Living Inquiry section
  living_inquiry_heading?: string;
  living_inquiry_content?: string;
  
  // Guided Audio section
  guided_audio_heading?: string;
  guided_audio_content?: string;
  
  // Embodiment Ritual section
  embodiment_ritual_heading?: string;
  embodiment_ritual_content?: string;
  
  // Benediction section
  benediction_heading?: string;
  benediction_content?: string;
  
  created_at?: string;
  updated_at?: string;
}

// This array is no longer used - cards are fetched from the database
export const oracleCards: OracleCard[] = [];
