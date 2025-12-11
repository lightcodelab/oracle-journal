import { CardImport } from "@/components/CardImport";
import { MagicNotLogicImport } from "@/components/MagicNotLogicImport";
import { ArtOfSelfHealingImport } from "@/components/ArtOfSelfHealingImport";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const ImportCards = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 p-8">
      <div className="max-w-4xl mx-auto">
        <Button
          onClick={() => navigate('/')}
          variant="ghost"
          className="mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="space-y-8">
          <div className="text-center">
            <h1 className="font-serif text-4xl font-bold text-foreground mb-4">
              Card Import Tool
            </h1>
            <p className="text-muted-foreground text-lg">
              Import cards for different decks
            </p>
          </div>

          <Tabs defaultValue="sacred-rewrite" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sacred-rewrite">The Sacred Rewrite</TabsTrigger>
              <TabsTrigger value="magic-not-logic">Magic not Logic</TabsTrigger>
              <TabsTrigger value="art-of-self-healing">Art of Self-Healing</TabsTrigger>
            </TabsList>
            
            <TabsContent value="sacred-rewrite" className="space-y-6">
              <CardImport />
              
              <div className="bg-card/50 border border-border rounded-lg p-6">
                <h3 className="font-semibold text-lg mb-3">CSV Format Requirements:</h3>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                  <li>File must be in CSV format (.csv)</li>
                  <li>Must include all 21 columns as defined in the spreadsheet</li>
                  <li>First row should be the header row</li>
                  <li>Each subsequent row represents one card</li>
                  <li>Card number should be between 1 and 63</li>
                  <li>All text fields can contain line breaks and special characters</li>
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="magic-not-logic" className="space-y-6">
              <MagicNotLogicImport />
              
              <div className="bg-card/50 border border-border rounded-lg p-6">
                <h3 className="font-semibold text-lg mb-3">CSV Format Requirements:</h3>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                  <li>File must be in CSV format (.csv)</li>
                  <li>Columns: Card File Name, Card number, card details, journalling activity heading, journalling activity, vimeo video</li>
                  <li>Vimeo video column should contain just the video ID (e.g., 691209896)</li>
                  <li>First row should be the header row</li>
                  <li>Each subsequent row represents one card</li>
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="art-of-self-healing" className="space-y-6">
              <ArtOfSelfHealingImport />
              
              <div className="bg-card/50 border border-border rounded-lg p-6">
                <h3 className="font-semibold text-lg mb-3">CSV Format Requirements:</h3>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                  <li>File must be in CSV format (.csv)</li>
                  <li>Columns: Card File Name, Card number, Teaching, Activity</li>
                  <li>Card File Name should match image files (e.g., TAoSH-1-8)</li>
                  <li>Teaching column contains the main teaching content</li>
                  <li>Activity column starts with "Exercise: [Title]" followed by instructions</li>
                  <li>First row should be the header row</li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ImportCards;
