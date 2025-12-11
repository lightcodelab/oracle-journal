import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// Parse CSV line handling quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Extract activity heading from activity content
function extractActivityHeading(activity: string): { heading: string; content: string } {
  if (!activity) return { heading: '', content: '' };
  
  // Look for "Exercise: Title" pattern at the start
  const match = activity.match(/^Exercise:\s*([^\n]+)/);
  if (match) {
    const heading = `Exercise: ${match[1].trim()}`;
    // Remove the heading line from content
    const content = activity.replace(/^Exercise:\s*[^\n]+\n?/, '').trim();
    return { heading, content };
  }
  
  return { heading: '', content: activity };
}

export function ArtOfSelfHealingImport() {
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setResult(null);

    try {
      const text = await file.text();
      const lines = text.split('\n');
      
      // Get the deck ID for "The Art of Self-Healing"
      const { data: deck, error: deckError } = await supabase
        .from('decks')
        .select('id')
        .eq('name', 'The Art of Self-Healing')
        .maybeSingle();

      if (deckError) throw deckError;
      if (!deck) throw new Error('Deck "The Art of Self-Healing" not found. Please create the deck first.');

      // Delete existing cards for this deck
      const { error: deleteError } = await supabase
        .from('cards')
        .delete()
        .eq('deck_id', deck.id);

      if (deleteError) throw deleteError;

      // Parse and prepare cards
      const cards: any[] = [];
      let currentCard: any = null;
      let currentField = '';
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) {
          // Empty line might be part of content
          if (currentCard && currentField) {
            currentCard[currentField] += '\n';
          }
          continue;
        }
        
        // Check if this is a new card line (starts with TAoSH-)
        if (line.startsWith('TAoSH-')) {
          // Save previous card if exists
          if (currentCard) {
            cards.push(currentCard);
          }
          
          const fields = parseCSVLine(line);
          const imageFileName = fields[0] || '';
          const cardNumber = parseInt(fields[1]) || 0;
          const teaching = fields[2] || '';
          const activity = fields[3] || '';
          
          const { heading: activityHeading, content: activityContent } = extractActivityHeading(activity);
          
          currentCard = {
            deck_id: deck.id,
            deck_name: 'The Art of Self-Healing',
            image_file_name: imageFileName ? `${imageFileName}.png` : null,
            card_number: cardNumber,
            card_title: activityHeading || `Card ${cardNumber}`,
            content_sections: {
              teaching: teaching,
              activity_heading: activityHeading,
              activity: activityContent
            }
          };
          currentField = '';
        } else if (currentCard) {
          // This is a continuation of the previous card's content
          // Determine which field this belongs to based on the CSV structure
          const fields = parseCSVLine(line);
          if (fields[2]) {
            currentCard.content_sections.teaching += '\n' + fields[2];
          }
          if (fields[3]) {
            const { heading, content } = extractActivityHeading(fields[3]);
            if (heading && !currentCard.content_sections.activity_heading) {
              currentCard.content_sections.activity_heading = heading;
              currentCard.card_title = heading;
            }
            currentCard.content_sections.activity += '\n' + content;
          }
        }
      }
      
      // Don't forget the last card
      if (currentCard) {
        cards.push(currentCard);
      }

      // Clean up content sections
      cards.forEach(card => {
        if (card.content_sections) {
          card.content_sections.teaching = card.content_sections.teaching?.trim() || '';
          card.content_sections.activity = card.content_sections.activity?.trim() || '';
          card.content_sections.activity_heading = card.content_sections.activity_heading?.trim() || '';
        }
      });

      console.log(`Parsed ${cards.length} cards for import`);

      // Insert cards in batches
      const batchSize = 10;
      let insertedCount = 0;
      
      for (let i = 0; i < cards.length; i += batchSize) {
        const batch = cards.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from('cards')
          .insert(batch);

        if (insertError) {
          console.error('Insert error:', insertError);
          throw insertError;
        }
        insertedCount += batch.length;
      }

      setResult(`Successfully imported ${insertedCount} cards for The Art of Self-Healing deck!`);
      toast.success(`Imported ${insertedCount} cards successfully!`);
    } catch (error) {
      console.error('Import error:', error);
      setResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast.error('Failed to import cards');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import The Art of Self-Healing Cards</CardTitle>
        <CardDescription>
          Upload a CSV file with columns: Card File Name, Card number, Teaching, Activity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          disabled={isImporting}
        />
        {isImporting && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Importing cards...
          </div>
        )}
        {result && (
          <p className={result.startsWith('Error') ? 'text-destructive' : 'text-green-600'}>
            {result}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
