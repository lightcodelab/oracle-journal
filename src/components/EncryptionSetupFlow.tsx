import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Loader2, AlertTriangle } from 'lucide-react';
import { useEncryption } from '@/hooks/useEncryption';
import RecoveryKeySetup from '@/components/RecoveryKeySetup';

interface EncryptionSetupFlowProps {
  onComplete: () => void;
}

type SetupStep = 'password' | 'recovery';

export default function EncryptionSetupFlow({ onComplete }: EncryptionSetupFlowProps) {
  const { initializeEncryption } = useEncryption();
  const [step, setStep] = useState<SetupStep>('password');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryPhrase, setRecoveryPhrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const phrase = await initializeEncryption(password);
      setRecoveryPhrase(phrase);
      setStep('recovery');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize encryption');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'recovery' && recoveryPhrase) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <RecoveryKeySetup
          recoveryPhrase={recoveryPhrase}
          onComplete={onComplete}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="font-serif text-2xl">Secure Your Data</CardTitle>
          <CardDescription>
            Create a password to encrypt your private data. This password will be used to protect your journal entries, readings, and personal notes.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="encryption-password">Encryption Password</Label>
              <Input
                id="encryption-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                required
                disabled={loading}
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">
                Minimum 8 characters. This can be different from your login password.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-encryption-password">Confirm Password</Label>
              <Input
                id="confirm-encryption-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                disabled={loading}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Setting up encryption...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Create Encryption Key
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
