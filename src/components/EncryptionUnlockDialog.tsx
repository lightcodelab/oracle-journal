import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Key, Loader2, AlertTriangle } from 'lucide-react';
import { useEncryption } from '@/hooks/useEncryption';
import { toast } from 'sonner';

interface EncryptionUnlockDialogProps {
  onUnlocked: () => void;
  onSkip?: () => void;
  /** Render inside an existing page layout instead of a full-screen takeover */
  embedded?: boolean;
}

export default function EncryptionUnlockDialog({ onUnlocked, onSkip, embedded = false }: EncryptionUnlockDialogProps) {
  const { unlockEncryption, recoverWithPhrase, hasEncryptionKey } = useEncryption();
  const [activeTab, setActiveTab] = useState<'password' | 'recovery'>('password');
  const [password, setPassword] = useState('');
  const [recoveryPhrase, setRecoveryPhrase] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePasswordUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await unlockEncryption(password);
      toast.success('Encryption unlocked');
      onUnlocked();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlock encryption');
    } finally {
      setLoading(false);
    }
  };

  const handleRecoveryUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      await recoverWithPhrase(recoveryPhrase, newPassword);
      toast.success('Encryption recovered successfully');
      onUnlocked();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to recover encryption');
    } finally {
      setLoading(false);
    }
  };

  if (!hasEncryptionKey) {
    return null;
  }

  return (
    <div className={embedded ? "flex-1 bg-background flex items-center justify-center p-4" : "min-h-screen bg-background flex items-center justify-center p-4"}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="font-serif text-2xl">Unlock Your Data</CardTitle>
          <CardDescription>
            Enter your password to decrypt your private data
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'password' | 'recovery')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="password">Password</TabsTrigger>
              <TabsTrigger value="recovery">Recovery</TabsTrigger>
            </TabsList>

            <TabsContent value="password" className="mt-4">
              <form onSubmit={handlePasswordUnlock} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="unlock-password">Password</Label>
                  <Input
                    id="unlock-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    disabled={loading}
                  />
                </div>

                {error && activeTab === 'password' && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Unlocking...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Unlock
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="recovery" className="mt-4">
              <form onSubmit={handleRecoveryUnlock} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="recovery-phrase">Recovery Phrase</Label>
                  <Input
                    id="recovery-phrase"
                    type="text"
                    value={recoveryPhrase}
                    onChange={(e) => setRecoveryPhrase(e.target.value)}
                    placeholder="Enter your 12-word recovery phrase"
                    required
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter all 12 words separated by spaces
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Create a new password"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    required
                    disabled={loading}
                  />
                </div>

                {error && activeTab === 'recovery' && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Recovering...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4 mr-2" />
                      Recover & Set New Password
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>

        {onSkip && (
          <CardFooter>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={onSkip}
            >
              Skip for now (some features will be limited)
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
