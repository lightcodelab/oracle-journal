import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEncryption } from '@/hooks/useEncryption';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { EncryptedField } from '@/lib/encryption';
import type { Json } from '@/integrations/supabase/types';

interface MigrationStats {
  journalTotal: number;
  journalMigrated: number;
  readingsTotal: number;
  readingsMigrated: number;
}

export default function DataMigrationUtility() {
  const { user } = useAuth();
  const { isUnlocked, encryptText, encryptObject } = useEncryption();
  const [migrating, setMigrating] = useState(false);
  const [stats, setStats] = useState<MigrationStats | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  const runMigration = async () => {
    if (!user || !isUnlocked) return;

    setMigrating(true);
    setError(null);
    setProgress(0);
    setCompleted(false);

    try {
      // Fetch unencrypted journal entries
      const { data: journalEntries, error: journalError } = await supabase
        .from('journal_entries')
        .select('id, title, content_json, content_text')
        .eq('user_id', user.id)
        .or('is_encrypted.is.null,is_encrypted.eq.false')
        .is('deleted_at', null);

      if (journalError) throw journalError;

      // Fetch unencrypted saved readings
      const { data: savedReadings, error: readingsError } = await supabase
        .from('saved_readings')
        .select('id, notes')
        .eq('user_id', user.id)
        .or('is_encrypted.is.null,is_encrypted.eq.false')
        .not('notes', 'is', null);

      if (readingsError) throw readingsError;

      const totalItems = (journalEntries?.length || 0) + (savedReadings?.length || 0);
      let processed = 0;

      const newStats: MigrationStats = {
        journalTotal: journalEntries?.length || 0,
        journalMigrated: 0,
        readingsTotal: savedReadings?.length || 0,
        readingsMigrated: 0,
      };

      // Migrate journal entries
      for (const entry of journalEntries || []) {
        try {
          const updates: Record<string, unknown> = { is_encrypted: true };

          if (entry.title) {
            updates.title_encrypted = await encryptText(entry.title) as unknown as Json;
            updates.title = null;
          }

          if (entry.content_text) {
            updates.content_text_encrypted = await encryptText(entry.content_text) as unknown as Json;
            updates.content_text = '';
          }

          if (entry.content_json) {
            updates.content_json_encrypted = await encryptObject(entry.content_json) as unknown as Json;
            updates.content_json = {};
          }

          const { error: updateError } = await supabase
            .from('journal_entries')
            .update(updates)
            .eq('id', entry.id);

          if (updateError) throw updateError;
          newStats.journalMigrated++;
        } catch (err) {
          console.error('Failed to migrate journal entry:', entry.id, err);
        }

        processed++;
        setProgress(Math.round((processed / totalItems) * 100));
      }

      // Migrate saved readings
      for (const reading of savedReadings || []) {
        try {
          if (reading.notes) {
            const encryptedNotes = await encryptText(reading.notes) as unknown as Json;

            const { error: updateError } = await supabase
              .from('saved_readings')
              .update({
                notes_encrypted: encryptedNotes,
                notes: null,
                is_encrypted: true,
              })
              .eq('id', reading.id);

            if (updateError) throw updateError;
            newStats.readingsMigrated++;
          }
        } catch (err) {
          console.error('Failed to migrate reading:', reading.id, err);
        }

        processed++;
        setProgress(Math.round((processed / totalItems) * 100));
      }

      setStats(newStats);
      setCompleted(true);
      toast.success('Data migration completed!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Migration failed');
      toast.error('Migration failed');
    } finally {
      setMigrating(false);
    }
  };

  if (!isUnlocked) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Encryption must be unlocked to migrate data.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Encrypt Existing Data
        </CardTitle>
        <CardDescription>
          Migrate your existing journal entries and saved readings to encrypted format.
          This process is irreversible but ensures all your data is protected.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {migrating && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground text-center">
              Encrypting data... {progress}%
            </p>
          </div>
        )}

        {completed && stats && (
          <Alert className="bg-green-500/10 border-green-500/20">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription>
              <strong>Migration complete!</strong>
              <ul className="mt-2 text-sm">
                <li>Journal entries: {stats.journalMigrated} / {stats.journalTotal} encrypted</li>
                <li>Saved readings: {stats.readingsMigrated} / {stats.readingsTotal} encrypted</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {!completed && (
          <Button
            onClick={runMigration}
            disabled={migrating}
            className="w-full"
          >
            {migrating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Migrating...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Start Migration
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
