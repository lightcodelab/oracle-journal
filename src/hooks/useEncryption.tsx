import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  generateMasterKey,
  wrapMasterKey,
  unwrapMasterKey,
  generateRecoveryPhrase,
  masterKeyFromRecoveryPhrase,
  hashRecoveryPhrase,
  encrypt,
  decrypt,
  encryptJson,
  decryptJson,
  rewrapMasterKey,
  type EncryptedField,
  createEncryptedField,
  readEncryptedField,
} from '@/lib/encryption';

interface EncryptionContextType {
  isInitialized: boolean;
  isUnlocked: boolean;
  hasEncryptionKey: boolean;
  masterKey: CryptoKey | null;
  
  // Key management
  initializeEncryption: (password: string) => Promise<string>; // Returns recovery phrase
  unlockEncryption: (password: string) => Promise<void>;
  lockEncryption: () => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  recoverWithPhrase: (recoveryPhrase: string, newPassword: string) => Promise<void>;
  /** Destroys the existing key and creates a brand new encrypted space. Returns new recovery phrase. */
  resetEncryption: (newPassword: string) => Promise<string>;
  
  // Encryption utilities (only work when unlocked)
  encryptText: (text: string) => Promise<EncryptedField>;
  decryptText: (field: EncryptedField) => Promise<string>;
  encryptObject: <T>(data: T) => Promise<EncryptedField>;
  decryptObject: <T>(field: EncryptedField) => Promise<T>;
}

const EncryptionContext = createContext<EncryptionContextType | null>(null);

interface UserEncryptionKey {
  id: string;
  user_id: string;
  encrypted_master_key: string;
  key_salt: string;
  key_iv: string;
  recovery_key_hash: string | null;
  key_version: number;
}

