// Node.js script to extract cards from parsed documents and generate SQL
const fs = require('fs');

const documents = [
  { file: 'tool-results://document--parse_document/20251128-051543-736212', cardRange: '1-16' },
  { file: 'tool-results://document--parse_document/20251128-051542-775299', cardRange: '17-33' },
  { file: 'tool-results://document--parse_document/20251128-051635-305776', cardRange: '34-49' },
  { file: 'tool-results://document--parse_document/20251128-051543-540337', cardRange: '50-63' }
];

// Deck ID from database
const DECK_ID = '85dddf8a-cd5e-4cdd-8ccc-af034052e484';

function extractCards(content) {
  const cards = [];
  const lines = content.split('\n');
  
  let currentCard = null;
  let currentSection = null;
  let sectionContent = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Detect new card
    if (line.match(/^# Card (\d+),\s*(.+)$/)) {
      if (currentCard) {
        cards.push(currentCard);
      }
      const match = line.match(/^# Card (\d+),\s*(.+)$/);
      currentCard = {
        card_number: parseInt(match[1]),
        card_title: match[2],
        card_details: '',
        opening_invocation_heading: 'Opening Invocation & Altar Ritual',
        opening_invocation_content: '',
        spiral_of_inquiry_heading: 'Spiral of Inquiry',
        spiral_of_inquiry_content: '',
        acknowledgement_heading: 'Acknowledgement of Distortion as Protection',
        acknowledgement_content: '',
        spiral_of_seeing_heading: 'The Spiral of Seeing',
        spiral_of_seeing_content: '',
        living_inquiry_heading: 'Living Inquiry Prompts',
        living_inquiry_content: '',
        guided_audio_heading: 'Guided Audio Journey',
        guided_audio_content: '[Audio content to be added]',
        embodiment_ritual_heading: 'Practical Embodiment Ritual',
        embodiment_ritual_content: '',
        benediction_heading: 'Closing Benediction',
        benediction_content: ''
      };
      currentSection = null;
      sectionContent = [];
      continue;
    }
    
    if (!currentCard) continue;
    
    // Detect distortion/higher truth
    if (line.match(/^#? ?The Distortion:/)) {
      currentSection = 'distortion';
      sectionContent = [];
      continue;
    }
    
    if (line.match(/^#? ?The Higher Truth:/)) {
      if (currentSection === 'distortion' && sectionContent.length > 0) {
        currentCard.card_details = `The Distortion: ${sectionContent.join(' ').trim()}`;
      }
      currentSection = 'higher_truth';
      sectionContent = [];
      continue;
    }
    
    // Detect sections
    if (line.match(/^# Opening Invocation/)) {
      if (currentSection === 'higher_truth' && sectionContent.length > 0) {
        currentCard.card_details += `\nThe Higher Truth: ${sectionContent.join(' ').trim()}`;
      }
      currentSection = 'opening_invocation';
      sectionContent = [];
      continue;
    }
    
    if (line.match(/^# Spiral of Inquiry/)) {
      if (currentSection === 'opening_invocation' && sectionContent.length > 0) {
        currentCard.opening_invocation_content = sectionContent.join('\n').trim();
      }
      currentSection = 'spiral_inquiry';
      sectionContent = [];
      continue;
    }
    
    if (line.match(/^# Acknowledgement/)) {
      if (currentSection === 'spiral_inquiry' && sectionContent.length > 0) {
        currentCard.spiral_of_inquiry_content = sectionContent.join('\n').trim();
      }
      currentSection = 'acknowledgement';
      sectionContent = [];
      continue;
    }
    
    if (line.match(/^# The Spiral of Seeing/)) {
      if (currentSection === 'acknowledgement' && sectionContent.length > 0) {
        currentCard.acknowledgement_content = sectionContent.join('\n').trim();
      }
      currentSection = 'spiral_seeing';
      sectionContent = [];
      continue;
    }
    
    if (line.match(/^# Living Inquiry/) || line.match(/^# Inquiry Prompts/)) {
      if (currentSection === 'spiral_seeing' && sectionContent.length > 0) {
        currentCard.spiral_of_seeing_content = sectionContent.join('\n').trim();
      }
      currentSection = 'living_inquiry';
      sectionContent = [];
      continue;
    }
    
    if (line.match(/^# Guided Audio/) || line.match(/^# Audio/)) {
      if (currentSection === 'living_inquiry' && sectionContent.length > 0) {
        currentCard.living_inquiry_content = sectionContent.join('\n').trim();
      }
      currentSection = 'guided_audio';
      sectionContent = [];
      continue;
    }
    
    if (line.match(/^# Practical Embodiment/) || line.match(/^# Embodiment/)) {
      if (currentSection === 'guided_audio' && sectionContent.length > 0) {
        currentCard.guided_audio_content = sectionContent.join('\n').trim();
      }
      currentSection = 'embodiment';
      sectionContent = [];
      continue;
    }
    
    if (line.match(/^# Closing Benediction/) || line.match(/^# Benediction/)) {
      if (currentSection === 'embodiment' && sectionContent.length > 0) {
        currentCard.embodiment_ritual_content = sectionContent.join('\n').trim();
      }
      currentSection = 'benediction';
      sectionContent = [];
      continue;
    }
    
    // Skip image lines and page markers
    if (line.startsWith('###') || line.startsWith('## Page') || line.includes('parsed-documents://')) {
      continue;
    }
    
    // Add content to current section
    if (currentSection && line && !line.startsWith('#')) {
      sectionContent.push(line);
    }
  }
  
  // Save last card
  if (currentCard) {
    if (currentSection === 'benediction' && sectionContent.length > 0) {
      currentCard.benediction_content = sectionContent.join('\n').trim();
    }
    cards.push(currentCard);
  }
  
  return cards;
}

function escapeSQL(str) {
  if (!str) return '';
  return str.replace(/'/g, "''").replace(/\\/g, '\\\\');
}

function generateSQL(cards) {
  let sql = `-- Delete existing Sacred Rewrite cards\nDELETE FROM public.cards WHERE deck_id = '${DECK_ID}';\n\n`;
  
  for (const card of cards) {
    sql += `INSERT INTO public.cards (
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
  '${DECK_ID}',
  'The Sacred Rewrite',
  'card-${card.card_number}.png',
  ${card.card_number},
  '${escapeSQL(card.card_title)}',
  '${escapeSQL(card.card_details)}',
  '${escapeSQL(card.opening_invocation_heading)}',
  '${escapeSQL(card.opening_invocation_content)}',
  '${escapeSQL(card.spiral_of_inquiry_heading)}',
  '${escapeSQL(card.spiral_of_inquiry_content)}',
  '${escapeSQL(card.acknowledgement_heading)}',
  '${escapeSQL(card.acknowledgement_content)}',
  '${escapeSQL(card.spiral_of_seeing_heading)}',
  '${escapeSQL(card.spiral_of_seeing_content)}',
  '${escapeSQL(card.living_inquiry_heading)}',
  '${escapeSQL(card.living_inquiry_content)}',
  '${escapeSQL(card.guided_audio_heading)}',
  '${escapeSQL(card.guided_audio_content)}',
  '${escapeSQL(card.embodiment_ritual_heading)}',
  '${escapeSQL(card.embodiment_ritual_content)}',
  '${escapeSQL(card.benediction_heading)}',
  '${escapeSQL(card.benediction_content)}'
);\n\n`;
  }
  
  return sql;
}

console.log('This script should be run with the parsed document files.');
console.log('For Lovable, this will be done directly through the Supabase insert tool.');
