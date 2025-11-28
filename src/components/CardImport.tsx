import { useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, CheckCircle, AlertCircle } from "lucide-react";

export const CardImport = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const { toast } = useToast();

  const parseCSVLine = (line: string): string[] => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
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
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const lines = text.split('\n');
      
      // Skip header row
      const dataLines = lines.slice(1).filter(line => line.trim());

      // Get Sacred Rewrite deck ID
      const { data: deck, error: deckError } = await supabase
        .from('decks')
        .select('id')
        .eq('name', 'The Sacred Rewrite')
        .single();

      if (deckError || !deck) {
        throw new Error('Sacred Rewrite deck not found');
      }

      const deckId = deck.id;

      // Delete existing cards for this deck
      await supabase.from('cards').delete().eq('deck_id', deckId);

      // Parse and prepare cards
      const cards = dataLines.map(line => {
        const values = parseCSVLine(line);
        
        return {
          deck_id: deckId,
          deck_name: values[0] || null,
          image_file_name: values[1] || null,
          card_number: parseInt(values[2]) || 0,
          card_title: values[3] || '',
          card_details: values[4] || null,
          opening_invocation_heading: values[5] || null,
          opening_invocation_content: values[6] || null,
          spiral_of_inquiry_heading: values[7] || null,
          spiral_of_inquiry_content: values[8] || null,
          acknowledgement_heading: values[9] || null,
          acknowledgement_content: values[10] || null,
          spiral_of_seeing_heading: values[11] || null,
          spiral_of_seeing_content: values[12] || null,
          living_inquiry_heading: values[13] || null,
          living_inquiry_content: values[14] || null,
          guided_audio_heading: values[15] || null,
          guided_audio_content: values[16] || null,
          embodiment_ritual_heading: values[17] || null,
          embodiment_ritual_content: values[18] || null,
          benediction_heading: values[19] || null,
          benediction_content: values[20] || null,
        };
      });

      console.log(`Importing ${cards.length} cards...`);

      // Insert cards in batches of 10 to avoid timeouts
      const batchSize = 10;
      let imported = 0;

      for (let i = 0; i < cards.length; i += batchSize) {
        const batch = cards.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from('cards')
          .insert(batch);

        if (insertError) {
          throw insertError;
        }

        imported += batch.length;
        console.log(`Imported ${imported}/${cards.length} cards`);
      }

      setImportResult({
        success: true,
        message: `Successfully imported ${cards.length} cards!`,
      });

      toast({
        title: "Import Successful",
        description: `Imported ${cards.length} cards for The Sacred Rewrite deck`,
      });

    } catch (error) {
      console.error('Import error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      setImportResult({
        success: false,
        message: `Import failed: ${errorMessage}`,
      });

      toast({
        title: "Import Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-serif font-semibold mb-4">Import Sacred Rewrite Cards</h2>
      <p className="text-muted-foreground mb-6">
        Upload a CSV file with all 63 cards for The Sacred Rewrite deck. The file should match the 21-column spreadsheet structure.
      </p>

      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={isImporting}
            className="block w-full text-sm text-foreground
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-primary file:text-primary-foreground
              hover:file:bg-primary/90
              file:cursor-pointer
              disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {isImporting && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
              Importing...
            </div>
          )}
        </div>

        {importResult && (
          <div className={`flex items-start gap-3 p-4 rounded-lg ${
            importResult.success 
              ? 'bg-green-500/10 border border-green-500/20' 
              : 'bg-red-500/10 border border-red-500/20'
          }`}>
            {importResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            )}
            <p className={importResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
              {importResult.message}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};
