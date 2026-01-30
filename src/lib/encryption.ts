/**
 * Application-Level Encryption Library
 * 
 * Provides AES-GCM encryption/decryption utilities with PBKDF2 key derivation.
 * All cryptographic operations happen client-side only.
 */

// Constants
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for AES-GCM
const SALT_LENGTH = 16; // 128 bits
const PBKDF2_ITERATIONS = 100000;
const RECOVERY_WORD_COUNT = 12;

// BIP39-inspired word list (simplified subset for recovery phrases)
const WORD_LIST = [
  'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
  'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
  'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual',
  'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance',
  'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent',
  'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album',
  'alcohol', 'alert', 'alien', 'all', 'alley', 'allow', 'almost', 'alone',
  'alpha', 'already', 'also', 'alter', 'always', 'amateur', 'amazing', 'among',
  'amount', 'amused', 'analyst', 'anchor', 'ancient', 'anger', 'angle', 'angry',
  'animal', 'ankle', 'announce', 'annual', 'another', 'answer', 'antenna', 'antique',
  'anxiety', 'any', 'apart', 'apology', 'appear', 'apple', 'approve', 'april',
  'arch', 'arctic', 'area', 'arena', 'argue', 'arm', 'armed', 'armor',
  'army', 'around', 'arrange', 'arrest', 'arrive', 'arrow', 'art', 'artefact',
  'artist', 'artwork', 'ask', 'aspect', 'assault', 'asset', 'assist', 'assume',
  'asthma', 'athlete', 'atom', 'attack', 'attend', 'attitude', 'attract', 'auction',
  'audit', 'august', 'aunt', 'author', 'auto', 'autumn', 'average', 'avocado',
  'avoid', 'awake', 'aware', 'away', 'awesome', 'awful', 'awkward', 'axis',
  'baby', 'bachelor', 'bacon', 'badge', 'bag', 'balance', 'balcony', 'ball',
  'bamboo', 'banana', 'banner', 'bar', 'barely', 'bargain', 'barrel', 'base',
  'basic', 'basket', 'battle', 'beach', 'bean', 'beauty', 'because', 'become',
  'beef', 'before', 'begin', 'behave', 'behind', 'believe', 'below', 'belt',
  'bench', 'benefit', 'best', 'betray', 'better', 'between', 'beyond', 'bicycle',
  'bid', 'bike', 'bind', 'biology', 'bird', 'birth', 'bitter', 'black',
  'blade', 'blame', 'blanket', 'blast', 'bleak', 'bless', 'blind', 'blood',
  'blossom', 'blouse', 'blue', 'blur', 'blush', 'board', 'boat', 'body',
  'boil', 'bomb', 'bone', 'bonus', 'book', 'boost', 'border', 'boring',
  'borrow', 'boss', 'bottom', 'bounce', 'box', 'boy', 'bracket', 'brain',
  'brand', 'brass', 'brave', 'bread', 'breeze', 'brick', 'bridge', 'brief',
  'bright', 'bring', 'brisk', 'broccoli', 'broken', 'bronze', 'broom', 'brother',
  'brown', 'brush', 'bubble', 'buddy', 'budget', 'buffalo', 'build', 'bulb',
  'bulk', 'bullet', 'bundle', 'bunker', 'burden', 'burger', 'burst', 'bus',
  'business', 'busy', 'butter', 'buyer', 'buzz', 'cabbage', 'cabin', 'cable'
];

/**
 * Converts ArrayBuffer to Base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts Base64 string to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generates cryptographically secure random bytes
 */
export function generateRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Generates a new 256-bit AES master key
 */
export async function generateMasterKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true, // extractable - needed to wrap/unwrap
    ['encrypt', 'decrypt']
  );
}

/**
 * Exports a CryptoKey to raw bytes
 */
export async function exportKey(key: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.exportKey('raw', key);
}

/**
 * Imports raw bytes as a CryptoKey
 */
export async function importKey(keyData: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Derives a key from a password using PBKDF2
 */
export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as Uint8Array<ArrayBuffer>,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts data using AES-GCM
 */
export async function encrypt(
  data: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const encoder = new TextEncoder();
  const iv = generateRandomBytes(IV_LENGTH);
  
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv as Uint8Array<ArrayBuffer> },
    key,
    encoder.encode(data)
  );

  return {
    ciphertext: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(new Uint8Array(iv).buffer as ArrayBuffer),
  };
}

/**
 * Decrypts data using AES-GCM
 */
export async function decrypt(
  ciphertext: string,
  iv: string,
  key: CryptoKey
): Promise<string> {
  const decoder = new TextDecoder();
  
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: new Uint8Array(base64ToArrayBuffer(iv)) },
    key,
    base64ToArrayBuffer(ciphertext)
  );

  return decoder.decode(decrypted);
}

/**
 * Encrypts the master key with a password-derived key (for storage)
 */
