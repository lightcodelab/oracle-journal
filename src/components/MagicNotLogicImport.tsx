import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const MagicNotLogicImport = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const { toast } = useToast();

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let insideQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"' && nextChar === '"' && insideQuotes) {
        current += '"';
        i++;
      } else if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setResult(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      // Get Magic not Logic deck ID
      const { data: deck, error: deckError } = await supabase
        .from('decks')
        .select('id')
        .eq('name', 'Magic not Logic')
        .single();

      if (deckError || !deck) {
        throw new Error('Magic not Logic deck not found. Please create it first.');
      }

      // Delete existing cards for this deck
      const { error: deleteError } = await supabase
        .from('cards')
        .delete()
        .eq('deck_id', deck.id);

      if (deleteError) throw deleteError;

      // Parse CSV (skip header row)
      const cards = [];
      for (let i = 1; i < lines.length; i++) {
        const fields = parseCSVLine(lines[i]);
        
        if (fields.length < 6) continue;

        const [
          cardFileName,
          cardNumber,
          cardDetails,
          journallingHeading,
          journallingActivity,
          vimeoVideo
        ] = fields;

        const card = {
          deck_id: deck.id,
          deck_name: 'Magic not Logic',
          image_file_name: cardFileName.trim(),
          card_number: parseInt(cardNumber.trim()),
          card_title: cardDetails.split('\n')[0].replace('CLEARING:', '').trim(),
          card_details: cardDetails.trim(),
          content_sections: {
            card_details: cardDetails.trim(),
            journalling_activity_heading: journallingHeading.trim(),
            journalling_activity: journallingActivity.trim(),
            vimeo_video: vimeoVideo.trim()
          }
        };

        cards.push(card);
      }

      // Insert in batches
      const batchSize = 10;
      for (let i = 0; i < cards.length; i += batchSize) {
        const batch = cards.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from('cards')
          .insert(batch);

        if (insertError) throw insertError;
      }

      setResult({
        success: true,
        message: `Successfully imported ${cards.length} cards for Magic not Logic deck`
      });

      toast({
        title: "Success",
        description: `Imported ${cards.length} cards`,
      });

    } catch (error: any) {
      console.error('Import error:', error);
      setResult({
        success: false,
        message: error.message || 'Failed to import cards'
      });

      toast({
        title: "Error",
        description: error.message || 'Failed to import cards',
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Magic not Logic Cards</CardTitle>
        <CardDescription>
          Upload the Magic not Logic CSV file to import all cards with Vimeo videos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={isImporting}
          />
        </div>

        {isImporting && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Importing cards...</span>
          </div>
        )}

        {result && (
          <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'}`}>
            {result.message}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
