import CryptoJS from 'crypto-js';

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
      return JSON.parse(decryptedStr) as T;
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  }
};
