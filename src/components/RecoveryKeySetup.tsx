import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Shield, AlertTriangle, Check } from 'lucide-react';
import { toast } from 'sonner';

interface RecoveryKeySetupProps {
  recoveryPhrase: string;
  onComplete: () => void;
}

export default function RecoveryKeySetup({ recoveryPhrase, onComplete }: RecoveryKeySetupProps) {
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(recoveryPhrase);
      setCopied(true);
      toast.success('Recovery phrase copied to clipboard');
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      toast.error('Failed to copy. Please select and copy manually.');
    }
  };

  const words = recoveryPhrase.split(' ');

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <CardTitle className="font-serif text-2xl">Save Your Recovery Phrase</CardTitle>
        <CardDescription>
          This phrase is the only way to recover your encrypted data if you forget your password.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Write this down and store it safely.</strong> If you lose this phrase and forget your password, your encrypted data cannot be recovered.
          </AlertDescription>
        </Alert>

        {/* Recovery phrase grid */}
        <div className="bg-muted/50 border rounded-lg p-4">
          <div className="grid grid-cols-3 gap-2">
            {words.map((word, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-background rounded px-3 py-2 text-sm"
              >
                <span className="text-muted-foreground text-xs w-4">{index + 1}.</span>
                <span className="font-mono">{word}</span>
              </div>
            ))}
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-2" />
              Copy to Clipboard
            </>
          )}
        </Button>

        <div className="flex items-start gap-3 pt-4">
          <Checkbox
            id="confirm"
            checked={confirmed}
            onCheckedChange={(checked) => setConfirmed(checked === true)}
          />
          <label
            htmlFor="confirm"
            className="text-sm text-muted-foreground cursor-pointer leading-relaxed"
          >
            I have written down or securely stored my recovery phrase and understand that I need it to recover my data if I forget my password.
          </label>
        </div>
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          disabled={!confirmed}
          onClick={onComplete}
        >
          Continue to Temple
        </Button>
      </CardFooter>
    </Card>
  );
}