export async function wrapMasterKey(
  masterKey: CryptoKey,
  password: string
): Promise<{ encryptedKey: string; salt: string; iv: string }> {
  const salt = generateRandomBytes(SALT_LENGTH);
  const wrappingKey = await deriveKeyFromPassword(password, salt);
  const iv = generateRandomBytes(IV_LENGTH);
  
  const masterKeyData = await exportKey(masterKey);
  
  const encryptedKey = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv as Uint8Array<ArrayBuffer> },
    wrappingKey,
    masterKeyData
  );

  return {
    encryptedKey: arrayBufferToBase64(encryptedKey),
    salt: arrayBufferToBase64(new Uint8Array(salt).buffer as ArrayBuffer),
    iv: arrayBufferToBase64(new Uint8Array(iv).buffer as ArrayBuffer),
  };
}

/**
 * Decrypts the master key using a password
 */
export async function unwrapMasterKey(
  encryptedKey: string,
  salt: string,
  iv: string,
  password: string
): Promise<CryptoKey> {
  const saltBytes = new Uint8Array(base64ToArrayBuffer(salt));
  const wrappingKey = await deriveKeyFromPassword(password, saltBytes);
  
  const decryptedKeyData = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: new Uint8Array(base64ToArrayBuffer(iv)) },
    wrappingKey,
    base64ToArrayBuffer(encryptedKey)
  );

  return importKey(decryptedKeyData);
}

/**
 * Generates a recovery phrase from the master key
 */
export async function generateRecoveryPhrase(masterKey: CryptoKey): Promise<string> {
  const keyData = await exportKey(masterKey);
  const keyBytes = new Uint8Array(keyData);
  
  // Use key bytes to deterministically select words
  const words: string[] = [];
  for (let i = 0; i < RECOVERY_WORD_COUNT; i++) {
    // Use 2 bytes per word for better entropy distribution
    const index = ((keyBytes[i * 2] || 0) * 256 + (keyBytes[i * 2 + 1] || 0)) % WORD_LIST.length;
    words.push(WORD_LIST[index]);
  }
  
  return words.join(' ');
}

/**
 * Reconstructs master key from recovery phrase
 */
export async function masterKeyFromRecoveryPhrase(phrase: string): Promise<CryptoKey> {
  const words = phrase.toLowerCase().trim().split(/\s+/);
  
  if (words.length !== RECOVERY_WORD_COUNT) {
    throw new Error(`Recovery phrase must be exactly ${RECOVERY_WORD_COUNT} words`);
  }
  
  // Reconstruct key bytes from words
  const keyBytes = new Uint8Array(32); // 256 bits
  for (let i = 0; i < words.length; i++) {
    const wordIndex = WORD_LIST.indexOf(words[i]);
    if (wordIndex === -1) {
      throw new Error(`Invalid word in recovery phrase: ${words[i]}`);
    }
    keyBytes[i * 2] = Math.floor(wordIndex / 256);
    keyBytes[i * 2 + 1] = wordIndex % 256;
  }
  
  // Fill remaining bytes with hash of the phrase for additional entropy
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(phrase));
  const hashBytes = new Uint8Array(hash);
  for (let i = RECOVERY_WORD_COUNT * 2; i < 32; i++) {
    keyBytes[i] = hashBytes[i - RECOVERY_WORD_COUNT * 2];
  }
  
  return importKey(keyBytes.buffer);
}

/**
 * Hashes the recovery phrase for verification (stored in DB)
 */
export async function hashRecoveryPhrase(phrase: string): Promise<string> {
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(phrase.toLowerCase().trim()));
  return arrayBufferToBase64(hash);
}

/**
 * Encrypts JSON data
 */
export async function encryptJson(
  data: unknown,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  return encrypt(JSON.stringify(data), key);
}

/**
 * Decrypts JSON data
 */
export async function decryptJson<T>(
  ciphertext: string,
  iv: string,
  key: CryptoKey
): Promise<T> {
  const decrypted = await decrypt(ciphertext, iv, key);
  return JSON.parse(decrypted) as T;
}

/**
 * Generates a new salt
 */
export function generateSalt(): string {
  const bytes = generateRandomBytes(SALT_LENGTH);
  return arrayBufferToBase64(new Uint8Array(bytes).buffer as ArrayBuffer);
}

/**
 * Re-wraps master key with a new password (for password changes)
 */
export async function rewrapMasterKey(
  encryptedKey: string,
  salt: string,
  iv: string,
  oldPassword: string,
  newPassword: string
): Promise<{ encryptedKey: string; salt: string; iv: string }> {
  // Unwrap with old password
  const masterKey = await unwrapMasterKey(encryptedKey, salt, iv, oldPassword);
  
  // Re-wrap with new password
  return wrapMasterKey(masterKey, newPassword);
}

/**
 * Type for encrypted field storage
 */
export interface EncryptedField {
  ciphertext: string;
  iv: string;
  version: number; // For future algorithm upgrades
}

/**
 * Creates an encrypted field object
 */
export async function createEncryptedField(
  data: string,
  key: CryptoKey
): Promise<EncryptedField> {
  const { ciphertext, iv } = await encrypt(data, key);
  return { ciphertext, iv, version: 1 };
}

/**
 * Reads an encrypted field object
 */
export async function readEncryptedField(
  field: EncryptedField,
  key: CryptoKey
): Promise<string> {
  if (field.version !== 1) {
    throw new Error(`Unsupported encryption version: ${field.version}`);
  }
  return decrypt(field.ciphertext, field.iv, key);
}
