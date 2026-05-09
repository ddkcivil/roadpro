import { useState, ChangeEvent } from 'react';
import { compressImage } from '../utils/data/imageUtils';

interface UseAvatarUploadOptions {
  compress?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export const useAvatarUpload = (options: UseAvatarUploadOptions = {}) => {
  const { 
    compress = true, 
    maxWidth = 200, 
    maxHeight = 200, 
    quality = 0.6 
  } = options;

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string; // Explicitly assert as string, but add check
        if (typeof base64 === 'string' && compress) { // Add check for base64 being a string
          try {
            const compressed = await compressImage(base64, maxWidth, maxHeight, quality);
            setPreviewUrl(compressed);
          } catch (err) {
            console.error("Compression failed, using original", err);
            setPreviewUrl(base64); // Fallback to original base64
          }
        } else {
          setPreviewUrl(base64); // Use original if not compressing or if base64 is not a string
        }
      };      reader.readAsDataURL(file);
    }
  };

  const clearAvatar = () => {
    setAvatarFile(null);
    setPreviewUrl(null);
  };

  const reset = () => {
    setAvatarFile(null);
    setPreviewUrl(null);
  };

  return {
    avatarFile,
    previewUrl,
    setPreviewUrl,
    handleFileChange,
    clearAvatar,
    reset
  };
};
