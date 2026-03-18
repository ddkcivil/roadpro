/// <reference types="vite/client" />
import CryptoJS from 'crypto-js';

// @ts-ignore - import.meta is supported by Vite but might not be recognized by all TS configs
const ENCRYPTION_KEY = import.meta.env.VITE_STORAGE_KEY || 'roadmaster-secure-key-2024-infrastructure';

export const encryptionUtils = {
  encrypt: (data: any): string => {
    try {
      const jsonStr = JSON.stringify(data);
      return CryptoJS.AES.encrypt(jsonStr, ENCRYPTION_KEY).toString();
    } catch (error) {
      console.error('Encryption failed:', error);
      return '';
    }
  },

  decrypt: <T>(encryptedData: string): T | null => {
    try {
      if (!encryptedData) return null;
      const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
      const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
      if (!decryptedStr) return null;
      
      try {
        return JSON.parse(decryptedStr) as T;
      } catch (parseError) {
        // Fallback for raw strings that were encrypted without JSON.stringify
        return decryptedStr as unknown as T;
      }
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  }
};