export function EncryptionProvider({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasEncryptionKey, setHasEncryptionKey] = useState(false);
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [encryptionKeyRecord, setEncryptionKeyRecord] = useState<UserEncryptionKey | null>(null);

  // Check if user has encryption keys on mount and auth changes
  useEffect(() => {
    const checkEncryptionStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setIsInitialized(true);
        setHasEncryptionKey(false);
        setMasterKey(null);
        setEncryptionKeyRecord(null);
        return;
      }

      const { data, error } = await supabase
        .from('user_encryption_keys')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        console.error('Error checking encryption status:', error);
      }

      setHasEncryptionKey(!!data);
      setEncryptionKeyRecord(data as UserEncryptionKey | null);
      setIsInitialized(true);
    };

    checkEncryptionStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      setMasterKey(null); // Lock on auth change
      checkEncryptionStatus();
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Initialize encryption for a new user
   * Creates master key and returns recovery phrase (must be saved by user)
   */
  const initializeEncryption = useCallback(async (password: string): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('Must be logged in to initialize encryption');
    }

    // Generate new master key
    const newMasterKey = await generateMasterKey();
    
    // Generate recovery phrase
    const recoveryPhrase = await generateRecoveryPhrase(newMasterKey);
    const recoveryHash = await hashRecoveryPhrase(recoveryPhrase);
    
    // Wrap master key with password
    const { encryptedKey, salt, iv } = await wrapMasterKey(newMasterKey, password);

    // Store in database
    const { error } = await supabase
      .from('user_encryption_keys')
      .insert({
        user_id: session.user.id,
        encrypted_master_key: encryptedKey,
        key_salt: salt,
        key_iv: iv,
        recovery_key_hash: recoveryHash,
        key_version: 1,
      });

    if (error) {
      throw new Error('Failed to save encryption keys: ' + error.message);
    }

    // Update state
    setMasterKey(newMasterKey);
    setHasEncryptionKey(true);

    // Refresh the record
    const { data } = await supabase
      .from('user_encryption_keys')
      .select('*')
      .eq('user_id', session.user.id)
      .single();
    
    setEncryptionKeyRecord(data as UserEncryptionKey);

    return recoveryPhrase;
  }, []);

  /**
   * Unlock encryption with password (on login)
   */
  const unlockEncryption = useCallback(async (password: string): Promise<void> => {
    if (!encryptionKeyRecord) {
      throw new Error('No encryption key found for this user');
    }

    try {
      const key = await unwrapMasterKey(
        encryptionKeyRecord.encrypted_master_key,
        encryptionKeyRecord.key_salt,
        encryptionKeyRecord.key_iv,
        password
      );
      setMasterKey(key);
    } catch (error) {
      throw new Error('Failed to unlock encryption. Incorrect password?');
    }
  }, [encryptionKeyRecord]);

  /**
   * Lock encryption (clear master key from memory)
   */
  const lockEncryption = useCallback(() => {
    setMasterKey(null);
  }, []);

  /**
   * Change password (re-wrap master key)
   */
  const changePassword = useCallback(async (oldPassword: string, newPassword: string): Promise<void> => {
    if (!encryptionKeyRecord) {
      throw new Error('No encryption key found');
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('Must be logged in');
    }

    // Re-wrap the master key
    const { encryptedKey, salt, iv } = await rewrapMasterKey(
      encryptionKeyRecord.encrypted_master_key,
      encryptionKeyRecord.key_salt,
      encryptionKeyRecord.key_iv,
      oldPassword,
      newPassword
    );

    // Update in database
    const { error } = await supabase
      .from('user_encryption_keys')
      .update({
        encrypted_master_key: encryptedKey,
        key_salt: salt,
        key_iv: iv,
      })
      .eq('user_id', session.user.id);

    if (error) {
      throw new Error('Failed to update encryption keys: ' + error.message);
    }

    // Refresh state
    const { data } = await supabase
      .from('user_encryption_keys')
      .select('*')
      .eq('user_id', session.user.id)
      .single();
    
    setEncryptionKeyRecord(data as UserEncryptionKey);

    // Unlock with new password
    await unlockEncryption(newPassword);
  }, [encryptionKeyRecord, unlockEncryption]);

  /**
   * Recover encryption using recovery phrase
   */
  const recoverWithPhrase = useCallback(async (recoveryPhrase: string, newPassword: string): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('Must be logged in');
    }

    if (!encryptionKeyRecord) {
      throw new Error('No encryption key found');
    }

    // Verify recovery phrase hash
    const phraseHash = await hashRecoveryPhrase(recoveryPhrase);
    if (phraseHash !== encryptionKeyRecord.recovery_key_hash) {
      throw new Error('Invalid recovery phrase');
    }

    // Reconstruct master key from recovery phrase
    const recoveredKey = await masterKeyFromRecoveryPhrase(recoveryPhrase);

    // Re-wrap with new password
    const { encryptedKey, salt, iv } = await wrapMasterKey(recoveredKey, newPassword);

    // Update in database
    const { error } = await supabase
      .from('user_encryption_keys')
      .update({
        encrypted_master_key: encryptedKey,
        key_salt: salt,
        key_iv: iv,
      })
      .eq('user_id', session.user.id);

    if (error) {
      throw new Error('Failed to update encryption keys: ' + error.message);
    }

    // Update state
    setMasterKey(recoveredKey);

    // Refresh the record
    const { data } = await supabase
      .from('user_encryption_keys')
      .select('*')
      .eq('user_id', session.user.id)
      .single();
    
    setEncryptionKeyRecord(data as UserEncryptionKey);
  }, [encryptionKeyRecord]);

  /**
   * Reset encryption entirely: discard the old key and create a new one.
   * Anything encrypted with the previous key becomes permanently unreadable.
   */
  const resetEncryption = useCallback(async (newPassword: string): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('Must be logged in');
    }

    const { error: deleteError } = await supabase
      .from('user_encryption_keys')
      .delete()
      .eq('user_id', session.user.id);

    if (deleteError) {
      throw new Error('Failed to reset encryption: ' + deleteError.message);
    }

    // Create a brand new master key + recovery phrase
    const newMasterKey = await generateMasterKey();
    const recoveryPhrase = await generateRecoveryPhrase(newMasterKey);
    const recoveryHash = await hashRecoveryPhrase(recoveryPhrase);
    const { encryptedKey, salt, iv } = await wrapMasterKey(newMasterKey, newPassword);

    const { error: insertError } = await supabase
      .from('user_encryption_keys')
      .insert({
        user_id: session.user.id,
        encrypted_master_key: encryptedKey,
        key_salt: salt,
        key_iv: iv,
        recovery_key_hash: recoveryHash,
        key_version: 1,
      });

    if (insertError) {
      throw new Error('Failed to save new encryption keys: ' + insertError.message);
    }

    const { data } = await supabase
      .from('user_encryption_keys')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    setEncryptionKeyRecord(data as UserEncryptionKey);
    setMasterKey(newMasterKey);
    setHasEncryptionKey(true);

    return recoveryPhrase;
  }, []);

  /**
   * Encrypt text (requires unlocked encryption)
   */
  const encryptText = useCallback(async (text: string): Promise<EncryptedField> => {
    if (!masterKey) {
      throw new Error('Encryption not unlocked');
    }
    return createEncryptedField(text, masterKey);
  }, [masterKey]);

  /**
   * Decrypt text (requires unlocked encryption)
   */
  const decryptText = useCallback(async (field: EncryptedField): Promise<string> => {
    if (!masterKey) {
      throw new Error('Encryption not unlocked');
    }
    return readEncryptedField(field, masterKey);
  }, [masterKey]);

  /**
   * Encrypt object (requires unlocked encryption)
   */
  const encryptObject = useCallback(async <T,>(data: T): Promise<EncryptedField> => {
    if (!masterKey) {
      throw new Error('Encryption not unlocked');
    }
    const { ciphertext, iv } = await encryptJson(data, masterKey);
    return { ciphertext, iv, version: 1 };
  }, [masterKey]);

  /**
   * Decrypt object (requires unlocked encryption)
   */
  const decryptObject = useCallback(async <T,>(field: EncryptedField): Promise<T> => {
    if (!masterKey) {
      throw new Error('Encryption not unlocked');
    }
    return decryptJson<T>(field.ciphertext, field.iv, masterKey);
  }, [masterKey]);

  const value: EncryptionContextType = {
    isInitialized,
    isUnlocked: !!masterKey,
    hasEncryptionKey,
    masterKey,
    initializeEncryption,
    unlockEncryption,
    lockEncryption,
    changePassword,
    recoverWithPhrase,
    resetEncryption,
    encryptText,
    decryptText,
    encryptObject,
    decryptObject,
  };

  return (
    <EncryptionContext.Provider value={value}>
      {children}
    </EncryptionContext.Provider>
  );
}

export function useEncryption() {
  const context = useContext(EncryptionContext);
  if (!context) {
    throw new Error('useEncryption must be used within an EncryptionProvider');
  }
  return context;
}

/**
 * Hook to check if encryption is available and unlocked
 * Returns null while loading, false if not available, true if ready
 */
export function useEncryptionReady(): boolean | null {
  const { isInitialized, isUnlocked } = useEncryption();
  
  if (!isInitialized) return null;
  return isUnlocked;
}
