import { CardImport } from "@/components/CardImport";
import { Button } from "@/components/ui/button";
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
              Upload your complete CSV file to import all Sacred Rewrite cards
            </p>
          </div>

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
        </div>
      </div>
    </div>
  );
};

export default ImportCards;
