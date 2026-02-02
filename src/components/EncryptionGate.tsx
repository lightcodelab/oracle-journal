import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useEncryption } from '@/hooks/useEncryption';
import EncryptionSetupFlow from '@/components/EncryptionSetupFlow';
import EncryptionUnlockDialog from '@/components/EncryptionUnlockDialog';
import { Loader2 } from 'lucide-react';

interface EncryptionGateProps {
  children: ReactNode;
  /**
   * If true, will show setup/unlock flow for encryption
   * If false, will render children even if encryption is not set up
   */
  required?: boolean;
  /**
   * If true, allows skipping encryption setup/unlock
   */
  allowSkip?: boolean;
  /**
   * Called when user completes setup/unlock
   */
  onReady?: () => void;
}

/**
 * Gate component that ensures encryption is set up and unlocked
 * before rendering children.
 * 
 * Usage:
 * <EncryptionGate required>
 *   <JournalPage />
 * </EncryptionGate>
 */
export default function EncryptionGate({ 
  children, 
  required = true,
  allowSkip = false,
  onReady 
}: EncryptionGateProps) {
  const { user, loading: authLoading } = useAuth();
  const { isInitialized, isUnlocked, hasEncryptionKey } = useEncryption();

  // Show loading while auth or encryption is initializing
  if (authLoading || !isInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If not logged in, just render children (auth should handle redirect)
  if (!user) {
    return <>{children}</>;
  }

  // If encryption not required, render children
  if (!required) {
    return <>{children}</>;
  }

  // If user doesn't have encryption set up, show setup flow
  if (!hasEncryptionKey) {
    return (
      <EncryptionSetupFlow
        onComplete={() => onReady?.()}
      />
    );
  }

  // If encryption is set up but not unlocked, show unlock dialog
  if (!isUnlocked) {
    return (
      <EncryptionUnlockDialog
        onUnlocked={() => onReady?.()}
        onSkip={allowSkip ? () => onReady?.() : undefined}
      />
    );
  }

  // Encryption is set up and unlocked, render children
  return <>{children}</>;
}

/**
 * Hook to check if content should be encrypted
 * Returns true if user has encryption set up and unlocked
 */
export function useEncryptionAvailable(): boolean {
  const { user } = useAuth();
  const { hasEncryptionKey, isUnlocked } = useEncryption();
  
  return !!user && hasEncryptionKey && isUnlocked;
}
